-- Leanward: database setup for Supabase.
-- Leanward shares PR Forge's Supabase project (PRD §15 Q6b) so one Google sign-in covers both apps.
-- Paste this whole file into Supabase → SQL Editor → New query, then click Run. Safe to run more than once.
--
-- Rules for every Leanward table:
--   * the name starts with lw_ (nothing here touches PR Forge's tables or policies);
--   * row level security is on;
--   * access is granted explicitly to the anon / authenticated roles.

-- ---------------------------------------------------------------------------
-- M0: a test row the app reads to confirm it reaches the database.
-- ---------------------------------------------------------------------------
create table if not exists public.lw_ping (
  id      smallint primary key,
  message text not null
);

insert into public.lw_ping (id, message) values (1, 'Connected')
  on conflict (id) do nothing;

alter table public.lw_ping enable row level security;

drop policy if exists "lw_ping readable" on public.lw_ping;
create policy "lw_ping readable" on public.lw_ping
  for select to anon, authenticated
  using (true);

grant select on public.lw_ping to anon, authenticated;

-- ---------------------------------------------------------------------------
-- M0: error reports (PRD §15 Q13: Leanward's own table, no third party).
-- The app can only insert. Nobody can read reports through the API; you read them in
-- Supabase → Table Editor → lw_errors. Reports hold technical details only (see js/errors.js).
-- ---------------------------------------------------------------------------
create table if not exists public.lw_errors (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  user_id     uuid default auth.uid(),
  app_version text not null check (char_length(app_version) <= 20),
  message     text not null check (char_length(message) <= 500),
  source      text check (char_length(source) <= 300),
  line        integer,
  col         integer,
  stack       text check (char_length(stack) <= 4000),
  user_agent  text check (char_length(user_agent) <= 300)
);

create index if not exists lw_errors_created on public.lw_errors (created_at desc);

alter table public.lw_errors enable row level security;

drop policy if exists "lw_errors insert" on public.lw_errors;
create policy "lw_errors insert" on public.lw_errors
  for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));

grant insert on public.lw_errors to anon, authenticated;
grant usage on sequence public.lw_errors_id_seq to anon, authenticated;
