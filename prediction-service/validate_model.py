"""Validate the served label mapping against the training dataset.

Completes the TASKS.md Phase 6 item "validate against known-outcome records
from CLENDATA.xlsx". Run from prediction-service/:

    .venv/Scripts/python.exe validate_model.py

Expected: ~88.8% for the shipped mapping, ~11.2% for the inverse.
"""

import pandas as pd

from main import ENCODERS, FEATURE_LIST, LABELS, MODEL, POSITIVE_IS_MALNUTRITION

DATA = "../docs/CLENDATA.xlsx"
TARGET = "CAN SCORE"

# CONFIRMED target encoding. The model was trained with A->1, B->0, which is the
# reverse of what an alphabetical LabelEncoder would produce — that mistaken
# assumption is what made the docs read class 0 as Healthy.
TRUTH_MAP = {"A": 1, "B": 0}

df = pd.read_excel(DATA)
print(f"rows: {len(df)}")
print(f"{TARGET} value counts:\n{df[TARGET].value_counts().to_string()}\n")
print(f"target encoding: {TRUTH_MAP}  (A = CAN SCORE A = normal)")
print(f"POSITIVE_IS_MALNUTRITION = {POSITIVE_IS_MALNUTRITION}  ->  {LABELS}\n")

truth = df[TARGET].astype(str).str.strip().map(TRUTH_MAP)
usable = truth.notna()
print(f"rows with a usable target: {int(usable.sum())}\n")

rows = []
for _, record in df[usable].iterrows():
    row = []
    for col in FEATURE_LIST:
        value = record[col]
        if col in ENCODERS:
            row.append(int(ENCODERS[col].transform([str(value).strip()])[0]))
        else:
            row.append(float(value))
    rows.append(row)

X = pd.DataFrame(rows, columns=FEATURE_LIST)
y = truth[usable].astype(int).to_numpy()

pred = MODEL.predict(X)

shipped = (pred == y).mean()
print(f"accuracy, mapping as shipped: {shipped:.1%}")
print(f"accuracy if inverted:         {1 - shipped:.1%}\n")

# Confusion matrix, written out so no extra dependency is needed.
print("confusion matrix (rows = truth, cols = predicted)")
print(f"{'':>22}{'pred 0':>9}{'pred 1':>9}")
for actual in (0, 1):
    counts = [int(((y == actual) & (pred == p)).sum()) for p in (0, 1)]
    print(f"truth {actual} ({LABELS[actual]:<12}){counts[0]:>7}{counts[1]:>9}")

# Recall per class matters more than overall accuracy here: the dataset is
# imbalanced, so a model that mostly predicts "Healthy" still scores well.
for cls in (0, 1):
    total = int((y == cls).sum())
    hit = int(((y == cls) & (pred == cls)).sum())
    print(f"recall for {LABELS[cls]:<8} {hit}/{total} = {hit / total:.1%}")

print(f"\npredicted class distribution: {dict(pd.Series(pred).value_counts())}")
