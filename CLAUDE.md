# CLAUDE.md — NeoNutriCare

Project memory for Claude Code. Read `docs/` before building anything.

## What this is
AI-powered **newborn malnutrition risk screening** + maternal support.
- Mobile app: **Expo (React Native)** — **Expo SDK 57 / RN 0.86 / React 19.2**, Expo Router, TypeScript.
- Prediction service: **FastAPI** — loads a scikit-learn Random Forest, one endpoint `POST /predict`.
- Backend: **Supabase** — auth, Postgres, storage, Row Level Security.

## Repo layout
```
neonutricare/
├── CLAUDE.md
├── docs/                 # SOURCE OF TRUTH — read these first
│   ├── PRD.md  DATABASE.md  API.md  ML_MODEL.md  SUPABASE.md  TASKS.md
├── app/                  # Expo app
└── prediction-service/   # FastAPI + model/*.pkl
```

## Golden rules (do not violate)
1. **Source of truth = the encoding image + the model files.** The HTML mockup is **layout /
   navigation / visual style only** — never use its field values, options, or input types.
   The prediction form is defined in `docs/ML_MODEL.md §3b` (12 dropdowns + 2 number inputs).
2. **The ML model runs ONLY in FastAPI.** Never load `.pkl` in a Supabase Edge Function (Deno can't run pickles).
3. **Predict → THEN save.** Call FastAPI `/predict`, then insert the result into Supabase `predictions`.
4. **Pin `scikit-learn==1.6.1`** in the FastAPI service (the model's training version).
5. **Label mapping CONFIRMED:** class 0 = **At Risk** (CAN SCORE B, malnourished),
   class 1 = **Healthy** (CAN SCORE A, normal). `POSITIVE_IS_MALNUTRITION = False`.
   The model was trained with the target encoded `A→1, B→0` — *not* alphabetical
   `LabelEncoder` order. Verified on all 178 rows of `docs/CLENDATA.xlsx` by
   `prediction-service/validate_model.py`: this mapping scores **88.8%**, the inverse **11.2%**.
6. **RLS on every user table.** A user reads/writes only their own rows. Never ship the Supabase
   secret / service-role key in the app — the publishable key + RLS is the client's access.
7. Use the **exact** model column order/names from `feature_list.pkl` (quirky spellings included);
   build the feature vector positionally. FastAPI maps clean API keys → real names via `KEY_MAP`.
   **`Booked ` has a trailing space** in both `feature_list.pkl` and `label_encoders.pkl` — the
   KEY_MAP must use `"Booked "` (with space). Building positionally handles it automatically.
8. Pass a `pd.DataFrame([row], columns=FEATURE_LIST)` to `predict_proba`, not a bare list —
   the model was fitted on a DataFrame and emits a warning otherwise.
8. Always show a "screening, not a diagnosis — consult a provider" disclaimer wherever results appear.

## Build order
**UI-first.** Follow `docs/TASKS.md` phase by phase. The prediction backend (FastAPI) is
**deferred to Phase 6** — it is blocked until the training dataset is provided and the 0/1 label
is resolved. Until then, the app uses a **mock prediction function** that returns a placeholder result.

Phase 1: Supabase → Phase 2: Auth screens → Phase 3: Prediction form + mock result →
Phase 4: Dashboard, records, content → Phase 5: Polish → Phase 6+: backend (when training data arrives).

## Common commands
```bash
# Prediction service
cd prediction-service && pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Expo app
cd app && npx expo start
```

## Env (never commit real values)
- App: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_PREDICTION_API_URL`
- Keep secrets out of the client bundle.