-- ============================================================
-- Op-Art Fan · security-v2.sql — ENDURECIMIENTO RLS + RPCs validados
-- Migración idempotente para proyectos con arena.sql (Fases 0-3) aplicado.
-- Cierra la escritura directa de puntajes/puntos/objetos (anti-trampas):
--   · scores, daily, arena_daily, group_members, group_pts: SOLO escritura
--     vía funciones security definer (submit_score, submit_daily,
--     submit_arena_daily, group_submit).
--   · users: solo escritura vía save_profile / set_nickname (protege la
--     economía: monedas, inventario y cosméticos los decide el server).
--   · duels: creación vía create_duel (con límite diario); el registro de
--     cada lado sigue en el RPC submit_duel_play existente.
--   · friends/purchases: solo RPC (add_friend / redeem_item).
--   · live_rooms: crear/empezar/marcar/envío en vivo solo por RPC
--     (live_create / live_start / live_score / live_leave / live_join /
--     live_submit).
-- Añade rate limiting (rate_limits), nick único con filtro de palabras
-- prohibidas embebidas en SQL, y la migración de economía al primer
-- guardado (save_profile).
-- ============================================================

-- ============================================================
-- 1) Rate limiting por usuario + acción (ventana móvil de ms)
-- ============================================================
create table if not exists public.rate_limits(
  uid text not null,
  act text not null,
  at bigint not null,
  primary key (uid, act, at)
);
create index if not exists idx_rate_uid_act on public.rate_limits(uid, act);

-- Comprueba el límite y registra el intento en una sola llamada.
-- Devuelve `true` si hay permiso; si no, `false` (sin insertar).
create or replace function public._rate_ok(p_uid text, p_act text, p_win_ms bigint, p_max integer)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  now_ms bigint := (floor(extract(epoch from now()) * 1000))::bigint;
  cnt integer;
begin
  delete from public.rate_limits
   where uid = p_uid and at < now_ms - p_win_ms;
  select count(*) into cnt from public.rate_limits
   where uid = p_uid and act = p_act and at > now_ms - p_win_ms;
  if cnt >= p_max then return false; end if;
  insert into public.rate_limits(uid, act, at) values (p_uid, p_act, now_ms);
  return true;
end;
$$;
grant execute on function public._rate_ok(text, text, bigint, integer) to anon;

-- ============================================================
-- 2) RLS cerradas: nadie escribe directo en tablas de resultados
--    (denegación explícita con with check (false) / for update using (false)).
-- ============================================================
drop policy if exists scores_write  on public.scores;
drop policy if exists scores_upd    on public.scores;
drop policy if exists daily_write   on public.daily;
drop policy if exists daily_upd     on public.daily;
drop policy if exists gm_write      on public.group_members;
drop policy if exists gm_upd        on public.group_members;
drop policy if exists gp_write      on public.group_pts;
drop policy if exists gp_upd        on public.group_pts;
drop policy if exists ad_write      on public.arena_daily;
drop policy if exists ad_upd        on public.arena_daily;
drop policy if exists users_write   on public.users;
drop policy if exists users_upd     on public.users;
drop policy if exists duels_write   on public.duels;
drop policy if exists duels_upd     on public.duels;
drop policy if exists friends_write on public.friends;
drop policy if exists friends_upd   on public.friends;
drop policy if exists purch_write   on public.purchases;
drop policy if exists live_insert   on public.live_rooms;
drop policy if exists live_update   on public.live_rooms;

create policy scores_deny     on public.scores        for insert with check (false);
create policy scores_upd_deny on public.scores        for update using (false);
create policy daily_deny      on public.daily         for insert with check (false);
create policy daily_upd_deny  on public.daily         for update using (false);
create policy gm_deny         on public.group_members for insert with check (false);
create policy gm_upd_deny     on public.group_members for update using (false);
create policy gp_deny         on public.group_pts     for insert with check (false);
create policy gp_upd_deny     on public.group_pts     for update using (false);
create policy ad_deny         on public.arena_daily   for insert with check (false);
create policy ad_upd_deny     on public.arena_daily   for update using (false);
create policy users_deny      on public.users         for insert with check (false);
create policy users_upd_deny  on public.users         for update using (false);
create policy duels_deny      on public.duels         for insert with check (false);
create policy duels_upd_deny  on public.duels         for update using (false);
create policy friends_deny    on public.friends       for insert with check (false);
create policy friends_upd_deny on public.friends      for update using (false);
create policy live_deny       on public.live_rooms    for insert with check (false);
create policy live_upd_deny   on public.live_rooms    for update using (false);

revoke insert, update on public.scores, public.daily, public.group_members,
  public.group_pts, public.arena_daily, public.users, public.duels,
  public.friends, public.live_rooms from anon;

-- ============================================================
-- 3) Nick único + filtro de palabras prohibidas (A3)
-- ============================================================
-- Limpia posibles nicks duplicados previos (se quedan solo los primeros)
-- para que el índice único pueda crearse sin fallar en bases con datos.
update public.users u set profile = jsonb_set(u.profile, '{name}', to_jsonb(''))
 where (u.profile ->> 'name') <> ''
   and exists (select 1 from public.users o
                where lower(o.profile ->> 'name') = lower(u.profile ->> 'name')
                  and o.uid < u.uid);

-- Índice único case-insensitive mientras el nombre no esté vacío.
drop index if exists users_nick_uniq;
create unique index users_nick_uniq
  on public.users (lower((profile ->> 'name')))
  where (profile ->> 'name') <> '';

-- Ajusta tu apodo (único en todo el juego). Devuelve {ok, name} o {error}.
-- Nucleo interno con p_uid explícito (reutilizable por tests).
create or replace function public._x_set_nickname(p_uid text, p_name text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  w text;
  existing text;
  row_u public.users%rowtype;
  prof  jsonb;
  bad   boolean := false;
  word  text;
  words text[] := array['puta','puto','pendejo','pendeja','mierda','verga','culo',
    'polla','pajero','hijoputa','hijodeputa','cabron','cabrona','maricon',
    'maricona','retrasado','mongolo','tonto','estupido','tarado',
    'idiota','subnormal','imbecil','basura','pedofilo','nazi','violador',
    'rata','escoria','analfabeto'];
begin
  if p_uid is null or p_uid = '' then
    raise exception 'slv: se requiere sesion';
  end if;
  w := trim(coalesce(p_name, ''));
  if w = '' then
    return '{"error":"slv: escribe un nombre primero"}'::jsonb;
  end if;
  if char_length(w) < 3 then
    return '{"error":"slv: el nombre es muy corto (minimo 3 letras)"}'::jsonb;
  end if;
  if char_length(w) > 16 then w := left(w, 16); end if;
  -- filtro de palabras prohibidas (case-insensitive, palabras enteras)
  foreach word in array words loop
    if lower(w) ~ ('.*' || word || '.*') then bad := true; exit; end if;
  end loop;
  if bad then
    return '{"error":"slv: ese nombre no se puede usar, prueba otro"}'::jsonb;
  end if;
  select uid into existing from public.users
   where lower((profile ->> 'name')) = lower(w) and uid <> p_uid limit 1;
  if existing is not null then
    return '{"error":"slv: ese nombre ya esta en uso, prueba otro"}'::jsonb;
  end if;
  select * into row_u from public.users where uid = p_uid;
  if row_u.uid is null then
    insert into public.users(uid, profile, updated_at)
    values (p_uid, jsonb_build_object('name', w), now());
    return jsonb_build_object('ok', true, 'name', w);
  end if;
  prof := coalesce(row_u.profile, '{}'::jsonb);
  if jsonb_typeof(prof) <> 'object' then prof := '{}'::jsonb; end if;
  prof := jsonb_set(prof, '{name}', to_jsonb(w));
  update public.users set profile = prof, updated_at = now() where uid = p_uid;
  return jsonb_build_object('ok', true, 'name', w);
end;
$$;

create or replace function public.set_nickname(p_name text)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select public._x_set_nickname(auth.uid()::text, p_name);
$$;
grant execute on function public.set_nickname(text) to anon;
-- El filtro de palabras prohibidas vive embebido en _x_set_nickname (definer).

-- ============================================================
-- 4) save_profile: perfil en la nube con server-authority de economía
--    · Primera creación: migra el progreso local (monedas/inventario/
--      cosméticos acotados a valores plausibles).
--    · Guardados siguientes: SÓLO campos editables de juego; la economía
--      la mantiene el server (monedas/inventario/cosméticos/ownedSkins/
--      totalEarned se ignoran si vienen del cliente).
-- ============================================================
create or replace function public._clamp_int(j jsonb, k text, lo integer, hi integer, def integer)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v integer;
begin
  v := coalesce((j ->> k)::int, def);
  if v < lo then v := lo; end if;
  if v > hi then v := hi; end if;
  return to_jsonb(v);
end;
$$;

create or replace function public._x_save_profile(p_uid text, p_profile jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  row_u   public.users%rowtype;
  base    jsonb;
  prof_in jsonb;
  out     jsonb;
  k       text;
  editable text[] := array['avatar','settings','introDone','completed','pb',
    'achievements','equipped','activeSkin','activeFanSkin','activeFrame',
    'activeTitle','activeMascot'];
  migration text[] := array['coins','inventory','ownedCosmetics','ownedSkins','totalEarned'];
  coins_  integer;
  nm_     text;
  arr     jsonb;
  it      jsonb;
  ok      boolean;
begin
  if p_uid is null or p_uid = '' then
    raise exception 'slv: se requiere sesion';
  end if;
  prof_in := coalesce(p_profile, '{}'::jsonb);
  if jsonb_typeof(prof_in) <> 'object' then prof_in := '{}'::jsonb; end if;
  select * into row_u from public.users where uid = p_uid;
  base := coalesce(row_u.profile, '{}'::jsonb);
  if jsonb_typeof(base) <> 'object' then base := '{}'::jsonb; end if;
  out := base;

  if row_u.uid is null then
    -- ---- migración inicial: acota lo que acepta de un cliente nuevo ----
    -- nombre/avatar van sueltos si el flujo aún no usó set_nickname
    if prof_in ? 'name' then
      nm_ := left(coalesce((prof_in->>'name')::text, ''), 16);
      if nm_ <> '' and exists(select 1 from public.users
        where lower((profile ->> 'name')) = lower(nm_) and uid <> p_uid) then
        nm_ := ''; -- el apodo ya lo tomó otro: se resuelve con set_nickname
      end if;
      out := jsonb_set(out, '{name}', to_jsonb(nm_));
    end if;
    if prof_in ? 'avatar' then
      out := jsonb_set(out, '{avatar}', to_jsonb(left(coalesce((prof_in->>'avatar')::text, ''), 8)));
    end if;
    foreach k in array migration loop
      if prof_in ? k then
        if k = 'coins' then
          out := jsonb_set(out, '{coins}', public._clamp_int(prof_in, 'coins', 0, 500000, 0));
        elsif k = 'totalEarned' then
          out := jsonb_set(out, '{totalEarned}', public._clamp_int(prof_in, 'totalEarned', 0, 20000000, 0));
        else
          arr := prof_in -> k;
          if jsonb_typeof(arr) = 'array' and jsonb_array_length(arr) <= 100 then
            out := jsonb_set(out, ('{' || k || '}')::text[], arr);
          end if;
        end if;
      end if;
    end loop;
  else
    -- ---- guardado posterior: solo campos editables (sin economía) ----
    foreach k in array editable loop
      if prof_in ? k then
        out := jsonb_set(out, ('{' || k || '}')::text[], prof_in -> k);
      end if;
    end loop;
    -- nombre/avatar: avatar editable, nombre SOLO vía set_nickname
    if prof_in ? 'avatar' then
      out := jsonb_set(out, '{avatar}', to_jsonb(left(coalesce((prof_in->>'avatar')::text, ''), 8)));
    end if;
  end if;
  -- gameplay almacenable (progreso mundo/arena/diario) — merge object
  foreach k in array array['arena','dailyBest'] loop
    if prof_in ? k and jsonb_typeof(prof_in -> k) = 'object' then
      out := jsonb_set(out, ('{' || k || '}')::text[], prof_in -> k);
    end if;
  end loop;
  -- sello de tiempo para last-write-wins del pull del cliente
  if prof_in ? '_saved' then
    out := jsonb_set(out, '{_saved}', prof_in -> '_saved');
  end if;
  insert into public.users(uid, profile, updated_at) values (p_uid, out, now())
  on conflict (uid) do update set profile = excluded.profile, updated_at = now();
  return out;
end;
$$;

create or replace function public.save_profile(p_profile jsonb)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select public._x_save_profile(auth.uid()::text, p_profile);
$$;
grant execute on function public.save_profile(jsonb) to anon;

-- ============================================================
-- 5) Puntajes clásicos / diario / arena: RPCs con rate limit y
--    validación de rango. El server conserva el MEJOR puntaje por
--    usuario (es lo que se muestra en los rankings).
-- ============================================================
create or replace function public._x_submit_score(p_uid text, p_score integer, p_ts bigint)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  row_s public.scores%rowtype;
  prof  jsonb;
  nm    text;
  av    text;
begin
  if p_uid is null or p_uid = '' then
    return '{"error":"slv: se requiere sesion"}'::jsonb;
  end if;
  if p_score < 0 or p_score > 2000000 then
    return '{"error":"slv: puntaje invalido"}'::jsonb;
  end if;
  if not public._rate_ok(p_uid, 'score', 60000, 30) then
    return '{"error":"slv: demasiados intentos, espera un momento"}'::jsonb;
  end if;
  select profile into prof from public.users where uid = p_uid;
  nm := coalesce(prof ->> 'name', '');
  av := coalesce(prof ->> 'avatar', '');
  select * into row_s from public.scores where uid = p_uid;
  if row_s.uid is null then
    insert into public.scores(uid, name, avatar, score, ts)
    values (p_uid, nm, av, p_score, coalesce(p_ts, (floor(extract(epoch from now()) * 1000))::bigint));
  elsif p_score > row_s.score then
    update public.scores set name = nm, avatar = av, score = p_score,
      ts = coalesce(p_ts, (floor(extract(epoch from now()) * 1000))::bigint)
     where uid = p_uid;
  end if;
  return jsonb_build_object('ok', true, 'best', greatest(coalesce(row_s.score, 0), p_score));
end;
$$;

create or replace function public.submit_score(p_score integer, p_ts bigint)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select public._x_submit_score(auth.uid()::text, p_score, p_ts);
$$;
grant execute on function public.submit_score(integer, bigint) to anon;

-- -------- Reto diario clásico (best por (date, uid)) --------
create or replace function public._x_submit_daily(p_uid text, p_date text, p_score integer, p_ts bigint)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  row_d public.daily%rowtype;
  prof  jsonb;
  nm    text;
  av    text;
begin
  if p_uid is null or p_uid = '' then
    return '{"error":"slv: se requiere sesion"}'::jsonb;
  end if;
  if p_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    return '{"error":"slv: fecha invalida"}'::jsonb;
  end if;
  if p_score < 0 or p_score > 2000000 then
    return '{"error":"slv: puntaje invalido"}'::jsonb;
  end if;
  if not public._rate_ok(p_uid, 'daily', 60000, 10) then
    return '{"error":"slv: demasiados intentos, espera un momento"}'::jsonb;
  end if;
  select profile into prof from public.users where uid = p_uid;
  nm := coalesce(prof ->> 'name', '');
  av := coalesce(prof ->> 'avatar', '');
  select * into row_d from public.daily where date = p_date and uid = p_uid;
  if row_d.date is null then
    insert into public.daily(date, uid, name, avatar, score, ts)
    values (p_date, p_uid, nm, av, p_score, coalesce(p_ts, (floor(extract(epoch from now()) * 1000))::bigint));
  elsif p_score > row_d.score then
    update public.daily set name = nm, avatar = av, score = p_score,
      ts = coalesce(p_ts, (floor(extract(epoch from now()) * 1000))::bigint)
     where date = p_date and uid = p_uid;
  end if;
  return jsonb_build_object('ok', true, 'best',
    greatest(coalesce(row_d.score, 0), p_score));
end;
$$;

create or replace function public.submit_daily(p_date text, p_score integer, p_ts bigint)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select public._x_submit_daily(auth.uid()::text, p_date, p_score, p_ts);
$$;
grant execute on function public.submit_daily(text, integer, bigint) to anon;

-- -------- Arena: ranking mundial del reto diario --------
create or replace function public._x_submit_arena_daily(p_uid text, p_date text, p_mode text, p_score integer)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  row_a public.arena_daily%rowtype;
  prof  jsonb;
  nm    text;
  av    text;
begin
  if p_uid is null or p_uid = '' then
    return '{"error":"slv: se requiere sesion"}'::jsonb;
  end if;
  if p_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    return '{"error":"slv: fecha invalida"}'::jsonb;
  end if;
  if p_mode not in ('calligraphy','lanterns','coin','drum') then
    return '{"error":"slv: modo invalido"}'::jsonb;
  end if;
  if p_score < 0 or p_score > 2000000 then
    return '{"error":"slv: puntaje invalido"}'::jsonb;
  end if;
  if not public._rate_ok(p_uid, 'arena', 60000, 30) then
    return '{"error":"slv: demasiados intentos, espera un momento"}'::jsonb;
  end if;
  select profile into prof from public.users where uid = p_uid;
  nm := coalesce(prof ->> 'name', '');
  av := coalesce(prof ->> 'avatar', '');
  select * into row_a from public.arena_daily where date = p_date and uid = p_uid;
  if row_a.date is null then
    insert into public.arena_daily(date, uid, name, avatar, score, mode, ts)
    values (p_date, p_uid, nm, av, p_score, p_mode, (floor(extract(epoch from now()) * 1000))::bigint);
  elsif p_score > row_a.score then
    update public.arena_daily set name = nm, avatar = av, score = p_score,
      mode = p_mode, ts = (floor(extract(epoch from now()) * 1000))::bigint
     where date = p_date and uid = p_uid;
  end if;
  return jsonb_build_object('ok', true, 'best',
    greatest(coalesce(row_a.score, 0), p_score));
end;
$$;

create or replace function public.submit_arena_daily(p_date text, p_mode text, p_score integer)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select public._x_submit_arena_daily(auth.uid()::text, p_date, p_mode, p_score);
$$;
grant execute on function public.submit_arena_daily(text, text, integer) to anon;

-- ============================================================
-- 6) Grupos: el miembro se registra/actualiza, y los PUNTOS de
--    temporada se RECALCULAN en el server desde arena_daily
--    (el cliente no puede forjar pts).
-- ============================================================
create or replace function public._season_pts(p_uid text)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  s0 date := date '2026-01-05';          -- lunes de referencia (settings.js)
  i  integer := floor((current_date - s0) / 14);
  start_date date := s0 + i * 14;
  total integer;
begin
  select coalesce(sum(
    case when score >= 2500 then 18
         when score >= 1500 then 12
         when score >= 800  then 8
         when score >= 300  then 4
         else 2 end), 0)
    into total
   from public.arena_daily
  where uid = p_uid
    and to_date(date, 'YYYY-MM-DD') >= start_date
    and to_date(date, 'YYYY-MM-DD') <= current_date;
  return total;
end;
$$;

create or replace function public._season_key()
returns text
language plpgsql security definer set search_path = public
as $$
declare
  i integer := floor((current_date - date '2026-01-05') / 14);
begin
  return 'S' || i;
end;
$$;

create or replace function public._x_group_submit(p_uid text, p_group text, p_wear jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  prof jsonb;
  nm   text;
  av   text;
  pts_ integer;
  sk   text;
  w    jsonb;
begin
  if p_uid is null or p_uid = '' then
    raise exception 'slv: se requiere sesion';
  end if;
  if p_group is null or p_group !~ '^[A-Z0-9]{5}$' then
    return '{"error":"slv: codigo de grupo invalido"}'::jsonb;
  end if;
  select profile into prof from public.users where uid = p_uid;
  if prof is null or not prof ? 'name' then
    return '{"error":"slv: registra tu nombre primero"}'::jsonb;
  end if;
  nm := coalesce(prof ->> 'name', '');
  av := coalesce(prof ->> 'avatar', '');
  w := coalesce(p_wear, '{}'::jsonb);
  if jsonb_typeof(w) <> 'object' then w := '{}'::jsonb; end if;
  insert into public.group_members(group_code, uid, name, avatar, wear, joined)
  values (p_group, p_uid, nm, av, w, (floor(extract(epoch from now())))::bigint)
  on conflict (group_code, uid) do update
    set name = excluded.name, avatar = excluded.avatar, wear = excluded.wear;
  pts_ := public._season_pts(p_uid);
  sk   := public._season_key();
  insert into public.group_pts(group_code, season, uid, pts)
  values (p_group, sk, p_uid, pts_)
  on conflict (group_code, season, uid) do update set pts = excluded.pts;
  return jsonb_build_object('ok', true, 'group', p_group, 'season', sk, 'pts', pts_);
end;
$$;

create or replace function public.group_submit(p_group text, p_wear jsonb)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select public._x_group_submit(auth.uid()::text, p_group, p_wear);
$$;
grant execute on function public.group_submit(text, jsonb) to anon;

-- ============================================================
-- 7) Duelos: creación con límite diario (el submit sigue igual)
-- ============================================================
create or replace function public._x_create_duel(p_uid text, p_opp text, p_level integer)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  did text;
  seed_str text;
  ok_ bool;
begin
  if p_uid is null or p_uid = '' then
    raise exception 'slv: se requiere sesion';
  end if;
  if p_opp is null or p_opp = '' or p_opp = p_uid then
    return '{"error":"slv: rival invalido"}'::jsonb;
  end if;
  if p_level < 1 or p_level > 16 then
    return '{"error":"slv: nivel invalido"}'::jsonb;
  end if;
  if not exists(select 1 from public.duel_levels where level_id = p_level) then
    return '{"error":"slv: nivel invalido"}'::jsonb;
  end if;
  ok_ := public._rate_ok(p_uid, 'duel', 86400000, 30);
  if not ok_ then
    return '{"error":"slv: limite diario de duelos alcanzado"}'::jsonb;
  end if;
  did := 'd' || substr(md5(random()::text), 1, 16);
  seed_str := '';
  for i in 1..6 loop
    seed_str := seed_str || substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (random()*30)::int + 1, 1);
  end loop;
  insert into public.duels(id, p1, p2, level_id, seed, status, scores, created)
  values (did, p_uid, p_opp, p_level, seed_str, 'pending', '{}'::jsonb,
          (floor(extract(epoch from now()) * 1000))::bigint)
  on conflict (id) do nothing;
  return jsonb_build_object('ok', true, 'id', did, 'level', p_level);
end;
$$;

create or replace function public.create_duel(p_opp text, p_level integer)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select public._x_create_duel(auth.uid()::text, p_opp, p_level);
$$;
grant execute on function public.create_duel(text, integer) to anon;

-- ============================================================
-- 8) Salas en vivo: todo por RPC (crear, empezar, marcador, salir)
-- ============================================================
create or replace function public._x_live_create(p_uid text, p_level integer)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  rid text;
  seed_str text;
  ok_ bool;
begin
  if p_uid is null or p_uid = '' then
    raise exception 'slv: se requiere sesion';
  end if;
  if p_level < 1 or p_level > 16 then
    return '{"error":"slv: nivel invalido"}'::jsonb;
  end if;
  ok_ := public._rate_ok(p_uid, 'live', 3600000, 30);
  if not ok_ then
    return '{"error":"slv: muchas salas por hoy, espera un poco"}'::jsonb;
  end if;
  rid := 'l' || substr(md5(random()::text), 1, 16);
  seed_str := '';
  for i in 1..6 loop
    seed_str := seed_str || substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (random()*30)::int + 1, 1);
  end loop;
  insert into public.live_rooms(id, host, level_id, status, seed, created)
  values (rid, p_uid, p_level, 'open', seed_str,
          (floor(extract(epoch from now()) * 1000))::bigint)
  on conflict (id) do nothing;
  return jsonb_build_object('ok', true, 'id', rid);
end;
$$;

create or replace function public.live_create(p_level integer)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select public._x_live_create(auth.uid()::text, p_level);
$$;
grant execute on function public.live_create(integer) to anon;

-- El anfitrión empieza cuando hay rival. Devuelve la sala completa.
create or replace function public._x_live_start(p_uid text, p_room text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  r public.live_rooms%rowtype;
begin
  if p_uid is null or p_uid = '' then raise exception 'slv: se requiere sesion'; end if;
  select * into r from public.live_rooms where id = p_room for update;
  if r.id is null then return '{"error":"slv: sala no encontrada"}'::jsonb; end if;
  if r.host <> p_uid then return '{"error":"slv: solo el anfitrion empieza"}'::jsonb; end if;
  if r.status <> 'ready' then return '{"error":"slv: falta el rival"}'::jsonb; end if;
  update public.live_rooms set status = 'playing', started =
    greatest(coalesce(r.started, 0), (floor(extract(epoch from now()) * 1000))::bigint)
   where id = p_room returning * into r;
  return row_to_json(r)::jsonb;
end;
$$;

create or replace function public.live_start(p_room text)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select public._x_live_start(auth.uid()::text, p_room);
$$;
grant execute on function public.live_start(text) to anon;

-- Marcador en vivo durante la partida (throttle 2/s del cliente).
create or replace function public._x_live_score(p_uid text, p_room text, p_score integer)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  r public.live_rooms%rowtype;
begin
  if p_uid is null or p_uid = '' then raise exception 'slv: se requiere sesion'; end if;
  if p_score < 0 or p_score > 1000000 then return '{"error":"slv: puntaje invalido"}'::jsonb; end if;
  if not public._rate_ok(p_uid, 'lscore', 60000, 90) then
    return '{"error":"slv: demasiado rapido, respira"}'::jsonb;
  end if;
  select * into r from public.live_rooms where id = p_room for update;
  if r.id is null then return '{"error":"slv: sala no encontrada"}'::jsonb; end if;
  if r.status <> 'playing' then return '{"error":"slv: la partida no esta en juego"}'::jsonb; end if;
  if r.host = p_uid then
    update public.live_rooms set h_score = p_score where id = p_room;
  elsif r.guest = p_uid then
    update public.live_rooms set g_score = p_score where id = p_room;
  else
    return '{"error":"slv: no participas en esta sala"}'::jsonb;
  end if;
  return '{"ok":true}'::jsonb;
end;
$$;

create or replace function public.live_score(p_room text, p_score integer)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select public._x_live_score(auth.uid()::text, p_room, p_score);
$$;
grant execute on function public.live_score(text, integer) to anon;

-- Abandonar / cerrar la sala propia.
create or replace function public._x_live_leave(p_uid text, p_room text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  r public.live_rooms%rowtype;
begin
  if p_uid is null or p_uid = '' then raise exception 'slv: se requiere sesion'; end if;
  select * into r from public.live_rooms where id = p_room for update;
  if r.id is null then return '{"error":"slv: sala no encontrada"}'::jsonb; end if;
  if r.host <> p_uid and r.guest <> p_uid then return '{"error":"slv: no participas"}'::jsonb; end if;
  if r.status <> 'finished' then
    update public.live_rooms set status = 'finished', resolved =
      coalesce(r.resolved, (floor(extract(epoch from now())))::bigint) where id = p_room;
  end if;
  return jsonb_build_object('ok', true, 'left', true);
end;
$$;

create or replace function public.live_leave(p_room text)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select public._x_live_leave(auth.uid()::text, p_room);
$$;
grant execute on function public.live_leave(text) to anon;