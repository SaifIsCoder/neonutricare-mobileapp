"""NeoNutriCare prediction service.

One job: run the Random Forest and return a result. No database, no session
state — the app persists results to Supabase itself (docs/API.md §1).

Refs: docs/API.md §4, docs/ML_MODEL.md §2–§8, CLAUDE.md golden rules 2, 4, 5, 7, 8.
"""

from pathlib import Path
from typing import Union

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="NeoNutriCare Prediction API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to the app's real domains before launch
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------- model load
# Loaded once at import, not per request. Paths are resolved relative to this
# file so the service runs correctly from any working directory.
MODEL_DIR = Path(__file__).parent / "model"

MODEL = joblib.load(MODEL_DIR / "malnutrition_rf_model.pkl")
FEATURE_LIST: list[str] = joblib.load(MODEL_DIR / "feature_list.pkl")
ENCODERS: dict = joblib.load(MODEL_DIR / "label_encoders.pkl")

# Clean API keys -> the model's real column names, which contain typos
# ("ANTI NATIVE", "INJUCTION") and a trailing space on "Booked ". Do not "fix"
# them: they must match what the model was trained on.
KEY_MAP = {
    "age": "AGE",
    "address": "ADDRESS",
    "weight_gain": "WEIGHT",
    "education": "EDUCATION",
    "occupation": "OCCUPATION",
    "family_type": "TYPES OF FAMILY",
    "parity": "PARITY G",
    "living_with_husband": "LIVING WITH HUSBAND",
    "booked": "Booked ",  # trailing space is real — see CLAUDE.md rule 7
    "antenatal_visits": "NUMBER OF ANTI NATIVE VISIT",
    "hemoglobin": "HEMOGLOBIN",
    "iron_injection": "HISTORY OF IRON INJUCTION",
    "pre_eclampsia": "PRE ECLAMPSIA",
    "infection": "INFECTION",
}

# Fail at startup rather than returning wrong numbers at runtime: a typo in
# KEY_MAP would otherwise surface as a confusing "Missing feature" 422, and a
# whitespace slip on "Booked " is invisible in a diff.
_mapped = set(KEY_MAP.values())
_expected = set(FEATURE_LIST)
if _mapped != _expected:
    raise RuntimeError(
        "KEY_MAP does not match feature_list.pkl.\n"
        f"  missing from KEY_MAP: {sorted(_expected - _mapped)!r}\n"
        f"  not in feature_list:  {sorted(_mapped - _expected)!r}"
    )

# Label meaning — RESOLVED against the training data (CLAUDE.md rule 5).
#
#     class 0 = At Risk (CAN SCORE B, malnourished)
#     class 1 = Healthy (CAN SCORE A, normal)
#
# The model was trained with the target encoded A->1, B->0 — NOT the alphabetical
# LabelEncoder order that the docs originally assumed. Verified by
# `validate_model.py` over all 178 labelled rows in docs/CLENDATA.xlsx:
# this mapping scores 88.8%, the inverse scores 11.2%.
#
# This is the single flag that encodes it. Re-run validate_model.py after any
# change to the model files.
POSITIVE_IS_MALNUTRITION = False
LABELS = (
    {0: "Healthy", 1: "At Risk"}
    if POSITIVE_IS_MALNUTRITION
    else {0: "At Risk", 1: "Healthy"}
)


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


def to_feature_row(payload: dict) -> list:
    """Build the model input **positionally** from feature_list.pkl.

    Iterating FEATURE_LIST rather than the payload means the quirky column
    names and their order can never drift out of sync with the model.
    """
    by_real = {KEY_MAP[key]: value for key, value in payload.items() if key in KEY_MAP}

    row = []
    for col in FEATURE_LIST:
        if col not in by_real:
            raise HTTPException(422, f"Missing feature '{col}'")

        raw = by_real[col]

        if col in ENCODERS:  # categorical -> encode
            encoder = ENCODERS[col]
            value = str(raw)
            allowed = [str(cls) for cls in encoder.classes_]
            if value not in allowed:
                raise HTTPException(
                    422,
                    f"Unknown value '{value}' for feature '{col}'. Allowed: {allowed}",
                )
            row.append(int(encoder.transform([value])[0]))
        else:  # numeric -> cast
            try:
                row.append(float(raw))
            except (TypeError, ValueError):
                raise HTTPException(422, f"Feature '{col}' must be numeric, got '{raw}'")

    return row


def build_recommendation(label: str, features: dict) -> str:
    if label == "Healthy":
        rec = (
            "Results look reassuring. Continue iron-rich meals and keep all antenatal "
            "visits on schedule. Recheck hemoglobin in 4 weeks."
        )
    else:
        rec = (
            "Screening suggests elevated risk. Please consult a healthcare provider "
            "promptly. Prioritize antenatal visits and iron/folate supplementation."
        )

    try:
        if float(features.get("hemoglobin", 99)) < 11:
            rec += " Hemoglobin is low — discuss anemia management with your provider."
    except (TypeError, ValueError):
        pass

    return rec


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": MODEL is not None,
        "n_features": len(FEATURE_LIST),
    }


@app.post("/predict")
def predict(body: PredictIn):
    features = body.model_dump()
    row = to_feature_row(features)

    # A DataFrame, not a bare list: the model was fitted with feature names and
    # warns "X does not have valid feature names" otherwise (CLAUDE.md rule 8).
    frame = pd.DataFrame([row], columns=FEATURE_LIST)

    proba = MODEL.predict_proba(frame)[0]
    idx = int(proba.argmax())
    raw_class = int(MODEL.classes_[idx])
    label = LABELS.get(raw_class, str(raw_class))

    return {
        "prediction": label,
        "confidence": round(float(proba[idx]), 4),
        "recommendation": build_recommendation(label, features),
    }
