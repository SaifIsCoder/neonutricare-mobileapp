# TASKS.md — NeoNutriCare Build Plan

> Ordered, checkable tasks for building NeoNutriCare. Designed to be handed to Claude Code
> one phase at a time. Refs point to the other docs.
> Last updated: 2026-08-07
>
> **Strategy: UI-first.** Build the full app UI, auth, Supabase, and form now.
> The prediction backend (FastAPI) is deferred until the training dataset is provided
> and the 0/1 label question is resolved. The app uses **mock predictions** until then.

## Conventions
- Stack: **Expo SDK 57 / RN 0.86 / React 19.2 / TypeScript / Expo Router**, Supabase, FastAPI.
- Do phases in order. Each phase has exit criteria — finish them before moving on.
- `[ ]` = todo, `[~]` = in progress, `[x]` = done.

---

## Phase 0 — Model contract ✅ COMPLETE
Ref: `ML_MODEL.md`

- [x] Verify model type, feature count, `predict` / `predict_proba`.
- [x] Record the exact `feature_list.pkl` column order (14, with quirky names).
- [x] Record each categorical column's `classes_`; update `ML_MODEL.md §3` — confirmed.
- [x] Resolve numeric vs categorical: only `HEMOGLOBIN` + `NUMBER OF ANTI NATIVE VISIT` numeric.
- [x] Note scikit-learn training version → **1.6.1**, pinned in FastAPI.
- [x] `Booked ` trailing space documented.
- [x] **Target labels CONFIRMED:** 0 = Healthy (CAN SCORE A), 1 = At Risk (CAN SCORE B).
      Source: `CLENDATA.xlsx` training dataset. `POSITIVE_IS_MALNUTRITION = True`.

**Status:** complete. All model contract questions resolved.

---

## Phase 1 — Supabase setup
Ref: `DATABASE.md`, `SUPABASE.md`

- [ ] Create the Supabase project; copy URL + **publishable** key into `.env`.
- [ ] Run table DDL (`DATABASE.md §5`) + indexes (`§3`).
- [ ] Enable RLS and add all policies (`SUPABASE.md §4`).
- [ ] Add the `handle_new_user` trigger (`SUPABASE.md §3`).
- [ ] Create `avatars` bucket + storage policies (`SUPABASE.md §5`).
- [ ] Seed `health_tips` and `maternal_guides` (`SUPABASE.md §7`).
- [ ] (Optional) create `get_dashboard_stats` RPC/view (`DATABASE.md §4`).

**Exit:** tables exist, RLS verified (a test user can't read another user's rows), seed data in.

---

## Phase 2 — App scaffold & auth
Ref: `SUPABASE.md`, `PRD.md`

- [ ] Expo app is already scaffolded (SDK 57). Set up **Expo Router** file structure:
      `(auth)` group (login, register, onboarding) + `(tabs)` group (home, predict, records, tips, profile).
- [ ] `npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill`
- [ ] Add `lib/supabase.ts` and `.env` (`SUPABASE.md §2`).
- [ ] Build an auth context + session listener; protect `(tabs)` routes.
- [ ] Screen: **Splash** (1).
- [ ] Screen: **Onboarding / Welcome** (2) — value prop, "Get started" button.
- [ ] Screen: **Register** (4) → `signUp` → profile row auto-created by trigger.
- [ ] Screen: **Login** (3) → `signInWithPassword`.
- [ ] Logout from Profile → `signOut` → redirect to Login.

**Exit:** a user can register, log in, stay logged in across restarts, and log out.

---

## Phase 3 — Prediction form + mock result
Ref: `ML_MODEL.md §3b`

- [ ] Screen: **Risk prediction** form (6) — build from `ML_MODEL.md §3b` (the encoding image),
      **NOT** the mockup's field values. 12 dropdowns + 2 number inputs:
      age (2 ranges), address (Rural/Urban), weight gain (2 bands), education (Educated/Uneducated),
      occupation (Employed/Unemployed), family type (Joint/Nuclear), parity (Primigravida/Multigravida),
      living with husband (Yes/No), booked (Booked/Un-booked), ANC visits (number),
      hemoglobin (decimal), iron injection (Yes/No), pre-eclampsia (Yes/No), infection (Yes/No).
- [ ] Client-side validation: all fields required, hemoglobin 4–18, ANC visits 0–20.
- [ ] Create the **label → code mapping module** (`ML_MODEL.md §3`). One file, one place.
      e.g. `{ "15–19 years": "A", "20–45 years": "B", "Rural": "R", ... }`
- [ ] **Mock prediction service** — a local function that returns a placeholder result:
      `{ prediction: "Healthy", confidence: 0.85, recommendation: "Mock result — prediction service not connected yet." }`
      Uses the confirmed labels (Healthy / At Risk). Will be replaced by real FastAPI call in Phase 7.
- [ ] Screen: **Prediction result** (7) — confidence gauge, label badge, contributing factors,
      recommendation text, and **"screening, not a diagnosis"** disclaimer.
      Works with mock data now; will show real results once backend is connected.
- [ ] After result, insert a `predictions` row into Supabase (human-readable inputs + mock result).

**Exit:** form → mock predict → result screen → row saved to Supabase, for the logged-in user.

---

## Phase 4 — Dashboard, records, content screens
Ref: `DATABASE.md`, `PRD.md`

- [ ] Screen: **Dashboard / Home** (5) — total / low-risk / high-risk counts from `predictions`,
      quick-action cards (New assessment, Health tips, Records).
- [ ] Screen: **Health records** (10) — list user's past assessments, newest first, label badge + date.
      Tapping a record shows its detail.
- [ ] Screen: **Health tips** (9) — render from `health_tips` table, grouped by category.
- [ ] Screen: **Maternal support** (8) — render from `maternal_guides` table, card list.
- [ ] Screen: **Profile** (11) — avatar, full name, edit profile, about app, logout.
- [ ] **Bottom tab navigation:** Home · Predict · Records · Tips · Profile.

**Exit:** all data screens read live data from Supabase through RLS. Empty states for no-data cases.

---

## Phase 5 — Polish & stubs
- [ ] Screen: **AI assistant** (12) — static **"Coming soon"** stub, no backend.
- [ ] Loading skeletons on data screens.
- [ ] Error toasts / offline state handling.
- [ ] Accessibility pass (contrast, font sizes ≥14px, labeled inputs).
- [ ] Review all screens against the mockup's **layout and visual style**.

**Exit:** all 12 mockup screens present; the app is visually complete and demo-ready with mock predictions.

---

## Phase 6 — Build prediction backend ✅ UNBLOCKED
Ref: `ML_MODEL.md §5`, `API.md`

> Labels confirmed from `CLENDATA.xlsx`: **0 = Healthy (CAN SCORE A), 1 = At Risk (CAN SCORE B).**

- [x] Labels resolved — `POSITIVE_IS_MALNUTRITION = True`.
- [ ] Scaffold `prediction-service/` with `main.py`, `requirements.txt` (`API.md §4–§5`).
      Pin `scikit-learn==1.6.1`. Use `pd.DataFrame` for `predict_proba`. `KEY_MAP` with `"Booked "` trailing space.
- [ ] Implement `GET /health` and `POST /predict`.
- [ ] Test with curl sample; validate against known-outcome records from `CLENDATA.xlsx`.
- [ ] Deploy (Render / Railway / Fly / VM); set `EXPO_PUBLIC_PREDICTION_API_URL`.

**Exit:** `POST /predict` returns verified, correctly-labeled results from a deployed URL.

---

## Phase 7 — Connect app to real backend
- [x] Replace the mock prediction function with a real `fetch` to FastAPI `/predict`.
      → `src/lib/prediction-api.ts`; `predictions.ts` keeps the predict-then-save ordering.
- [x] Wire error handling (timeout, 422, 5xx) with retry option.
      → `PredictionError` classifies config/network/validation/server/malformed and carries
      `retryable`, so the form hides Retry when re-sending the same answers cannot help.
- [~] Re-save predictions with real labels (update any "Pending" rows if needed).
      → no `Pending` rows were ever written (no session existed), so nothing to migrate.
      The result screen still explains the placeholder if one is ever found.
- [~] Smoke-test the full flow: form → FastAPI → result → Supabase → history.
      → verified up to the network boundary: the app's own mapper output is byte-identical to
      the API.md sample and returns Healthy 0.6674 / At Risk 0.984 from the live service, and
      all 17 insert columns exist. The in-app tap-through is still blocked on "Confirm email".

**Exit:** end-to-end real predictions working.
→ Blocked on the Supabase **Confirm email** toggle: signup creates a user but returns no
  session, and sign-in fails `email_not_confirmed`, so no signed-in run has been possible.

---

## Phase 8 — Release prep
- [ ] EAS Build config (`eas.json`) for Android + iOS.
- [ ] App icons / splash assets.
- [ ] Environment separation (dev vs prod Supabase + API URLs).
- [ ] Tighten CORS on FastAPI to real domains.
- [ ] Confirm no secret/service-role keys in the app bundle.
- [ ] Smoke-test on physical device.
- [ ] Confirm the medical disclaimer appears wherever results are shown.

---

## Cross-cutting definition of done
- [ ] A user only ever sees their own data (RLS verified with two accounts).
- [ ] Prediction result matches FastAPI output exactly (label + confidence).
- [ ] Every result/report shows the "screening, not diagnosis" disclaimer.
- [ ] No secret/service-role keys shipped in the app.
- [ ] Model loaded once at FastAPI startup; `scikit-learn` pinned to 1.6.1.
- [ ] The prediction form matches `ML_MODEL.md §3b` — NOT the mockup's field values.