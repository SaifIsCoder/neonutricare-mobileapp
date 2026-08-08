# SUPABASE.md — NeoNutriCare ⭐

> Supabase handles **auth, Postgres, storage, and Row Level Security**. It does **not**
> run the ML model — that's FastAPI's job (see `API.md`).
> Last updated: 2026-08-07

## 1. What Supabase is responsible for

- **Authentication:** register, login, JWT sessions, logout.
- **Database:** the tables in `DATABASE.md`.
- **Storage:** avatars (and any future report PDFs).
- **Row Level Security:** each user can only read/write their own rows.

> ⚠️ **Do not** load `malnutrition_rf_model.pkl` in a Supabase **Edge Function**. Edge
> Functions run on Deno and cannot execute Python pickle models. Inference lives in FastAPI.

## 2. Client setup in Expo (latest, SDK 57)

Install the client + storage adapter + URL polyfill:

```bash
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill
```

`lib/supabase.ts`:

```ts
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // required for React Native
  },
});
```

`.env` (loaded via Expo's `EXPO_PUBLIC_` convention):

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
EXPO_PUBLIC_PREDICTION_API_URL=https://YOUR_FASTAPI_HOST
```

> **Keys:** the **publishable** (anon) key is safe to ship in the app — RLS is what protects
> your data. **Never** put the **secret** / service-role key in the app; it bypasses RLS.
> For extra session security you can encrypt the session with `expo-secure-store` + `aes-js`,
> but AsyncStorage is the standard baseline.
> Keep `AsyncStorage` in the JS bundle even under the New Architecture (SDK 57 default).

## 3. Authentication flow

**Register** (screen 4): create the auth user, then a `profiles` row.

```ts
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: { data: { full_name: fullName } }, // available to the profile trigger
});
```

**Login** (screen 3):

```ts
const { data, error } = await supabase.auth.signInWithPassword({ email, password });
```

**Logout** (Profile screen):

```ts
await supabase.auth.signOut();
```

**Session / route protection:** subscribe to auth state and gate the app. With Expo Router,
keep an auth context that redirects unauthenticated users to `/(auth)/login`.

```ts
supabase.auth.getSession().then(({ data }) => setSession(data.session));
const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
// remember: sub.subscription.unsubscribe() on unmount
```

**Auto-create the profile on signup** (recommended — avoids a client round-trip):

```sql
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
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

## 4. Row Level Security (RLS)

Enable RLS on **every** table, then add policies. A table with RLS on and **no** policy
denies everything; a table with RLS **off** is fully open — neither is what you want.

```sql
-- turn RLS on
alter table public.profiles        enable row level security;
alter table public.predictions     enable row level security;
alter table public.health_tips     enable row level security;
alter table public.maternal_guides enable row level security;
```

### 4.1 `profiles` — a user sees and edits only their own profile

```sql
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
```

### 4.2 `predictions` — full CRUD scoped to the owner

```sql
create policy "predictions_select_own"
  on public.predictions for select
  using (auth.uid() = user_id);

create policy "predictions_insert_own"
  on public.predictions for insert
  with check (auth.uid() = user_id);

create policy "predictions_update_own"
  on public.predictions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "predictions_delete_own"
  on public.predictions for delete
  using (auth.uid() = user_id);
```

### 4.3 Content tables — read-only to any signed-in user

```sql
create policy "health_tips_read"
  on public.health_tips for select
  to authenticated
  using (is_active);

create policy "maternal_guides_read"
  on public.maternal_guides for select
  to authenticated
  using (is_active);
```

> Content is inserted/edited from the Supabase dashboard or a seed script (service role),
> so no write policies are exposed to the app.

## 5. Storage

Buckets needed in v1:

| Bucket | Public? | Use |
|--------|---------|-----|
| `avatars` | private | profile pictures |
| `reports` | private | future PDF assessment reports (only if PDF export ships) |

Example policy for the `avatars` bucket (users manage only files under their own folder,
using the convention `avatars/{user_id}/...`):

```sql
create policy "avatars_read_own"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_write_own"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
```

## 6. Relationships summary

```
auth.users (1) ──── (1) profiles          via profiles.id = auth.users.id
auth.users (1) ──── (*) predictions       via predictions.user_id = auth.users.id
health_tips        : global, read-only to authenticated users
maternal_guides    : global, read-only to authenticated users
```

## 7. Seed data (content tables)

Seed a few rows so the Tips and Maternal screens aren't empty (from the mockup copy):

```sql
insert into public.health_tips (category, icon, body, sort_order) values
  ('Nutrition',        'seedling',       'Include leafy greens and lentils daily to support iron levels.', 1),
  ('Hydration',        'droplet',        'Aim for 8–10 glasses of water spread through the day.',          2),
  ('Iron-rich foods',  'drumstick-bite', 'Pair iron sources with vitamin C to improve absorption.',        3),
  ('ANC visits',       'calendar-check', 'Book your next antenatal visit within the recommended window.',  4);

insert into public.maternal_guides (title, subtitle, icon, sort_order) values
  ('Pregnancy guide',  'Week-by-week guidance',   'baby',           1),
  ('Nutrition guide',  'Balanced diet planning',  'carrot',         2),
  ('Exercise guide',   'Safe prenatal exercises', 'dumbbell',       3),
  ('Checkup reminders','Never miss an ANC visit', 'calendar-check', 4);
```

## 8. Setup checklist
1. Create Supabase project; copy Project URL + **publishable** key into `.env`.
2. Run the DDL from `DATABASE.md §5`.
3. Enable RLS and add the policies in §4.
4. Add the `handle_new_user` trigger (§3).
5. Create the `avatars` (and optional `reports`) bucket + storage policies (§5).
6. Seed content tables (§7).
7. Wire the Expo client (§2) and verify login persists across app restarts.
