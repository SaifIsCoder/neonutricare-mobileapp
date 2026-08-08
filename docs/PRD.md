# PRD.md — NeoNutriCare

> Product Requirements Document
> Last updated: 2026-08-07

## 1. Overview

**NeoNutriCare** is a mobile app that screens for **newborn malnutrition risk** using
a trained Random Forest model, and supports mothers with maternal-health guidance.
A user fills a 14-field maternal/clinical form, the app sends it to a prediction
service, and returns a risk label, a confidence score, and a plain-language
recommendation. Every assessment is saved to the user's history.

- **Platform:** iOS + Android (React Native / Expo).
- **Users:** mothers / caregivers, and community health workers.
- **Core value:** early, low-friction malnutrition-risk screening + trustworthy maternal support.

> ⚠️ **Medical disclaimer.** NeoNutriCare is a **screening/decision-support tool, not a
> diagnosis.** Every result screen and report must display a disclaimer advising the user
> to consult a qualified healthcare provider. The model output must never be presented as
> a clinical diagnosis.

## 2. Goals & non-goals

**Goals**
- Let an authenticated user run a malnutrition-risk assessment in under 2 minutes.
- Return a clear result: label + confidence % + recommendation.
- Persist every assessment and let users browse their history.
- Provide static maternal-support content (guides + health tips).

**Non-goals (v1)**
- The AI chat assistant is **"Coming soon"** — stub screen only, no backend.
- No PDF export in v1 unless time permits (button may be present but disabled).
- No multi-language support in v1 (design copy so it can be added later).
- No provider/clinician dashboard.

## 3. Tech stack (use latest — verified 2026-08-07)

| Layer | Choice | Version / notes |
|-------|--------|-----------------|
| Mobile app | **Expo (React Native)** | **Expo SDK 57**, React Native **0.86**, React **19.2**. New Architecture is always-on in SDK 55+. |
| Routing | **Expo Router** (file-based) | Ships with SDK 57. |
| Language | **TypeScript** | Strict mode. |
| Auth + DB + Storage | **Supabase** | `@supabase/supabase-js` v2. Auth, Postgres, Storage, Row Level Security. |
| Prediction service | **FastAPI** (Python) | Loads the `.pkl` model, exposes `POST /predict` only. |
| ML | **scikit-learn Random Forest** | `malnutrition_rf_model.pkl`, `feature_list.pkl`, `label_encoders.pkl`. |

> **Scaffold note:** during the SDK 57 transition, `create-expo-app@latest` without a
> template still creates an **SDK 54** project. To get SDK 57 explicitly, use:
> `npx create-expo-app@latest neonutricare --template default@sdk-57`
> Use an SDK 54 project instead **only** if you must run on physical devices via Expo Go.
> See `SUPABASE.md` and `API.md` for exact install commands.

## 4. Architecture

```
React Native (Expo)
        │
        ├──────────────► Supabase  (auth, Postgres, storage, RLS)
        │                   ▲
        │                   │ 3. save result (authenticated insert)
        │
        └──────────────► FastAPI  POST /predict
                            │
                            ├── malnutrition_rf_model.pkl
                            ├── feature_list.pkl
                            └── label_encoders.pkl
```

**Prediction flow (must be implemented in this order):**

1. User fills the 14-field form in the app.
2. App calls **FastAPI `POST /predict`** with the form values.
3. FastAPI encodes inputs, runs the Random Forest, returns `{prediction, confidence, recommendation}`.
4. App **then** writes the inputs + result to Supabase `predictions` (tied to `auth.uid()`).
5. History / Records screen reads from Supabase.

> **Design rule:** the ML model runs **only** in FastAPI. Do **not** try to load
> the `.pkl` inside a Supabase Edge Function — Edge Functions run on Deno and cannot
> execute Python pickle models.

## 5. Screens (from the approved mockup — 12 total)

> **The mockup is layout / navigation / visual-style only.** For anything data-related — the
> prediction form's fields, options, input types, and codes — the **source of truth is the
> encoding image + the model files**, specified in `ML_MODEL.md §2, §3, §3b`. Where the mockup
> and the model disagree (e.g. numeric age, three weight categories, free-text occupation), the
> **model wins**.

| # | Screen | Purpose | Data source |
|---|--------|---------|-------------|
| 1 | Splash | Branding / boot | — |
| 2 | Onboarding / Welcome | Value prop, "Get started" | — |
| 3 | Login | Email + password | Supabase Auth |
| 4 | Register | Full name, email, password | Supabase Auth + `profiles` |
| 5 | Dashboard (Home) | Stats (total / low-risk / high-risk), quick actions | `predictions` aggregates |
| 6 | Risk prediction | 14-field form → Predict | FastAPI |
| 7 | Prediction result | Confidence gauge, label badge, factors, recommendation | FastAPI response |
| 8 | Maternal support | List of guides (pregnancy, nutrition, exercise, checkups) | `maternal_guides` |
| 9 | Health tips | Categorized tips (nutrition, hydration, iron, ANC) | `health_tips` |
| 10 | Health records | List of past assessments with label badges | `predictions` |
| 11 | Profile | Avatar, name, edit profile, about, logout | `profiles` |
| 12 | AI assistant | **"Coming soon"** stub | — |

**Bottom navigation tabs:** Home · Predict · Records · Tips · Profile.

## 6. Functional requirements

**Auth**
- FR-1 Register with full name, email, password; create a `profiles` row on signup.
- FR-2 Login with email + password (Supabase JWT session, persisted across launches).
- FR-3 Logout clears the session.
- FR-4 Unauthenticated users can only reach Splash/Onboarding/Login/Register.

**Prediction**
- FR-5 The form collects exactly the **14 features** defined in `ML_MODEL.md`.
- FR-6 Client validates required fields and numeric ranges before submitting.
- FR-7 App calls `POST /predict`; on success shows the Result screen.
- FR-8 After a successful prediction, app inserts a `predictions` row for the current user.
- FR-9 Handle FastAPI errors gracefully (timeout, 422 validation, 5xx) with a retry option.

**History / Dashboard**
- FR-10 Records screen lists the user's assessments, newest first, with label + date.
- FR-11 Dashboard shows counts: total, low-risk (Healthy), high-risk (At Risk).

**Content**
- FR-12 Health tips and maternal guides render from Supabase tables (seedable).

## 7. Non-functional requirements

- **Security:** RLS on every user table; a user reads/writes only their own rows (see `SUPABASE.md`).
- **Secrets:** Supabase publishable key in the app is fine (RLS protects data). Never ship the
  Supabase **secret** key or any service-role key in the app.
- **Performance:** `/predict` p95 < 1.5 s under normal load; model loaded once at FastAPI startup.
- **Offline:** app degrades gracefully with a clear "no connection" state.
- **Accessibility:** min 14px body text, sufficient contrast, labeled inputs.

## 8. Success metrics
- Time to complete an assessment (target < 2 min).
- Prediction success rate (share of `/predict` calls returning 200).
- Assessments saved per active user.
- Crash-free sessions > 99%.

## 9. Open questions / status
- ✅ **Encoding scheme** — CONFIRMED against `label_encoders.pkl` (`ML_MODEL.md §3`).
- ✅ **Feature order** — CONFIRMED (`ML_MODEL.md §2`). `age` and `weight_gain` are **banded categoricals**;
  only `hemoglobin` and `antenatal_visits` are numeric.
- ✅ **scikit-learn version** — CONFIRMED **1.6.1**; pinned in FastAPI.
- ✅ **Target meaning (0 vs 1)** — CONFIRMED from `CLENDATA.xlsx`: class **0 = At Risk /
  Malnourished** (CAN SCORE B), class **1 = Healthy** (CAN SCORE A).
  `POSITIVE_IS_MALNUTRITION = False`. The model was trained with the target encoded
  `A→1, B→0`, *not* alphabetical `LabelEncoder` order — an earlier revision of this doc
  assumed the latter and had the mapping backwards. Validated at **88.8%** over all 178
  rows by `prediction-service/validate_model.py` (the inverse scores 11.2%, worse than
  chance). See `ML_MODEL.md §5`.
- ⚠️ **Model quality** — recall is balanced across both classes (At Risk 86.1%, Healthy
  89.4%), so the 88.8% is not just the majority class. But that is **training-set**
  performance with no held-out split, so it validates the label mapping rather than
  generalisation. Never present confidence as clinical certainty.
- ⬜ Whether PDF export ships in v1.

> ⚠️ **UI correction:** the mockup's Risk-prediction form (screen 6) does **not** match the real model
> (it shows a numeric age, three weight categories, four education levels, free-text occupation).
> The form must be rebuilt to the confirmed schema: age as two **ranges**, weight *gain* as two bands,
> Educated/Uneducated, Employed/Unemployed, Joint/Nuclear, Primigravida/Multigravida, Yes/No fields.
> See `ML_MODEL.md §2–§3`.