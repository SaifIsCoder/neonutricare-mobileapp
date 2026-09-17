# NeoNutriCare 🍼

**NeoNutriCare** is a comprehensive mobile application designed to support maternal health and screen for newborn malnutrition risk using Machine Learning and AI. 

In low-resource settings, early identification of malnutrition risks during pregnancy can be life-saving. NeoNutriCare provides a low-friction screening tool and trustworthy, evidence-based maternal guidance right in the hands of mothers, caregivers, and community health workers.

---

## 🌟 Core Features

- **ML Risk Assessment:** Users fill out a 14-point clinical and maternal form which is processed by a trained Random Forest model. The app instantly returns a risk label, a confidence score, and plain-language recommendations.
- **Evidence-Based AI Assistant:** An integrated AI Health Assistant that strictly answers questions based on WHO maternal-health guidelines using a custom Retrieval-Augmented Generation (RAG) pipeline powered by Gemini.
- **Maternal Support Content:** Static, categorized health tips and pregnancy guides to provide ongoing support.
- **History Tracking:** Securely persists every assessment so users can track their health history over time.

---

## 🏗️ Architecture & Tech Stack

NeoNutriCare is built using modern mobile development and scalable backend architecture:

### Mobile App (Frontend)
- **Framework:** React Native built with Expo (SDK 57).
- **Language:** Strict TypeScript.
- **Routing:** Expo Router (file-based routing).

### Backend & Database (BaaS)
- **Supabase:** Handles secure Authentication, PostgreSQL Database, Storage, and Row Level Security (RLS) to ensure users can only access their own medical data.

### Machine Learning Service (Backend)
- **Framework:** Python FastAPI.
- **Model:** `scikit-learn` Random Forest `.pkl` model.
- **Endpoint:** Exposes the `POST /predict` endpoint to process maternal data.

### AI Pipeline
- **RAG Architecture:** Google's Gemini API handles vector embeddings and citation-aware text generation. The AI is strictly prompt-engineered to provide plain text, WHO-compliant advice.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- Expo CLI
- A Supabase project
- A Gemini API Key

### 2. Mobile App Setup
```bash
# Install dependencies
npm install

# Start the Expo development server
npx expo start
```

### 3. Prediction Service Setup
Navigate to the `prediction-service` directory:
```bash
# Create a virtual environment
python -m venv venv
# Activate the virtual environment (Windows)
venv\Scripts\activate
# Install requirements
pip install -r requirements.txt

# Set up environment variables
# Create a .env file and add your GEMINI_API_KEY

# Start the FastAPI server
uvicorn app:app --reload
```

---

## ⚠️ Medical Disclaimer
NeoNutriCare is a **screening and decision-support tool, not a diagnosis.** Every result screen and report advises the user to consult a qualified healthcare provider. The model output should never be presented as clinical certainty.

---

## 📄 License
See the `LICENSE` file for details.
