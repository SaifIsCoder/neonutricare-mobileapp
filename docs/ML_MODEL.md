# ML_MODEL.md — NeoNutriCare ⭐

> The single source of truth for how the app talks to the model.
> Last updated: 2026-08-07 — **encoders & feature order VERIFIED against the real .pkl files.**

## 0. Verification status

| Item | Status |
|------|--------|
| Model type | ✅ RandomForestClassifier, 14 features, `predict` + `predict_proba` |
| Feature order (`feature_list.pkl`) | ✅ confirmed (see §2 — use exact names) |
| Categorical encoders (`label_encoders.pkl`) | ✅ confirmed (see §3) |
| Numeric vs categorical | ✅ resolved (see §4) |
| Target meaning (0 vs 1) | ✅ **RESOLVED — 0 = At Risk (CAN SCORE B), 1 = Healthy (CAN SCORE A)**; validated at 88.8% on 178 rows |
| scikit-learn version | ⚠️ trained on **1.6.1** — pin this in FastAPI (see §1) |

## 1. Model artifacts

| File | What it is |
|------|-----------|
| `malnutrition_rf_model.pkl` | Trained scikit-learn **RandomForestClassifier** (14 features). |
| `feature_list.pkl` | Ordered list of the **exact column names** the model expects. Build the feature vector from this list, in this order. |
| `label_encoders.pkl` | `dict` of `{column_name: LabelEncoder}` for the **12 categorical** columns. |

> ⚠️ **scikit-learn version:** the model was saved with **scikit-learn 1.6.1**; a 1.8.0
> environment loads it but emits an `InconsistentVersionWarning`. **Pin `scikit-learn==1.6.1`**
> in the FastAPI `requirements.txt` for deployment to avoid subtle behavior differences.

## 2. The 14 input features — CONFIRMED

**Exact model column order** (from `feature_list.pkl`). Note the quirky spellings — the app must
send values keyed to *these exact names* (or build the vector positionally):

| Order | Feature name (as stored) | Type | Send |
|-------|--------------------------|------|------|
| 1 | `AGE` | categorical | `A` or `B` |
| 2 | `ADDRESS` | categorical | `R` or `U` |
| 3 | `WEIGHT` | categorical | `A` or `B` |
| 4 | `EDUCATION` | categorical | `E` or `U` |
| 5 | `OCCUPATION` | categorical | `E` or `U` |
| 6 | `TYPES OF FAMILY` | categorical | `J` or `S` |
| 7 | `PARITY G` | categorical | `G` or `P` |
| 8 | `LIVING WITH HUSBAND` | categorical | `N` or `Y` |
| 9 | `Booked ` | categorical | `B` or `N` | ← **trailing space in the .pkl** |
| 10 | `NUMBER OF ANTI NATIVE VISIT` | **numeric** | integer (e.g. 6) |
| 11 | `HEMOGLOBIN` | **numeric** | float (e.g. 11.5) |
| 12 | `HISTORY OF IRON INJUCTION` | categorical | `YES` or `NO` |
| 13 | `PRE ECLAMPSIA` | categorical | `YES` or `NO` |
| 14 | `INFECTION` | categorical | `YES` or `NO` |

> The names in `feature_list.pkl` contain typos (`ANTI NATIVE VISIT`, `INJUCTION`). Do **not**
> "fix" them in code — they must match what the model was trained on. Safest is to build the
> input row **positionally** from `feature_list.pkl` (see §8) so key spelling never matters.

## 3. Encoding — CONFIRMED (do not guess)

Each categorical value must be a member of that column's `LabelEncoder.classes_`. `LabelEncoder`
assigns integers **alphabetically**, so the integer each code maps to is fixed:

| Feature | UI meaning → code sent | LabelEncoder integer |
|---------|------------------------|----------------------|
| `AGE` | 15–19 years → `A`, 20–45 years → `B` | A=0, B=1 |
| `ADDRESS` | Rural → `R`, Urban → `U` | R=0, U=1 |
| `WEIGHT` (weight gain) | >10 kg → `A`, <10 kg → `B` | A=0, B=1 |
| `EDUCATION` | Educated → `E`, Uneducated → `U` | E=0, U=1 |
| `OCCUPATION` | Employed → `E`, Unemployed → `U` | E=0, U=1 |
| `TYPES OF FAMILY` | Joint → `J`, Nuclear/Single → `S` | J=0, S=1 |
| `PARITY G` | Multigravida → `G`, Primigravida → `P` | G=0, P=1 |
| `LIVING WITH HUSBAND` | No → `N`, Yes → `Y` | N=0, Y=1 |
| `Booked ` | Booked → `B`, Un-booked → `N` | B=0, N=1 | ← trailing space |
| `HISTORY OF IRON INJUCTION` | No → `NO`, Yes → `YES` | NO=0, YES=1 |
| `PRE ECLAMPSIA` | No → `NO`, Yes → `YES` | NO=0, YES=1 |
| `INFECTION` | No → `NO`, Yes → `YES` | NO=0, YES=1 |

> The app sends the **codes** (`A`, `U`, `YES`, …). FastAPI's `encoder.transform([code])`
> produces the integer automatically — the app never sends integers.

## 3b. UI form specification — BUILD THE FORM FROM THIS

Source of truth = the encoding **image** + the **model**. The HTML mockup is **layout/navigation/
visual-style only** — ignore its field values, dropdown options, and input types. The Risk-prediction
form must present exactly these controls, options, and codes:

| # | Field label | Control | Options shown to the user | Code sent to API |
|---|-------------|---------|---------------------------|------------------|
| 1 | Age | dropdown | 15–19 years · 20–45 years | `A` · `B` |
| 2 | Address | dropdown | Rural · Urban | `R` · `U` |
| 3 | Weight gain | dropdown | More than 10 kg · Less than 10 kg | `A` · `B` |
| 4 | Education | dropdown | Educated · Uneducated | `E` · `U` |
| 5 | Occupation | dropdown | Employed · Unemployed | `E` · `U` |
| 6 | Type of family | dropdown | Joint family · Single / nuclear family | `J` · `S` |
| 7 | Parity (gravida) | dropdown | Primigravida · Multigravida | `P` · `G` |
| 8 | Living with husband | dropdown | Yes · No | `Y` · `N` |
| 9 | Booked | dropdown | Booked · Un-booked | `B` · `N` |
| 10 | Number of antenatal visits | number | integer (e.g. 6) | send as-is |
| 11 | Hemoglobin | number (decimal) | e.g. 10.5 g/dL | send as-is |
| 12 | History of iron injection | dropdown | Yes · No | `YES` · `NO` |
| 13 | Pre-eclampsia | dropdown | Yes · No | `YES` · `NO` |
| 14 | Infection | dropdown | Yes · No | `YES` · `NO` |

Rules:
- **12 dropdowns + 2 number inputs.** No free-text fields, no numeric age.
- Store the human-readable option (e.g. `20–45 years`, `Booked`) in Supabase for history;
  send the **code** to `/predict`. Keep this label→code mapping in one client module.

## 4. Numeric vs categorical — RESOLVED

- **Numeric (pass-through, cast to float):** `NUMBER OF ANTI NATIVE VISIT`, `HEMOGLOBIN`.
- **Categorical (encode via `label_encoders`):** the other **12** features.
- `AGE` is **banded** (A/B), **not** a raw number — the form must offer two age *ranges*, not a number box.

## 5. Prediction labels — ✅ RESOLVED

Target column in the training data is **`CAN SCORE`** (CANSCORE — Clinical Assessment of
Nutritional Status). Verified against the source dataset (`CLENDATA.xlsx`, 178 rows):

| CAN SCORE | Numeric score range | Mean | NORMAL cross-tab | Clinical meaning | Model class |
|-----------|---------------------|------|------------------|------------------|-------------|
| **A** | 20–36 | 30.6 | 140/142 = Normal weight | healthy / normal | **1** |
| **B** | 19–26 | 22.4 | 26/36 = Low weight | malnourished / at risk | **0** |

The clinical reading of the score is not in doubt — a higher CANSCORE is better, and
`A` is the healthy group. What was wrong was the **target encoding**: the model was
trained with `A→1, B→0`, the *reverse* of alphabetical `LabelEncoder` order. Assuming
alphabetical order is what previously made this doc read class 0 as Healthy.

**`POSITIVE_IS_MALNUTRITION = False`** — class **0** is the malnutrition/at-risk class.

```python
# FastAPI — CONFIRMED against the training data, do not change:
POSITIVE_IS_MALNUTRITION = False
LABELS = {0: "At Risk", 1: "Healthy"}
```

### How it was verified

`prediction-service/validate_model.py` scores the model over all 178 labelled rows:

| Mapping | Accuracy |
|---------|----------|
| `0 = At Risk, 1 = Healthy` (shipped) | **88.8%** |
| `0 = Healthy, 1 = At Risk` (inverse) | 11.2% — worse than chance, and worse than the 79.8% majority-class baseline |

Two independent checks agree: the `NORMAL` column lines up with class 1 = normal at 82%,
and the archetype probe in §7 has a favourable profile returning class 1 at 66.7%.

Per-class recall on the training data, which matters more than overall accuracy given the
142/36 imbalance:

| Truth | Recall |
|-------|--------|
| At Risk (class 0) | 31/36 = **86.1%** |
| Healthy (class 1) | 127/142 = **89.4%** |

Both classes are caught at a similar rate, so the headline accuracy is not just the
majority class. Still: this is training-set performance with no held-out split, so treat
it as a sanity check on the *label mapping*, not as a generalisation estimate — and never
present the confidence as clinical certainty.

UI labels:
| Model output | API `prediction` string | UI badge | Color |
|-------------|-------------------------|----------|-------|
| Class 1 | `"Healthy"` | "Healthy / Normal" | green |
| Class 0 | `"At Risk"` | "Risk Detected" | amber/red |

## 6. Confidence & recommendation

**Confidence** = probability of the predicted class:

```python
proba = model.predict_proba(X)[0]      # e.g. [0.3326, 0.6674]
idx = int(proba.argmax())
confidence = round(float(proba[idx]), 4)   # 0.6674 → shown as 66.7%
```

**Recommendation** = deterministic text from the resolved label (see `API.md §4`). Always append a
UI-level "screening, not a diagnosis — consult a provider" line.

## 7. Label-determination probe (run this next)

Builds the input **positionally** from `feature_list.pkl`, so the quirky feature names don't matter.

```python
# determine_labels.py
import joblib
model        = joblib.load("model/malnutrition_rf_model.pkl")
feature_list = joblib.load("model/feature_list.pkl")
encoders     = joblib.load("model/label_encoders.pkl")

# 1) Authoritative shortcut: is the target itself encoded?
print("Encoder keys:", list(encoders.keys()))
# If a target-like key exists, its .classes_ is the answer — no probing needed.

def encode(values):                     # values in feature_list order
    row = []
    for col, v in zip(feature_list, values):
        if col in encoders:
            row.append(int(encoders[col].transform([str(v)])[0]))
        else:
            row.append(float(v))
    return row

# order: AGE, ADDRESS, WEIGHT, EDUCATION, OCCUPATION, FAMILY, PARITY,
#        LIVING, BOOKED, ANC_VISITS, HEMOGLOBIN, IRON, PRE_ECLAMPSIA, INFECTION
healthy  = ["B","U","A","E","E","J","P","Y","B", 8, 13.0, "YES","NO", "NO"]
highrisk = ["A","R","B","U","U","S","G","N","N", 0,  7.0, "NO","YES","YES"]

for name, patient in [("HEALTHY  archetype", healthy), ("HIGHRISK archetype", highrisk)]:
    p = model.predict_proba([encode(patient)])[0]
    print(f"{name} -> class {int(model.classes_[p.argmax()])} | P(0)={p[0]:.3f} P(1)={p[1]:.3f}")
```

**Historical note — this probe is superseded by §5.** When run, both archetypes favoured
class 1 (healthy 0.675, high-risk 0.527), so it did *not* cleanly separate and could not
assign the labels on its own. The authoritative answer came from scoring the labelled
dataset instead — see `prediction-service/validate_model.py`, which is the check to run
now. Kept here only because the healthy archetype favouring class 1 was the first hint
that class 1 is Healthy.

## 8. Reference inference pipeline (FastAPI)

Build the vector strictly from `feature_list.pkl`; encode only categorical columns.

> ⚠️ **Trailing space:** `feature_list.pkl` and `label_encoders.pkl` store `'Booked '` (with a
> trailing space). Building positionally (zipping against `FEATURE_LIST`) handles this automatically.
> Any dict lookup by column name must use the **exact** string from the pkl, space included.

> ⚠️ **DataFrame warning:** the model was fitted on a DataFrame, so passing a plain list to
> `predict_proba` emits `UserWarning: X does not have valid feature names`. To suppress it,
> pass `pd.DataFrame([row], columns=FEATURE_LIST)` instead of `[row]`.

```python
import pandas as pd

def to_feature_vector(payload_in_order: list) -> list:
    """payload_in_order is the 14 values already ordered per feature_list.pkl."""
    row = []
    for col, val in zip(FEATURE_LIST, payload_in_order):
        if col in ENCODERS:
            if str(val) not in list(ENCODERS[col].classes_):
                raise ValueError(f"Unknown value '{val}' for '{col}'. Allowed: {list(ENCODERS[col].classes_)}")
            row.append(int(ENCODERS[col].transform([str(val)])[0]))
        else:
            row.append(float(val))
    return row

# When calling predict/predict_proba, wrap in a DataFrame:
# df = pd.DataFrame([to_feature_vector(values)], columns=FEATURE_LIST)
# proba = MODEL.predict_proba(df)[0]
```