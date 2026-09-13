-- ============================================================
-- Op-Art Fan · Fase 3 (spec v2.1): tiempo real + producción
--  - Salas 1v1 con Supabase Realtime (postgres_changes + broadcast)
--  - Panel admin (estadísticas, otorgar monedas, aviso global)
--  - Aviso/noticia público leído por todos los jugadores
-- Se ejecuta despué de supabase/arena.sql (ES idempotente).
-- ============================================================

-- ---------- Salas 1v1 en vivo ----------
create table if not exists public.live_rooms(
  id        text primary key,
  host      text not null,
  guest     text,
  level_id  integer not null,
  status    text not null default 'open', -- open|ready|playing|finished
  seed      text not null default '',
  h_score   integer not null default 0,
  g_score   integer not null default 0,
  h_combo   integer not null default 0,
  g_combo   integer not null default 0,
  h_hits    integer not null default 0,
  g_hits    integer not null default 0,
  h_fails   integer not null default 0,
  g_fails   integer not null default 0,
  h_ms      integer not null default 0,
  g_ms      integer not null default 0,
  h_done    integer not null default 0,
  g_done    integer not null default 0,
  winner    text,
  reward_h  integer not null default 0,
  reward_g  integer not null default 0,
  created   bigint not null default 0,
  started   bigint,
  resolved  bigint
);
create index if not exists idx_live_status_created on public.live_rooms(status, created desc);
create index if not exists idx_live_parts on public.live_rooms(host, guest);

-- ---------- Admins (panel de producción) ----------
create table if not exists public.admins(
  uid text primary key,
  at  bigint not null default 0
);

-- ---------- Aviso global (lo leen todos) ----------
create table if not exists public.notices(
  id   text primary key,
  text text not null default '',
  at   bigint not null default 0
);

-- ---------- RLS salas ----------
alter table public.live_rooms enable row level security;
alter table public.admins    enable row level security;
alter table public.notices   enable row level security;

drop policy if exists live_read    on public.live_rooms;
drop policy if exists live_insert  on public.live_rooms;
drop policy if exists live_update  on public.live_rooms;
drop policy if exists notices_read on public.notices;

-- Cualquiera ve el lobby (open/ready) o su propia sala; los finished
-- solo los participantes.
create policy live_read on public.live_rooms
  for select using (host = auth.uid()::text or guest = auth.uid()::text
                    or status in ('open','ready'));
create policy live_insert on public.live_rooms
  for insert with check (host = auth.uid()::text);
-- La unión (guest) se hace por el RPC live_join para no exponer más columnas.
create policy live_update on public.live_rooms
  for update using (host = auth.uid()::text or guest = auth.uid()::text)
  with check (host = auth.uid()::text or guest = auth.uid()::text);

create policy notices_read on public.notices for select using (true);

grant select, insert, update on public.live_rooms to anon;
grant select on public.notices to anon;

-- ---------- Realtime: publicar la tabla de salas ----------
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='live_rooms'
  ) then
    alter publication supabase_realtime add table public.live_rooms;
  end if;
end $$;
alter table public.live_rooms replica identity full;

-- ============================================================
-- RPCs de salas
-- ============================================================
create or replace function public._x_live_join(p_uid text, p_room text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  r public.live_rooms%rowtype;
begin
  if p_uid is null or p_uid = '' then raise exception 'slv: se requiere sesion'; end if;
  select * into r from public.live_rooms where id = p_room for update;
  if r.id is null then return '{"error":"slv: sala no encontrada"}'::jsonb; end if;
  if r.host = p_uid or r.guest = p_uid then return row_to_json(r)::jsonb; end if;
  if r.status <> 'open' then return '{"error":"slv: la sala ya esta ocupada"}'::jsonb; end if;
  update public.live_rooms set guest = p_uid, status = 'ready'
  where id = p_room returning * into r;
  return row_to_json(r)::jsonb;
end;
$$;

create or replace function public.live_join(p_room text)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select public._x_live_join(auth.uid()::text, p_room);
$$;
grant execute on function public.live_join(text) to anon;

-- Enviar el lado final con huella validada. Recompensas: victoria +15,
-- derrota +5, sin racha (el bonus de racha es solo de duelos).
create or replace function public._x_live_submit(
  p_uid    text,
  p_room   text,
  p_score  integer,
  p_combo  integer,
  p_hits   integer,
  p_fails  integer,
  p_ms     integer
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  r      public.live_rooms%rowtype;
  side   text;
  plan   integer;
  other  integer;
  w      boolean;
  win_uid text;
  lose_uid text;
  prof   jsonb;
  coins_ integer;
  ptrs_  integer;
begin
  if p_uid is null or p_uid = '' then raise exception 'slv: se requiere sesion'; end if;
  select * into r from public.live_rooms where id = p_room for update;
  if r.id is null then return '{"error":"slv: sala no encontrada"}'::jsonb; end if;
  if r.status = 'finished' then return '{"error":"slv: partida ya resuelta"}'::jsonb; end if;
  if r.host <> p_uid and r.guest <> p_uid then return '{"error":"slv: no participas"}'::jsonb; end if;
  side := case when r.host = p_uid then 'h' else 'g' end;
  if (case when side='h' then r.h_done else r.g_done end) > 0 then
    return '{"error":"slv: ya enviaste tu lado"}'::jsonb;
  end if;
  select plan_ms into plan from public.duel_levels where level_id = r.level_id;
  if plan is null then return '{"error":"slv: nivel invalido"}'::jsonb; end if;
  -- Validacion de huella (mismos limites que duelos)
  if p_score < 0 or p_combo < 1 or p_combo > 20 or p_hits < 0 or p_fails < 0 then
    return '{"error":"slv: huella invalida"}'::jsonb;
  end if;
  if p_hits > (plan / 1000) * 2.5 + 8 then
    return '{"error":"slv: huella rechazada (aciertos imposibles)"}'::jsonb;
  end if;
  if p_fails > p_hits * 4 + 8 then
    return '{"error":"slv: huella rechazada (fallos excesivos)"}'::jsonb;
  end if;
  if p_score > p_hits * 4800 + 50 then
    return '{"error":"slv: huella rechazada (puntaje imposible)"}'::jsonb;
  end if;
  if p_score < p_hits * 10 - p_fails * 260 - 10000 then
    return '{"error":"slv: huella rechazada (puntaje inconsistente)"}'::jsonb;
  end if;
  if p_ms < 800 or p_ms > (plan + 12000) * 1.5 or p_ms < p_hits * 400 then
    return '{"error":"slv: huella rechazada (duracion invalida)"}'::jsonb;
  end if;
  -- Registrar lado
  if side = 'h' then
    update public.live_rooms set h_score=p_score, h_combo=p_combo, h_hits=p_hits,
      h_fails=p_fails, h_ms=p_ms, h_done=1 where id = r.id;
    r.h_score := p_score; r.h_combo := p_combo; r.h_hits := p_hits;
    r.h_fails := p_fails; r.h_ms := p_ms; r.h_done := 1;
  else
    update public.live_rooms set g_score=p_score, g_combo=p_combo, g_hits=p_hits,
      g_fails=p_fails, g_ms=p_ms, g_done=1 where id = r.id;
    r.g_score := p_score; r.g_combo := p_combo; r.g_hits := p_hits;
    r.g_fails := p_fails; r.g_ms := p_ms; r.g_done := 1;
  end if;
  if r.h_done = 0 or r.g_done = 0 then
    return jsonb_build_object('status','playing','side',side,'score',p_score,'waiting',true);
  end if;
  -- Resolver
  if r.h_score = r.g_score then
    w := (r.h_ms <= r.g_ms);
  else
    w := r.h_score > r.g_score;
  end if;
  win_uid  := case when w then r.host else r.guest end;
  lose_uid := case when w then r.guest else r.host end;
  select profile into prof from public.users where uid = win_uid for update;
  if not found then prof := '{"coins":0}'::jsonb; end if;
  if jsonb_typeof(prof) <> 'object' then prof := '{"coins":0}'::jsonb; end if;
  prof := jsonb_set(prof, '{coins}',
    to_jsonb(coalesce((prof->>'coins')::int,0) + 15));
  prof := jsonb_set(prof, '{duelPts}',
    to_jsonb(coalesce((prof->>'duelPts')::int,0) + 15));
  update public.users set profile = prof, updated_at = now() where uid = win_uid;
  select profile into prof from public.users where uid = lose_uid for update;
  if not found then prof := '{"coins":0}'::jsonb; end if;
  if jsonb_typeof(prof) <> 'object' then prof := '{"coins":0}'::jsonb; end if;
  prof := jsonb_set(prof, '{coins}',
    to_jsonb(coalesce((prof->>'coins')::int,0) + 5));
  prof := jsonb_set(prof, '{duelPts}',
    to_jsonb(coalesce((prof->>'duelPts')::int,0) + 5));
  update public.users set profile = prof, updated_at = now() where uid = lose_uid;
  update public.live_rooms set
    winner = win_uid,
    reward_h = case when host = win_uid then 15 else 5 end,
    reward_g = case when guest = win_uid then 15 else 5 end,
    resolved = (floor(extract(epoch from now())))::bigint,
    status = 'finished'
  where id = r.id;
  return jsonb_build_object('status','finished','won', (win_uid = p_uid),
    'reward', case when (win_uid = p_uid) then 15 else 5 end,
    'my', p_score, 'op', (case when side='h' then r.g_score else r.h_score end), 'winner', win_uid);
end;
$$;

create or replace function public.live_submit(
  p_room  text, p_score integer, p_combo integer,
  p_hits  integer, p_fails integer, p_ms integer
) returns jsonb
language sql stable security definer set search_path = public
as $$
  select public._x_live_submit(auth.uid()::text, p_room, p_score, p_combo, p_hits, p_fails, p_ms);
$$;
grant execute on function public.live_submit(text, integer, integer, integer, integer, integer) to anon;

-- ============================================================
-- RPCs de admin/avi (todos security definer; solo admins)
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql security definer set search_path = public
as $$
  select exists(select 1 from public.admins where uid = auth.uid()::text);
$$;
grant execute on function public.is_admin() to anon;

create or replace function public._x_friend_uid(p_code text)
returns text
language sql security definer set search_path = public
as $$
  select uid from public.users where public.friend_code(uid) = upper(p_code) limit 1;
$$;
grant execute on function public._x_friend_uid(text) to anon;

create or replace function public._x_admin_stats(p_uid text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  isadm boolean;
  j jsonb;
begin
  select exists(select 1 from public.admins where uid = p_uid) into isadm;
  if not isadm then return '{"error":"slv: no eres admin"}'::jsonb; end if;
  select jsonb_build_object(
    'users',      (select count(*) from public.users),
    'duels',      (select count(*) from public.duels),
    'duelsOpen',  (select count(*) from public.duels where status <> 'finished'),
    'rooms',      (select count(*) from public.live_rooms),
    'roomsOpen',  (select count(*) from public.live_rooms where status in ('open','ready')),
    'friends',    (select count(*) from public.friends),
    'purchases',  (select count(*) from public.purchases),
    'topScores',  coalesce((select jsonb_agg(jsonb_build_object('n',name,'s',score))
                   from (select name, score from public.scores order by score desc limit 5) t), '[]'),
    'notice',     coalesce((select text from public.notices where id='main'),'')
  ) into j;
  return j;
end;
$$;

create or replace function public.admin_stats()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select public._x_admin_stats(auth.uid()::text);
$$;
grant execute on function public.admin_stats() to anon;

-- Otorgar monedas (p_amount puede ser negativo) a quien tenga el código.
create or replace function public._x_admin_grant(p_admin text, p_code text, p_amount integer)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  isadm boolean;
  uid_  text;
  prof  jsonb;
  coins_ integer;
begin
  select exists(select 1 from public.admins where uid = p_admin) into isadm;
  if not isadm then return '{"error":"slv: no eres admin"}'::jsonb; end if;
  uid_ := public._x_friend_uid(p_code);
  if uid_ is null then return '{"error":"slv: codigo no encontrado"}'::jsonb; end if;
  select profile into prof from public.users where uid = uid_ for update;
  if not found then prof := '{"coins":0}'::jsonb; end if;
  if jsonb_typeof(prof) <> 'object' then prof := '{"coins":0}'::jsonb; end if;
  coins_ := greatest(0, coalesce((prof->>'coins')::int,0) + p_amount);
  prof := jsonb_set(prof, '{coins}', to_jsonb(coins_));
  update public.users set profile = prof, updated_at = now() where uid = uid_;
  return jsonb_build_object('ok', true, 'uid', uid_, 'code', upper(p_code), 'coins', coins_);
end;
$$;

create or replace function public.admin_grant(p_code text, p_amount integer)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select public._x_admin_grant(auth.uid()::text, p_code, p_amount);
$$;
grant execute on function public.admin_grant(text, integer) to anon;

-- Aviso global ('' lo borra). Lo leen todos via public.notice().
create or replace function public._x_admin_notice(p_admin text, p_text text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  isadm boolean;
begin
  select exists(select 1 from public.admins where uid = p_admin) into isadm;
  if not isadm then return '{"error":"slv: no eres admin"}'::jsonb; end if;
  insert into public.notices(id, text, at) values ('main', p_text, (floor(extract(epoch from now())))::bigint)
  on conflict (id) do update set text = excluded.text, at = excluded.at;
  return jsonb_build_object('ok', true, 'text', p_text);
end;
$$;

create or replace function public.admin_notice(p_text text)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select public._x_admin_notice(auth.uid()::text, p_text);
$$;
grant execute on function public.admin_notice(text) to anon;

-- El aviso activo para todos (lectura publica).
create or replace function public.notice()
returns jsonb
language sql security definer set search_path = public
as $$
  select jsonb_build_object('text', coalesce((select text from public.notices where id='main'), ''));
$$;
grant execute on function public.notice() to anon;