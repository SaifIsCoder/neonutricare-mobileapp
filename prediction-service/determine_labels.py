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
