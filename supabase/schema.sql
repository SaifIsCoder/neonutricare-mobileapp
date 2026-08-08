-- =============================================================================
-- NeoNutriCare — Phase 1 Supabase setup
-- Refs: docs/DATABASE.md §3 §4 §5 · docs/SUPABASE.md §3 §4 §5 §7
--
-- HOW TO RUN
--   Supabase Dashboard → SQL Editor → New query → paste this whole file → Run.
--
-- This script is IDEMPOTENT — safe to run more than once. Tables use
-- `if not exists`, policies are dropped before being recreated, and the seed
-- blocks only fire when the content table is empty.
--
-- It creates NO users and stores NO secrets. The app connects with the
-- PUBLISHABLE (anon) key; RLS below is what actually protects the data.
-- Never ship the secret / service-role key in the Expo bundle.
-- =============================================================================


-- =============================================================================
-- 1. EXTENSIONS
-- =============================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()


-- =============================================================================
-- 2. TABLES  (docs/DATABASE.md §5)
-- =============================================================================

-- 2.1 profiles — one row per registered user, auto-created by the trigger in §5.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is
  'One profile per auth user. Created automatically by handle_new_user().';

-- 2.2 predictions — one row per assessment.
-- Stores the HUMAN-READABLE inputs (what the history screens display) plus the
-- model result. The encoded values (A/B/R/U/YES/NO) live only inside FastAPI
-- and are never persisted here.
create table if not exists public.predictions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade default auth.uid(),
  age                  text,           -- age BAND: '15–19 years' / '20–45 years' — never a raw number
  address              text,           -- 'Rural' / 'Urban'
  weight_gain          text,           -- weight GAIN band: '>10 kg' / '<10 kg'
  education            text,           -- 'Educated' / 'Uneducated'
  occupation           text,           -- 'Employed' / 'Unemployed'
  family_type          text,           -- 'Joint family' / 'Single / nuclear family'
  parity               text,           -- 'Primigravida' / 'Multigravida'
  living_with_husband  boolean,        -- Yes → true, No → false
  booked               boolean,        -- Booked → true, Un-booked → false
  antenatal_visits     int,
  hemoglobin           numeric(4,1),   -- g/dL
  iron_injection       boolean,
  pre_eclampsia        boolean,
  infection            boolean,
  prediction           text,           -- 'Healthy' / 'At Risk' — and 'Pending' while mocked (Phase 3)
  confidence           numeric(5,4),   -- 0–1, e.g. 0.8890
  recommendation       text,
  created_at           timestamptz not null default now()
);

comment on column public.predictions.prediction is
  'Model label. Deliberately NOT constrained by a CHECK: Phase 3 writes the '
  'mock value ''Pending'' before FastAPI exists, and the 0/1 label meaning is '
  'still unresolved (docs/ML_MODEL.md §5).';

-- 2.3 health_tips — global content, read-only to signed-in users.
create table if not exists public.health_tips (
  id          uuid primary key default gen_random_uuid(),
  category    text not null,
  icon        text,
  title       text,
  body        text not null,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- 2.4 maternal_guides — global content, read-only to signed-in users.
create table if not exists public.maternal_guides (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  subtitle    text,
  icon        text,
  body        text,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);


-- =============================================================================
-- 3. INDEXES  (docs/DATABASE.md §3)
-- =============================================================================

-- history list + dashboard counts, newest first
create index if not exists idx_predictions_user_created
  on public.predictions (user_id, created_at desc);

create index if not exists idx_health_tips_active_sort
  on public.health_tips (is_active, sort_order);

create index if not exists idx_maternal_guides_active_sort
  on public.maternal_guides (is_active, sort_order);


-- =============================================================================
-- 4. ROW LEVEL SECURITY  (docs/SUPABASE.md §4)
--
-- RLS ON with no policy = denies everything.
-- RLS OFF = fully exposed. Both are wrong; we want ON + explicit policies.
--
-- auth.uid() is NULL for anonymous callers, and `NULL = id` is never true,
-- so the owner-scoped policies below already exclude anon.
-- =============================================================================

alter table public.profiles        enable row level security;
alter table public.predictions     enable row level security;
alter table public.health_tips     enable row level security;
alter table public.maternal_guides enable row level security;

-- 4.1 profiles — a user sees and edits only their own profile.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No delete policy: profiles are removed by the cascade from auth.users.

-- 4.2 predictions — full CRUD, scoped to the owner.
drop policy if exists "predictions_select_own" on public.predictions;
create policy "predictions_select_own"
  on public.predictions for select
  using (auth.uid() = user_id);

drop policy if exists "predictions_insert_own" on public.predictions;
create policy "predictions_insert_own"
  on public.predictions for insert
  with check (auth.uid() = user_id);

drop policy if exists "predictions_update_own" on public.predictions;
create policy "predictions_update_own"
  on public.predictions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "predictions_delete_own" on public.predictions;
create policy "predictions_delete_own"
  on public.predictions for delete
  using (auth.uid() = user_id);

-- 4.3 Content tables — read-only to any signed-in user.
-- No write policies are exposed to the app; content is edited from the
-- dashboard or a service-role seed script.
drop policy if exists "health_tips_read" on public.health_tips;
create policy "health_tips_read"
  on public.health_tips for select
  to authenticated
  using (is_active);

drop policy if exists "maternal_guides_read" on public.maternal_guides;
create policy "maternal_guides_read"
  on public.maternal_guides for select
  to authenticated
  using (is_active);


-- =============================================================================
-- 5. AUTO-CREATE PROFILE ON SIGNUP  (docs/SUPABASE.md §3)
--
-- security definer so the insert runs as the function owner and is not blocked
-- by the profiles RLS policies. search_path = '' means every name must be
-- fully qualified.
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email
  )
  on conflict (id) do nothing;   -- never let a duplicate abort the signup
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profiles.updated_at honest. (Small addition beyond the docs — the
-- column exists in DATABASE.md §2.1 but nothing was maintaining it.)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();


-- =============================================================================
-- 6. STORAGE  (docs/SUPABASE.md §5)
--
-- Path convention: avatars/{user_id}/filename.jpg
-- The first folder segment must equal the caller's uid.
-- Both buckets are PRIVATE — read them with createSignedUrl(), not a public URL.
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

-- 'reports' is provisioned now but unused until PDF export ships (v1 optional).
insert into storage.buckets (id, name, public)
values ('reports', 'reports', false)
on conflict (id) do nothing;

-- avatars: select + insert come straight from SUPABASE.md §5. update + delete
-- are added so a user can replace or remove their own avatar — without them,
-- re-uploading over an existing file fails.
drop policy if exists "avatars_read_own" on storage.objects;
create policy "avatars_read_own"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_write_own" on storage.objects;
create policy "avatars_write_own"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- reports: same owner-folder rule, read + write only.
drop policy if exists "reports_read_own" on storage.objects;
create policy "reports_read_own"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'reports' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "reports_write_own" on storage.objects;
create policy "reports_write_own"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'reports' and (storage.foldername(name))[1] = auth.uid()::text);


-- =============================================================================
-- 7. DASHBOARD STATS RPC  (docs/DATABASE.md §4 — optional in TASKS Phase 1)
--
-- One call for the three Home-screen metrics.
-- security invoker (the default) so the caller's RLS still applies — the
-- function can only ever count rows that caller is allowed to see.
--
-- Note: rows with the Phase 3 mock label 'Pending' count toward
-- total_assessments but toward neither low_risk nor high_risk. That is correct
-- until the real backend lands.
-- =============================================================================

create or replace function public.get_dashboard_stats()
returns table (
  total_assessments bigint,
  low_risk_cases    bigint,
  high_risk_cases   bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    count(*)                                          as total_assessments,
    count(*) filter (where p.prediction = 'Healthy')  as low_risk_cases,
    count(*) filter (where p.prediction = 'At Risk')  as high_risk_cases
  from public.predictions p
  where p.user_id = (select auth.uid());
$$;

-- Postgres grants EXECUTE to PUBLIC on every new function, and `anon` inherits
-- that. Revoke first, otherwise the grant below restricts nothing and anonymous
-- callers can invoke the RPC (it returns zeros, but that is not the intent).
revoke execute on function public.get_dashboard_stats() from public;
grant  execute on function public.get_dashboard_stats() to authenticated;


-- =============================================================================
-- 8. SEED CONTENT  (docs/SUPABASE.md §7)
--
-- Guarded on "table is empty" so re-running this file never duplicates rows
-- and never overwrites content you have edited in the dashboard.
-- =============================================================================

insert into public.health_tips (category, icon, body, sort_order)
select * from (values
  ('Nutrition',       'seedling',       'Include leafy greens and lentils daily to support iron levels.', 1),
  ('Hydration',       'droplet',        'Aim for 8–10 glasses of water spread through the day.',          2),
  ('Iron-rich foods', 'drumstick-bite', 'Pair iron sources with vitamin C to improve absorption.',        3),
  ('ANC visits',      'calendar-check', 'Book your next antenatal visit within the recommended window.',  4)
) as v(category, icon, body, sort_order)
where not exists (select 1 from public.health_tips);

insert into public.maternal_guides (title, subtitle, icon, sort_order)
select * from (values
  ('Pregnancy guide',   'Week-by-week guidance',   'baby',           1),
  ('Nutrition guide',   'Balanced diet planning',  'carrot',         2),
  ('Exercise guide',    'Safe prenatal exercises', 'dumbbell',       3),
  ('Checkup reminders', 'Never miss an ANC visit', 'calendar-check', 4)
) as v(title, subtitle, icon, sort_order)
where not exists (select 1 from public.maternal_guides);


-- =============================================================================
-- 9. POST-RUN VERIFICATION
-- Run these separately after the script above succeeds.
-- =============================================================================

-- 9.1 Every public table should report rls_enabled = true.
--   select relname as table_name, relrowsecurity as rls_enabled
--   from pg_class
--   where relnamespace = 'public'::regnamespace
--     and relname in ('profiles','predictions','health_tips','maternal_guides')
--   order by relname;

-- 9.2 Expect 15 policies: profiles 3, predictions 4, content 2, storage 6
--     (avatars 4 + reports 2; storage rows live under the 'storage' schema).
--   select schemaname, tablename, policyname, cmd
--   from pg_policies
--   where (schemaname = 'public'
--          and tablename in ('profiles','predictions','health_tips','maternal_guides'))
--      or (schemaname = 'storage' and policyname like any (array['avatars%','reports%']))
--   order by schemaname, tablename, policyname;

-- 9.3 Trigger should exist on auth.users.
--   select tgname from pg_trigger where tgname = 'on_auth_user_created';

-- 9.4 Seed check — expect 4 and 4.
--   select (select count(*) from public.health_tips)      as tips,
--          (select count(*) from public.maternal_guides)  as guides;

-- 9.5 RLS smoke test (the Phase 1 exit criterion) — do this from the APP or
--     with two real signed-in sessions, NOT in the SQL editor. The SQL editor
--     runs as a superuser-ish role that bypasses RLS, so everything will look
--     readable here and prove nothing.
--
--     Register user A and user B, create a prediction as A, then as B run:
--         const { data } = await supabase.from('predictions').select('*');
--     B must get [] — zero rows, not an error.
