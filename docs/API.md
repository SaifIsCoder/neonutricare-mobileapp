# API.md — NeoNutriCare Prediction Service (FastAPI)

> The FastAPI service has **one job**: run the Random Forest and return a result.
> It does **not** touch the database. All persistence is done by the app against Supabase.
> Last updated: 2026-08-07

## 1. Responsibility

```
POST /predict   → run model, return {prediction, confidence, recommendation}
GET  /health    → liveness/readiness check (is the model loaded?)
```

That's the whole surface. Auth, storage, and history are Supabase's job.

## 2. Endpoints

### `GET /health`

Returns `200` when the model and encoders are loaded.

```json
{ "status": "ok", "model_loaded": true, "n_features": 14 }
```

### `POST /predict`

**Request body** — the 14 features using the **confirmed** codes (`ML_MODEL.md §3`). The app
sends clean keys; FastAPI maps them to the model's real column order. Example (the verified
test patient):

```json
{
  "age": "B",
  "address": "U",
  "weight_gain": "A",
  "education": "E",
  "occupation": "E",
  "family_type": "J",
  "parity": "G",
  "living_with_husband": "Y",
  "booked": "B",
  "antenatal_visits": 6,
  "hemoglobin": 11.5,
  "iron_injection": "YES",
  "pre_eclampsia": "NO",
  "infection": "NO"
}
```

> Codes: `age` A=15–19 / B=20–45 · `weight_gain` A=>10kg / B=<10kg · `education` E=Educated / U=Uneducated ·
> `occupation` E=Employed / U=Unemployed · `family_type` J=Joint / S=Nuclear · `parity` P=Primigravida / G=Multigravida ·
> `booked` B=Booked / N=Un-booked · Yes/No fields for iron/pre-eclampsia/infection use `YES`/`NO`.

**Success `200`** — the actual response for the request above, from the running service:

```json
{
  "prediction": "Healthy",
  "confidence": 0.6674,
  "recommendation": "Results look reassuring. Continue iron-rich meals and keep all antenatal visits on schedule. Recheck hemoglobin in 4 weeks."
}
```

> The earlier `0.889` in this doc was illustrative, not measured. This patient's real
> confidence is **0.6674** — `P(class 1) = 0.6674`, class 1 being Healthy (`ML_MODEL.md §5`).

**Validation error `422`** (bad/missing field, or a categorical value the encoder never saw):

```json
{ "detail": "Unknown value 'M' for feature 'education'. Allowed: ['E','U']" }
```

## 3. Contract rules

- Request keys must be **exactly** the 14 keys in the table (`ML_MODEL.md §2`).
- Categorical values must be members of each column's `LabelEncoder.classes_`.
- `confidence` is always a float in `[0, 1]`; the app renders the percentage.
- `prediction` is always one of the human-readable labels (`Healthy` / `At Risk`).
- The service is **stateless** — no DB writes, no session. CORS allows the app origin(s).

## 4. Reference implementation

```python
# main.py  — FastAPI prediction service
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Union
import joblib
import pandas as pd

app = FastAPI(title="NeoNutriCare Prediction API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten to your app's domains in production
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# ---- load once at startup ----
MODEL        = joblib.load("model/malnutrition_rf_model.pkl")
FEATURE_LIST = joblib.load("model/feature_list.pkl")   # real column order & names
ENCODERS     = joblib.load("model/label_encoders.pkl")  # {col: LabelEncoder}

# The model's real column names have quirky spellings. Map clean API keys -> real names.
KEY_MAP = {
    "age": "AGE",
    "address": "ADDRESS",
    "weight_gain": "WEIGHT",
    "education": "EDUCATION",
    "occupation": "OCCUPATION",
    "family_type": "TYPES OF FAMILY",
    "parity": "PARITY G",
    "living_with_husband": "LIVING WITH HUSBAND",
    "booked": "Booked ",          # trailing space — matches the real pkl key exactly
    "antenatal_visits": "NUMBER OF ANTI NATIVE VISIT",
    "hemoglobin": "HEMOGLOBIN",
    "iron_injection": "HISTORY OF IRON INJUCTION",
    "pre_eclampsia": "PRE ECLAMPSIA",
    "infection": "INFECTION",
}

# ✅ CONFIRMED: CAN SCORE B=0=At Risk, A=1=Healthy. The model was trained with the
# target encoded A->1, B->0 — NOT alphabetical LabelEncoder order. Validated at 88.8%
# over all 178 rows of CLENDATA.xlsx by prediction-service/validate_model.py; the
# inverse scores 11.2%. See ML_MODEL.md §5.
POSITIVE_IS_MALNUTRITION = False
LABELS = ({0: "Healthy", 1: "At Risk"} if POSITIVE_IS_MALNUTRITION
          else {0: "At Risk", 1: "Healthy"})


class PredictIn(BaseModel):
    age: Union[int, str]
    address: str
    weight_gain: str
    education: str
    occupation: str
    family_type: str
    parity: str
    living_with_husband: str
    booked: str
    antenatal_visits: Union[int, str]
    hemoglobin: Union[float, str]
    iron_injection: str
    pre_eclampsia: str
    infection: str


def to_feature_vector(payload: dict) -> list:
    # re-key clean API payload -> real model column names
    by_real = {KEY_MAP[k]: v for k, v in payload.items() if k in KEY_MAP}
    row = []
    for col in FEATURE_LIST:                      # strict order from feature_list.pkl
        if col not in by_real:
            raise HTTPException(422, f"Missing feature '{col}'")
        val = str(by_real[col])
        if col in ENCODERS:                       # categorical → encode
            enc = ENCODERS[col]
            if val not in list(enc.classes_):
                raise HTTPException(
                    422,
                    f"Unknown value '{val}' for feature '{col}'. "
                    f"Allowed: {list(enc.classes_)}",
                )
            row.append(int(enc.transform([val])[0]))
        else:                                     # numeric → cast
            try:
                row.append(float(val))
            except (TypeError, ValueError):
                raise HTTPException(422, f"Feature '{col}' must be numeric, got '{val}'")
    return row


def build_recommendation(label: str, features: dict) -> str:
    if label == "Healthy":
        rec = ("Results look reassuring. Continue iron-rich meals and keep all antenatal "
               "visits on schedule. Recheck hemoglobin in 4 weeks.")
    else:
        rec = ("Screening suggests elevated risk. Please consult a healthcare provider "
               "promptly. Prioritize antenatal visits and iron/folate supplementation.")
    try:
        if float(features.get("hemoglobin", 99)) < 11:
            rec += " Hemoglobin is low — discuss anemia management with your provider."
    except (TypeError, ValueError):
        pass
    return rec


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": MODEL is not None,
            "n_features": len(FEATURE_LIST)}


@app.post("/predict")
def predict(body: PredictIn):
    features = body.model_dump()
    row = to_feature_vector(features)
    df = pd.DataFrame([row], columns=FEATURE_LIST)   # avoids feature-name warning

    proba = MODEL.predict_proba(df)[0]
    idx = int(proba.argmax())
    raw_class = int(MODEL.classes_[idx])          # 0 or 1
    label = LABELS.get(raw_class, str(raw_class))
    confidence = round(float(proba[idx]), 4)

    return {
        "prediction": label,
        "confidence": confidence,
        "recommendation": build_recommendation(label, features),
    }
```

## 5. Project layout & running

```
prediction-service/
├── main.py
├── requirements.txt
└── model/
    ├── malnutrition_rf_model.pkl
    ├── feature_list.pkl
    └── label_encoders.pkl
```

`requirements.txt`:

```
fastapi
uvicorn[standard]
scikit-learn==1.6.1   # CONFIRMED training version — do not use 1.8.x for deployment
joblib
numpy
pandas
pydantic>=2
```

> ⚠️ **The model was trained with scikit-learn 1.6.1** (confirmed via the load warning). A 1.8.0
> environment loads it but raises `InconsistentVersionWarning`; pin **1.6.1** so behavior matches
> training exactly.

Run locally:

```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
# docs at http://localhost:8000/docs
```

Test:

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"age":"B","address":"U","weight_gain":"A","education":"E","occupation":"E","family_type":"J","parity":"G","living_with_husband":"Y","booked":"B","antenatal_visits":6,"hemoglobin":11.5,"iron_injection":"YES","pre_eclampsia":"NO","infection":"NO"}'
```

## 6. App-side call + save (order matters)

```ts
// services/prediction.ts
const API_URL = process.env.EXPO_PUBLIC_PREDICTION_API_URL!; // e.g. https://api.neonutricare.app

export async function runPrediction(input: PredictInput) {
  const res = await fetch(`${API_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Prediction failed (${res.status})`);
  }
  return res.json() as Promise<{
    prediction: "Healthy" | "At Risk";
    confidence: number;
    recommendation: string;
  }>;
}
```

```ts
// 1) predict, THEN 2) persist to Supabase
const result = await runPrediction(mappedInput);
await supabase.from("predictions").insert({
  ...rawFormValues,               // human-readable inputs for history
  prediction: result.prediction,
  confidence: result.confidence,
  recommendation: result.recommendation,
  // user_id defaults to auth.uid() via the column default + RLS
});
```

## 7. Deployment notes
- Host FastAPI anywhere that runs Python (Render, Railway, Fly.io, a VM, or a container).
- Load the model **once** at startup, not per request.
- Set a request timeout on the client (e.g. 10 s) and show a retry on failure.
- Restrict CORS `allow_origins` to your real app domains before launch.
- Keep the service **stateless**; scale horizontally if needed.