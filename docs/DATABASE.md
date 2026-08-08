# DATABASE.md — NeoNutriCare

> Postgres schema (managed by Supabase). RLS details live in `SUPABASE.md`.
> Last updated: 2026-08-07

## 1. Entity overview

```
auth.users (managed by Supabase Auth)
   │ 1
   │
   ├──1─ profiles              (one profile per user)
   │
   └──*─ predictions           (many assessments per user)

health_tips      (shared content, read-only to users)
maternal_guides  (shared content, read-only to users)
```

- `profiles.id` and `predictions.user_id` both reference `auth.users.id`.
- Content tables (`health_tips`, `maternal_guides`) are global, not user-scoped.

## 2. Tables

### 2.1 `profiles`

One row per registered user. Created on signup (via trigger or client insert).

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | = `auth.users.id`, `references auth.users(id) on delete cascade` |
| `full_name` | `text` | from Register form |
| `email` | `text` | mirror of auth email (convenience) |
| `avatar_url` | `text` NULL | optional, Supabase Storage |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | default `now()` |

### 2.2 `predictions`

One row per assessment. Stores the **14 inputs** + the model result. Written by the app
**after** FastAPI returns.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | default `gen_random_uuid()` |
| `user_id` | `uuid` | `references auth.users(id) on delete cascade`, default `auth.uid()` |
| `age` | `text` | input — **age band** (`15–19 years` / `20–45 years`), NOT a raw number |
| `address` | `text` | input (Rural / Urban) |
| `weight_gain` | `text` | input — weight *gain* band (`>10 kg` / `<10 kg`) |
| `education` | `text` | input |
| `occupation` | `text` | input |
| `family_type` | `text` | input |
| `parity` | `text` | input (e.g. `G2`) |
| `living_with_husband` | `boolean` | input |
| `booked` | `boolean` | input |
| `antenatal_visits` | `int` | input |
| `hemoglobin` | `numeric(4,1)` | input, g/dL |
| `iron_injection` | `boolean` | input |
| `pre_eclampsia` | `boolean` | input |
| `infection` | `boolean` | input |
| `prediction` | `text` | model result: `Healthy` / `At Risk` |
| `confidence` | `numeric(5,4)` | model result, 0–1 (e.g. `0.8890`) |
| `recommendation` | `text` | model result |
| `created_at` | `timestamptz` | default `now()` |

> **Storage choice:** store the human-readable inputs (`Urban`, `Yes`, `G2`) here — this is
> what history screens display. The **encoded** values are only used transiently inside
> FastAPI and are not persisted.
> Yes/No fields are stored as `boolean`; the app maps `Yes→true`, `No→false`.

### 2.3 `health_tips`

Global content for the Health tips screen.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | default `gen_random_uuid()` |
| `category` | `text` | e.g. `Nutrition`, `Hydration`, `Iron-rich foods`, `ANC visits` |
| `icon` | `text` NULL | icon name for the UI badge |
| `title` | `text` NULL | optional short title |
| `body` | `text` | the tip text |
| `sort_order` | `int` | display order, default 0 |
| `is_active` | `boolean` | default `true` |
| `created_at` | `timestamptz` | default `now()` |

### 2.4 `maternal_guides`

Global content for the Maternal support screen.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | default `gen_random_uuid()` |
| `title` | `text` | e.g. `Pregnancy guide` |
| `subtitle` | `text` NULL | e.g. `Week-by-week guidance` |
| `icon` | `text` NULL | icon name |
| `body` | `text` NULL | full guide content (markdown/plain) |
| `sort_order` | `int` | default 0 |
| `is_active` | `boolean` | default `true` |
| `created_at` | `timestamptz` | default `now()` |

## 3. Indexes

```sql
create index if not exists idx_predictions_user_created
  on public.predictions (user_id, created_at desc);   -- history & dashboard

create index if not exists idx_health_tips_active_sort
  on public.health_tips (is_active, sort_order);

create index if not exists idx_maternal_guides_active_sort
  on public.maternal_guides (is_active, sort_order);
```

## 4. Dashboard aggregates

The Home dashboard's three metrics are derived from `predictions` for the current user:

```sql
select
  count(*)                                    as total_assessments,
  count(*) filter (where prediction = 'Healthy') as low_risk_cases,
  count(*) filter (where prediction = 'At Risk') as high_risk_cases
from public.predictions
where user_id = auth.uid();
```

Optionally expose this as a Postgres view or an RPC (`get_dashboard_stats`) so the app makes
one call. If you use a view, name it `dashboard_stats` and keep RLS on the base table.

## 5. Create-table DDL

```sql
-- extensions
create extension if not exists pgcrypto;   -- for gen_random_uuid()

-- profiles
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- predictions
create table if not exists public.predictions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade default auth.uid(),
  age                  text,     -- age band (15–19 years / 20–45 years)
  address              text,
  weight_gain          text,
  education            text,
  occupation           text,
  family_type          text,
  parity               text,
  living_with_husband  boolean,
  booked               boolean,
  antenatal_visits     int,
  hemoglobin           numeric(4,1),
  iron_injection       boolean,
  pre_eclampsia        boolean,
  infection            boolean,
  prediction           text,
  confidence           numeric(5,4),
  recommendation       text,
  created_at           timestamptz not null default now()
);

-- content
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
```

> Run **RLS policies from `SUPABASE.md` immediately after** creating these tables. A table
> with RLS enabled but no policies denies all access; a table without RLS is fully exposed.
