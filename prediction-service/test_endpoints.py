import json
import os
import requests

API_URL = "http://127.0.0.1:8000/ask"
PREDICT_URL = "http://127.0.0.1:8000/predict"
HEALTH_URL = "http://127.0.0.1:8000/health"

QUESTIONS = [
    "What are the WHO recommendations for maternal nutrition?",
    "What are the recommendations for folic acid during pregnancy?",
    "What nutrients are important during pregnancy?",
    "What does WHO recommend about iron supplementation during pregnancy?"
]

def test_health():
    print("Testing /health")
    try:
        r = requests.get(HEALTH_URL)
        print("Health status:", r.status_code, r.json())
    except Exception as e:
        print("Health check failed:", e)

def test_ask():
    print("\nTesting /ask")
    for q in QUESTIONS:
        print(f"\nQ: {q}")
        try:
            r = requests.post(API_URL, json={"question": q})
            if r.status_code == 200:
                data = r.json()
                print("Answer exists:", bool(data.get("answer")))
                print("Sources:", len(data.get("sources", [])))
            else:
                print("Error:", r.status_code, r.text)
        except Exception as e:
            print("Request failed:", e)

def test_invalid_ask():
    print("\nTesting Invalid /ask")
    invalids = [{}, {"question": ""}, {"question": "   "}]
    for inv in invalids:
        r = requests.post(API_URL, json=inv)
        print(f"Invalid {inv} -> Status: {r.status_code}")

def test_predict():
    print("\nTesting /predict")
    payload = {
        "age": "A",
        "address": "Urban",
        "weight_gain": "Adequate",
        "education": "Secondary",
        "occupation": "Employed",
        "family_type": "Nuclear",
        "parity": "1",
        "living_with_husband": "Yes",
        "booked": "Yes",
        "antenatal_visits": 4,
        "hemoglobin": 12.0,
        "iron_injection": "No",
        "pre_eclampsia": "No",
        "infection": "No"
    }
    try:
        r = requests.post(PREDICT_URL, json=payload)
        print("Predict Status:", r.status_code)
        if r.status_code == 200:
            print("Predict Response:", r.json())
        else:
            print(r.text)
    except Exception as e:
        print("Predict Request failed:", e)

if __name__ == "__main__":
    test_health()
    test_predict()
    test_invalid_ask()
    test_ask()
