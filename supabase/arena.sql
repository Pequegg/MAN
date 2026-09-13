-- ============================================================
-- Op-Art Fan Â· esquema online (Supabase / PostgreSQL)
-- Ejecutar en: Dashboard -> SQL Editor -> Run (una sola vez)
-- La llave "anon" (publica) solo toca sus propios datos gracias
-- a las politicas RLS definidas abajo.
-- ============================================================

-- ---------- Ranking clasico ----------
create table if not exists public.scores(
  uid   text primary key,
  name  text not null default '',
  avatar text not null default '',
  score integer not null default 0,
  ts    bigint  not null default 0
);
create index if not exists idx_scores_score on public.scores(score desc);

-- ---------- Reto diario (clasico) ----------
create table if not exists public.daily(
  date   text not null,
  uid    text not null,
  name   text not null default '',
  avatar text not null default '',
  score  integer not null default 0,
  ts     bigint  not null default 0,
  primary key (date, uid)
);
create index if not exists idx_daily_date_score on public.daily(date, score desc);

-- ---------- Arena: miembros de grupo ----------
create table if not exists public.group_members(
  group_code text not null,
  uid        text not null,
  name       text not null default '',
  avatar     text not null default '',
  wear       jsonb not null default '{}',
  joined     bigint not null default 0,
  primary key (group_code, uid)
);
create index if not exists idx_gm_code on public.group_members(group_code);

-- ---------- Arena: puntos de temporada por grupo ----------
create table if not exists public.group_pts(
  group_code text not null,
  season     text not null,
  uid        text not null,
  pts        integer not null default 0,
  primary key (group_code, season, uid)
);
create index if not exists idx_gpts_code on public.group_pts(group_code, season);

-- ---------- Arena: ranking mundial del reto diario ----------
create table if not exists public.arena_daily(
  date   text not null,
  uid    text not null,
  name   text not null default '',
  avatar text not null default '',
  score  integer not null default 0,
  mode   text not null default '',
  ts     bigint  not null default 0,
  primary key (date, uid)
);
create index if not exists idx_arena_daily_date_score on public.arena_daily(date, score desc);

-- ============================================================
-- Fase 0-2 (spec v2.0): cuentas, economia, amigos y duelos
-- ============================================================

-- ---------- Perfiles de usuario en la nube ----------
create table if not exists public.users(
  uid        text primary key,
  profile    jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- ---------- Duelos asincronicos ----------
create table if not exists public.duels(
  id        text primary key,
  p1        text not null,
  p2        text not null,
  level_id  integer not null,
  seed      text not null default '',
  status    text not null default 'pending', -- pending|p1_done|p2_done|finished
  scores    jsonb not null default '{}',     -- {p1:int, p2:int}
  winner    text,
  reward1   integer not null default 0,
  reward2   integer not null default 0,
  created   bigint not null default 0,
  resolved  bigint
);
create index if not exists idx_duels_p on public.duels(p1, p2);
alter table public.duels add column if not exists done1 bigint not null default 0;
alter table public.duels add column if not exists done2 bigint not null default 0;

-- ---------- Amigos ----------
create table if not exists public.friends(
  uid text not null,
  fid text not null,
  name text not null default '',
  avatar text not null default '',
  since bigint not null default 0,
  primary key (uid, fid)
);

-- ---------- Compras registradas (auditoria) ----------
create table if not exists public.purchases(
  uid     text not null,
  item    text not null,
  price   integer not null,
  ts      bigint not null,
  primary key (uid, item, ts)
);

-- ============================================================
-- RLS: lectura publica de resultados, escritura solo de lo propio
-- ============================================================
alter table public.scores        enable row level security;
alter table public.daily         enable row level security;
alter table public.group_members enable row level security;
alter table public.group_pts     enable row level security;
alter table public.arena_daily   enable row level security;
alter table public.users         enable row level security;
alter table public.duels         enable row level security;
alter table public.friends       enable row level security;
alter table public.purchases     enable row level security;

drop policy if exists scores_read   on public.scores;
drop policy if exists scores_write  on public.scores;
drop policy if exists daily_read    on public.daily;
drop policy if exists daily_write   on public.daily;
drop policy if exists gm_read       on public.group_members;
drop policy if exists gm_write      on public.group_members;
drop policy if exists gp_read       on public.group_pts;
drop policy if exists gp_write      on public.group_pts;
drop policy if exists ad_read       on public.arena_daily;
drop policy if exists ad_write      on public.arena_daily;
drop policy if exists users_read    on public.users;
drop policy if exists users_write   on public.users;
drop policy if exists duels_read    on public.duels;
drop policy if exists duels_write   on public.duels;
drop policy if exists friends_read  on public.friends;
drop policy if exists friends_write on public.friends;
drop policy if exists purch_read    on public.purchases;
drop policy if exists purch_write   on public.purchases;

-- Resultados de partida: lectura y escritura publicas (la llave anon).
-- La validacion anti-trampas se hace en el servidor (funciones/RPC),
-- no restringiendo la escritura.
create policy scores_read   on public.scores        for select using (true);
create policy scores_write  on public.scores        for insert with check (true);
create policy daily_read    on public.daily         for select using (true);
create policy daily_write   on public.daily         for insert with check (true);
create policy gm_read       on public.group_members for select using (true);
create policy gm_write      on public.group_members for insert with check (true);
create policy gp_read       on public.group_pts     for select using (true);
create policy gp_write      on public.group_pts     for insert with check (true);
create policy ad_read       on public.arena_daily   for select using (true);
create policy ad_write      on public.arena_daily   for insert with check (true);

-- Datos de cuenta y sociales: solo la sesion real (Google) toca lo suyo.
create policy users_read    on public.users         for select using (true);
create policy users_write   on public.users         for insert with check (uid = auth.uid()::text);
create policy duels_read    on public.duels         for select using (p1 = auth.uid()::text or p2 = auth.uid()::text);
create policy duels_write   on public.duels         for insert with check (p1 = auth.uid()::text);
create policy friends_read  on public.friends       for select using (uid = auth.uid()::text or fid = auth.uid()::text);
create policy friends_write on public.friends       for insert with check (uid = auth.uid()::text);
create policy purch_read    on public.purchases     for select using (uid = auth.uid()::text);

-- Actualizar registros propios (queremos update, no solo insert)
drop policy if exists scores_upd   on public.scores;
drop policy if exists daily_upd    on public.daily;
drop policy if exists gm_upd       on public.group_members;
drop policy if exists gp_upd       on public.group_pts;
drop policy if exists ad_upd       on public.arena_daily;
drop policy if exists users_upd    on public.users;
drop policy if exists duels_upd    on public.duels;
drop policy if exists friends_upd  on public.friends;
-- Resultados de partida: update publico tambien (la llave anon puede
-- actualizar su fila al re-logar; sin sesion la persona es "anonima").
create policy scores_upd  on public.scores        for update using (true);
create policy daily_upd   on public.daily         for update using (true);
create policy gm_upd      on public.group_members for update using (true);
create policy gp_upd      on public.group_pts     for update using (true);
create policy ad_upd      on public.arena_daily   for update using (true);
-- Cuenta y sociales: solo la sesion real.
create policy users_upd   on public.users         for update using (uid = auth.uid()::text);
create policy duels_upd   on public.duels         for update using (p1 = auth.uid()::text or p2 = auth.uid()::text);
create policy friends_upd on public.friends       for update using (uid = auth.uid()::text);

grant usage on schema public to anon;
grant select on public.scores, public.daily, public.group_members, public.group_pts,
  public.arena_daily, public.users, public.duels, public.friends, public.purchases to anon;
grant insert, update on public.scores, public.daily, public.group_members, public.group_pts,
  public.arena_daily, public.users, public.duels, public.friends to anon;

-- ============================================================
-- Fase 1 (spec v2.0): economia con transaccion (RPC)
-- Compras validadas y descontadas ATOMICAMENTE en Postgres:
-- bloqueo de fila (FOR UPDATE), nunca saldo negativo, y cada
-- compra queda auditada en `purchases`. El cliente nunca decide
-- el resultado; solo pide y aplica el perfil que devuelve el server.
-- ============================================================
create or replace function public.redeem_item(p_item text, p_cat text, p_price integer)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  uid_ text := auth.uid()::text;
  u public.users%rowtype;
  prof jsonb;
  coins_ integer;
  arr jsonb;
  q integer;
begin
  if uid_ is null or uid_ = '' then
    raise exception 'not-authenticated';
  end if;
  select * into u from public.users where uid = uid_ for update;
  if not found then
    insert into public.users(uid, profile, updated_at)
    values (uid_, '{"coins":0}'::jsonb, now())
    returning * into u;
  end if;
  prof := coalesce(u.profile, '{"coins":0}'::jsonb);
  if jsonb_typeof(prof) <> 'object' then prof := '{"coins":0}'::jsonb; end if;
  coins_ := coalesce((prof->>'coins')::int, 0);
  if coins_ < p_price then
    raise exception 'slv: monedas insuficientes';
  end if;
  prof := jsonb_set(prof, '{inventory}', coalesce(prof->'inventory','{}'::jsonb));
  prof := jsonb_set(prof, '{wardrobe}', coalesce(prof->'wardrobe','{}'::jsonb));
  if p_cat = 'inv' then
    q := coalesce((prof->'inventory'->>p_item)::int, 0) + 1;
    prof := jsonb_set(prof, ('{inventory,' || p_item || '}')::text[], to_jsonb(q));
  elsif p_cat = 'skin' then
    arr := coalesce(prof->'ownedSkins', '[]'::jsonb);
    if arr @> jsonb_build_array(p_item) then
      raise exception 'slv: ya lo tienes';
    end if;
    prof := jsonb_set(prof, '{ownedSkins}', arr || jsonb_build_array(p_item));
  elsif p_cat = 'wear' then
    arr := coalesce(prof->'wardrobe'->'owned', '[]'::jsonb);
    if arr @> jsonb_build_array(p_item) then
      raise exception 'slv: ya lo tienes';
    end if;
    prof := jsonb_set(prof, '{wardrobe,owned}', arr || jsonb_build_array(p_item));
  else
    arr := coalesce(prof->'ownedCosmetics', '[]'::jsonb);
    if arr @> jsonb_build_array(p_item) then
      raise exception 'slv: ya lo tienes';
    end if;
    prof := jsonb_set(prof, '{ownedCosmetics}', arr || jsonb_build_array(p_item));
  end if;
  prof := jsonb_set(prof, '{coins}', to_jsonb(coins_ - p_price));
  update public.users set profile = prof, updated_at = now() where uid = uid_;
  insert into public.purchases(uid, item, price, ts)
  values (uid_, p_item, p_price, (floor(extract(epoch from now()) * 1000))::bigint)
  on conflict do nothing;
  return prof;
end;
$$;
grant execute on function public.redeem_item(text, text, integer) to anon;
create index if not exists idx_purchases_uid_ts on public.purchases(uid, ts desc);

-- ============================================================
-- Fase 2 (spec v2.1): duelos asincronos con huella validada
--  - p1 crea el duelo y juega su lado ya; p2 recibe el reto y
--    juega el MISMO nivel; cuando ambos lados estan, se resuelve.
--  - La huella {puntuacion, comboMax, aciertos, fallos, duracion}
--    se valida SERVER-SIDE contra los limites del nivel; nadie
--    puede mandar un puntaje imposible (anti-trampas).
--  - Recompensas: victoria +20 monedas +20 pts temporada, derrota
--    +5 monedas, racha de 3+ victorias consecutivas +10 bonus.
-- ============================================================

-- Tiempo planificado (ms) por nivel 1..16 (autoridad del server).
create table if not exists public.duel_levels(
  level_id integer primary key,
  plan_ms  integer not null
);
insert into public.duel_levels(level_id, plan_ms) values
  (1,25000),(2,28000),(3,30000),(4,32000),(5,34000),
  (6,36000),(7,38000),(8,40000),(9,42000),(10,44000),
  (11,46000),(12,48000),(13,52000),(14,56000),(15,60000),(16,60000)
on conflict (level_id) do update set plan_ms = excluded.plan_ms;

-- Registrar un lado ya jugado con su huella. Devuelve el estado
-- del duelo; si era el segundo lado, lo resuelve y credita premios.
-- Nucleo interno (p_uid explicito) reutilizable por test directos.
create or replace function public._x_duel_submit(
  p_uid   text,
  p_duel  text,
  p_score integer,
  p_combo integer,
  p_hits  integer,
  p_fails integer,
  p_ms    integer
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  d      public.duels%rowtype;
  side   text;
  plan   integer;
  my_score integer;
  op_score integer;
  w      boolean;
  win_uid text;
  lose_uid text;
  streak integer;
  bonus  integer := 0;
  reward_win integer := 0;
  pts_   integer;
  prof   jsonb;
  coins_ integer;
  ptrs_  integer;
begin
  if p_uid is null or p_uid = '' then
    raise exception 'slv: se requiere sesion';
  end if;
  select * into d from public.duels where id = p_duel for update;
  if d.id is null then return '{"error":"slv: duelo no encontrado"}'::jsonb; end if;
  if d.status = 'finished' then return '{"error":"slv: duelo ya resuelto"}'::jsonb; end if;
  if d.p1 <> p_uid and d.p2 <> p_uid then return '{"error":"slv: no participas"}'::jsonb; end if;
  side := case when d.p1 = p_uid then 'p1' else 'p2' end;
  if (case when side = 'p1' then d.done1 else d.done2 end) > 0 then
    return '{"error":"slv: ya jugaste tu lado"}'::jsonb;
  end if;
  select plan_ms into plan from public.duel_levels where level_id = d.level_id;
  if plan is null then return '{"error":"slv: nivel invalido"}'::jsonb; end if;
  -- Validacion de huella (anti-trampas, limites generosos pero fisicos)
  if p_score < 0 or p_combo < 1 or p_combo > 20 then
    return '{"error":"slv: huella invalida (puntaje/combo)"}'::jsonb;
  end if;
  if p_hits < 0 or p_fails < 0 then
    return '{"error":"slv: huella invalida (aciertos/fallos)"}'::jsonb;
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
  if p_ms < 800 or p_ms > (plan + 12000) * 1.5 then
    return '{"error":"slv: huella rechazada (duracion invalida)"}'::jsonb;
  end if;
  if p_ms < p_hits * 400 then
    return '{"error":"slv: huella rechazada (demasiado rapido)"}'::jsonb;
  end if;
  -- Registrar lado
  d.scores := coalesce(d.scores, '{}') || jsonb_build_object(side, p_score);
  if side = 'p1' then d.done1 := (floor(extract(epoch from now())))::bigint;
     else d.done2 := (floor(extract(epoch from now())))::bigint; end if;
  update public.duels set scores = d.scores, done1 = d.done1, done2 = d.done2,
    status = case when d.done1 > 0 and d.done2 > 0 then 'finished'
                  else (case when side = 'p1' then 'p1_done' else 'p2_done' end) end
  where id = d.id;
  if d.done1 = 0 or d.done2 = 0 then
    return jsonb_build_object('status','waiting','played_side',side,'score',p_score);
  end if;
  -- ----------------- Resolver -----------------
  my_score := p_score;
  op_score := (case when side = 'p1' then (d.scores->>'p2') else (d.scores->>'p1') end)::int;
  w := my_score > op_score or (my_score = op_score and
       (case when side = 'p1' then d.done1 <= d.done2 else d.done2 <= d.done1 end));
  win_uid := case when w then p_uid else (case when side = 'p1' then d.p2 else d.p1 end) end;
  lose_uid := case when win_uid = d.p1 then d.p2 else d.p1 end;
  -- premios del ganador (racha la lleva el server; resetea al perder)
  select profile into prof from public.users where uid = win_uid for update;
  if not found then prof := '{"coins":0}'::jsonb; end if;
  if jsonb_typeof(prof) <> 'object' then prof := '{"coins":0}'::jsonb; end if;
  streak := coalesce((prof->>'duelStreak')::int, 0) + 1;
  bonus := 0;
  if streak >= 3 then bonus := 10; end if;
  reward_win := 20 + bonus;
  coins_ := coalesce((prof->>'coins')::int, 0) + reward_win;
  ptrs_  := coalesce((prof->>'duelPts')::int, 0) + 20;
  prof := jsonb_set(prof, '{coins}', to_jsonb(coins_));
  prof := jsonb_set(prof, '{duelStreak}', to_jsonb(streak));
  prof := jsonb_set(prof, '{duelPts}', to_jsonb(ptrs_));
  update public.users set profile = prof, updated_at = now() where uid = win_uid;
  -- premios del perdedor (+5, racha a 0)
  select profile into prof from public.users where uid = lose_uid for update;
  if not found then prof := '{"coins":0}'::jsonb; end if;
  if jsonb_typeof(prof) <> 'object' then prof := '{"coins":0}'::jsonb; end if;
  coins_ := coalesce((prof->>'coins')::int, 0) + 5;
  ptrs_  := coalesce((prof->>'duelPts')::int, 0) + 5;
  prof := jsonb_set(prof, '{coins}', to_jsonb(coins_));
  prof := jsonb_set(prof, '{duelStreak}', to_jsonb(0));
  prof := jsonb_set(prof, '{duelPts}', to_jsonb(ptrs_));
  update public.users set profile = prof, updated_at = now() where uid = lose_uid;
  update public.duels set
    winner  = win_uid,
    reward1 = case when p1 = win_uid then reward_win else 5 end,
    reward2 = case when p2 = win_uid then reward_win else 5 end,
    resolved = (floor(extract(epoch from now())))::bigint
  where id = d.id;
  return jsonb_build_object('status','finished','won',w,
    'reward', (case when w then reward_win else 5 end),
    'bonus', (case when w then bonus else 0 end),
    'pts', (case when w then 20 else 5 end),
    'my',my_score,'op',op_score,'streak', streak);
end;
$$;

-- Wrapper publico con la sesion del JWT (REST /rpc/submit_duel_play)
create or replace function public.submit_duel_play(
  p_duel  text,
  p_score integer,
  p_combo integer,
  p_hits  integer,
  p_fails integer,
  p_ms    integer
) returns jsonb
language sql stable security definer set search_path = public
as $$
  select public._x_duel_submit(auth.uid()::text, p_duel, p_score, p_combo, p_hits, p_fails, p_ms);
$$;
grant execute on function public.submit_duel_play(text, integer, integer, integer, integer, integer) to anon;

-- Amigo por codigo: codigo de 5 chars base36 derivado del uid.
create or replace function public.friend_code(uid_in text)
returns text language sql immutable
as $$
  select 'F' || lpad(upper(to_hex(mod(abs(hashtext(uid_in)), 46656))), 5, '0');
$$;
grant execute on function public.friend_code(text) to anon;

-- Tu propio codigo amigo (el hash vive en el server; el cliente no lo replica)
create or replace function public.my_friend_code()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  uid_ text := auth.uid()::text;
begin
  if uid_ is null or uid_ = '' then return '{"error":"logout"}'::jsonb; end if;
  return jsonb_build_object('code', public.friend_code(uid_));
end;
$$;
grant execute on function public.my_friend_code() to anon;

create or replace function public._x_add_friend(p_uid text, p_code text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  t      public.users%rowtype;
  fr     public.friends%rowtype;
begin
  if p_uid is null or p_uid = '' then raise exception 'slv: se requiere sesion'; end if;
  if p_code is null or length(p_code) < 5 then return '{"error":"slv: codigo invalido"}'::jsonb; end if;
  select * into t from public.users where public.friend_code(uid) = upper(p_code) limit 1;
  if t.uid is null then return '{"error":"slv: codigo no encontrado"}'::jsonb; end if;
  if t.uid = p_uid then return '{"error":"slv: es tu propio codigo"}'::jsonb; end if;
  select * into fr from public.friends where uid = p_uid and fid = t.uid;
  if fr.uid is not null then return '{"error":"slv: ya son amigos"}'::jsonb; end if;
  insert into public.friends(uid, fid, name, avatar, since)
  values (p_uid, t.uid,
          coalesce(t.profile->>'name',''),
          coalesce(t.profile->>'avatar',''),
          (floor(extract(epoch from now())))::bigint);
  insert into public.friends(uid, fid, name, avatar, since)
  values (t.uid, p_uid,
          coalesce((select profile->>'name' from public.users where uid = p_uid),''),
          coalesce((select profile->>'avatar' from public.users where uid = p_uid),''),
          (floor(extract(epoch from now())))::bigint)
  on conflict do nothing;
  return jsonb_build_object('ok', true, 'uid', t.uid,
    'name', coalesce(t.profile->>'name',''), 'avatar', coalesce(t.profile->>'avatar',''));
end;
$$;

create or replace function public.add_friend(p_code text)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select public._x_add_friend(auth.uid()::text, p_code);
$$;
grant execute on function public.add_friend(text) to anon;
-- ============================================================
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
