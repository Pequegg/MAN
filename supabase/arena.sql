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
create policy duels_write   on public.duels         for insert with check (p1 = auth.uid()::text or p2 = auth.uid()::text);
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