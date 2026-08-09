# TASKS.md — NeoNutriCare Build Plan

> Ordered, checkable tasks for building NeoNutriCare. Designed to be handed to Claude Code
> one phase at a time. Refs point to the other docs.
> Last updated: 2026-08-08
>
> **Status:** Phases 0–5 and 7 are complete. The app calls the real FastAPI service — no mock
> remains. Two things are left for a self-contained demo: deploy FastAPI (Phase 6) and
> rebuild the Android dev client so sessions persist (Phase 2).

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
- [x] **Target labels CONFIRMED:** 0 = **At Risk** (CAN SCORE B), 1 = **Healthy** (CAN SCORE A).
      `POSITIVE_IS_MALNUTRITION = False`. The model was trained with the target encoded
      `A→1, B→0` — *not* alphabetical `LabelEncoder` order. Verified on all 178 rows of
      `CLENDATA.xlsx` by `prediction-service/validate_model.py`: **88.8%** vs 11.2% inverted.

**Status:** complete. All model contract questions resolved.

---

## Phase 1 — Supabase setup
Ref: `DATABASE.md`, `SUPABASE.md`

> All SQL lives in one idempotent file: `supabase/schema.sql`.

- [x] Create the Supabase project; copy URL + **publishable** key into `.env`.
- [x] Run table DDL (`DATABASE.md §5`) + indexes (`§3`). — all 4 tables answer over REST.
- [x] Enable RLS and add all policies (`SUPABASE.md §4`).
- [x] Add the `handle_new_user` trigger (`SUPABASE.md §3`).
- [x] Create `avatars` bucket + storage policies (`SUPABASE.md §5`). — upload/delete both 200.
- [x] Seed `health_tips` and `maternal_guides` (`SUPABASE.md §7`). — 4 + 4 rows.
- [x] (Optional) create `get_dashboard_stats` RPC/view (`DATABASE.md §4`).
- [ ] Housekeeping: `revoke execute on function public.get_dashboard_stats() from public;`
      Postgres grants EXECUTE to PUBLIC by default, so `anon` can still call it — it returns
      zeros so there is no data leak, but it is not the intent.

**Exit:** ✅ met. Verified with two live accounts: the second user reads 0 of the first
user's predictions and only its own profile row.

---

## Phase 2 — App scaffold & auth
Ref: `SUPABASE.md`, `PRD.md`

> Routes live in `src/app/`, alias `@/*` → `./src/*`. The signed-in group is `(app)`,
> holding a `(tabs)` group plus pushed screens.

- [x] Expo Router structure: `(auth)` group + `(app)/(tabs)` group.
- [x] `npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill`
      (plus `@expo/vector-icons` for the tab icons).
- [x] Add `lib/supabase.ts` and `.env`. → `src/lib/supabase.ts`
- [x] Auth context + session listener; protect the signed-in routes.
      → `src/lib/auth-context.tsx` + `Stack.Protected` in `src/app/_layout.tsx`.
- [x] Screen: **Splash** (1). → template `AnimatedSplashOverlay`, retained.
- [x] Screen: **Onboarding / Welcome** (2).
- [x] Screen: **Register** (4) — trigger-created profile row confirmed live.
- [x] Screen: **Login** (3).
- [x] Logout from Profile → `signOut`.

**Exit:** register / login / logout all work.
- [ ] "Stay logged in across restarts" — NOT yet. The AsyncStorage native module is absent
      from the installed Android build, so `src/lib/session-storage.ts` falls back to
      in-memory storage. Fix: `npx expo run:android` (a Metro restart is not enough).

---

## Phase 3 — Prediction form + mock result
Ref: `ML_MODEL.md §3b`

- [x] Screen: **Risk prediction** form (6) — build from `ML_MODEL.md §3b` (the encoding image),
      **NOT** the mockup's field values. 12 dropdowns + 2 number inputs:
      age (2 ranges), address (Rural/Urban), weight gain (2 bands), education (Educated/Uneducated),
      occupation (Employed/Unemployed), family type (Joint/Nuclear), parity (Primigravida/Multigravida),
      living with husband (Yes/No), booked (Booked/Un-booked), ANC visits (number),
      hemoglobin (decimal), iron injection (Yes/No), pre-eclampsia (Yes/No), infection (Yes/No).
- [x] Client-side validation: all fields required, hemoglobin 4–18, ANC visits 0–20.
- [x] Create the **label → code mapping module** (`ML_MODEL.md §3`). One file, one place.
      e.g. `{ "15–19 years": "A", "20–45 years": "B", "Rural": "R", ... }`
- [x] ~~Mock prediction service~~ — SUPERSEDED. The real FastAPI call landed in Phase 7, so
      no mock exists in the codebase and nothing writes a placeholder label.
- [x] Screen: **Prediction result** (7) — confidence gauge, label badge, contributing factors,
      recommendation text, and **"screening, not a diagnosis"** disclaimer.
      Works with mock data now; will show real results once backend is connected.
- [x] After result, insert a `predictions` row into Supabase (human-readable inputs + real result).

**Exit:** ✅ met — with the real service rather than a mock (see Phase 7).

---

## Phase 4 — Dashboard, records, content screens
Ref: `DATABASE.md`, `PRD.md`

- [x] Screen: **Dashboard / Home** (5) — total / low-risk / high-risk counts from `predictions`,
      quick-action cards (New assessment, Health tips, Records).
- [x] Screen: **Health records** (10) — list user's past assessments, newest first, label badge + date.
      Tapping a record shows its detail.
- [x] Screen: **Health tips** (9) — render from `health_tips` table, grouped by category.
- [x] Screen: **Maternal support** (8) — render from `maternal_guides` table, card list.
- [x] Screen: **Profile** (11) — avatar, full name, edit profile, about app, logout.
- [x] **Bottom tab navigation:** Home · Predict · Records · Tips · Profile.

**Exit:** ✅ met. Every read verified against the live project; empty states present.

---

## Phase 5 — Polish & stubs
- [x] Screen: **AI assistant** (12) — static "Coming soon" stub, no backend.
- [x] Loading skeletons on data screens.
- [~] Error toasts / offline state handling. → inline `ErrorState` with retry on every data
      screen. No toast system and no offline detection.
- [x] Accessibility pass — body text ≥14px, every input labelled, 52px touch targets.
- [~] Review against the mockup's layout / visual style — the mockup is not in this repo, so
      styling follows `src/constants/theme.ts`.

**Exit:** all 12 mockup screens present; the app is visually complete and demo-ready with mock predictions.

---

## Phase 6 — Build prediction backend ✅ UNBLOCKED
Ref: `ML_MODEL.md §5`, `API.md`

> Labels confirmed from `CLENDATA.xlsx`: **0 = At Risk (CAN SCORE B), 1 = Healthy (CAN SCORE A).**

- [x] Labels resolved — `POSITIVE_IS_MALNUTRITION = False` (see Phase 0).
- [x] Scaffold `prediction-service/` with `main.py`, `requirements.txt`.
      `scikit-learn==1.6.1` pinned · `pd.DataFrame` for `predict_proba` · `KEY_MAP` uses
      `"Booked "` with the trailing space · a startup assertion fails fast if `KEY_MAP` and
      `feature_list.pkl` ever diverge.
- [x] Implement `GET /health` and `POST /predict`.
- [x] Test with curl sample; validate against `CLENDATA.xlsx` → 88.8% accuracy, per-class
      recall 86.1% (At Risk) / 89.4% (Healthy).
- [ ] Deploy (Render / Railway / Fly / VM); set `EXPO_PUBLIC_PREDICTION_API_URL`.
      Currently **local only** — `.env` points at `http://localhost:8000`.

**Exit:** partially met — results are verified and correctly labelled, but served locally
rather than from a deployed URL.

---

## Phase 7 — Connect app to real backend
- [x] Replace the mock prediction function with a real `fetch` to FastAPI `/predict`.
      → `src/lib/prediction-api.ts`; `predictions.ts` keeps the predict-then-save ordering.
- [x] Wire error handling (timeout, 422, 5xx) with retry option.
      → `PredictionError` classifies config/network/validation/server/malformed and carries
      `retryable`, so the form hides Retry when re-sending the same answers cannot help.
- [x] Re-save predictions with real labels — no `Pending` rows were ever written, so there
      was nothing to migrate.
- [x] Smoke-test the full flow: form → FastAPI → result → Supabase → history.
      → **32/32 checks pass end to end** using the app's own mapping module: signup, trigger,
      content reads, validation, `POST /predict` (Healthy 0.6674 and At Risk 0.984), insert,
      read-back with label/confidence round-trip, records list, dashboard split (1 low /
      1 high), RLS isolation against a second account, cleanup.

**Exit:** ✅ met for the data path. Not yet exercised by tapping through the UI on a device —
that covers only React rendering and RN's `fetch`; every layer beneath is verified.

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
- [x] A user only ever sees their own data (RLS verified with two live accounts).
- [x] Prediction result matches FastAPI output exactly (round-trip verified).
- [x] Every result/report shows the "screening, not diagnosis" disclaimer (`<Disclaimer />`).
- [x] No secret/service-role keys shipped in the app (publishable key only).
- [x] Model loaded once at FastAPI startup; `scikit-learn` pinned to 1.6.1.
- [x] The prediction form matches `ML_MODEL.md §3b` — verified 12 dropdowns + 2 numbers.