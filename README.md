# 🚀 DataPilot AI — Autonomous AI Data Scientist

**DataPilot AI** is a state-of-the-art AI-powered Data Science platform designed with a clean, human-crafted, distraction-free white UI that automates the end-to-end data science lifecycle: from exploratory data analysis and smart data cleaning to multi-model AutoML benchmarking, What-If scenario simulations, live interactive inference, conversational data analytics, and boardroom-ready executive audit reports.

---

## ✨ Core Capabilities & Unique Features

### 1. ⚡ AI What-If Simulation Lab (Unique Enterprise Feature)
- **Business Hypothesis Testing**: Rather than just static predictions, run counterfactual simulations (*"What if we lower monthly charges by $15 and upgrade the contract to 2-year?"* or *"What if house square footage increases by 20%?"*).
- **Side-by-Side Comparison**: Evaluates baseline parameters vs. simulated changes side-by-side.
- **Impact Delta & Key Drivers**: Computes exact percentage shifts, probability deltas, and lists modified driver attributes.
- **Decision Matrix**: Save and compare multiple business scenarios in an executive decision comparison table.

### 2. 📊 Automated Exploratory Data Analysis (Auto-EDA)
- **Data Health Score (0–100)**: Evaluates dataset completeness, duplicates, skewness, and cardinality.
- **Statistical Feature Profiling**: Computes mean, median, standard deviation, quartiles (Q25, Q75), skewness, kurtosis, and outlier counts (IQR 1.5x rule).
- **Correlation Engine**: Computes Pearson correlation matrices and flags top interactions.

### 3. 🧹 Smart Data Cleaning & One-Click CSV Export
- **1-Click Auto-Clean**: Fills missing numerical values with medians and categorical values with modes, and purges duplicate rows.
- **Direct CSV Download**: Export and download clean datasets directly to your computer.
- **Audit Changelog**: Shows exact before-and-after dimensions and missing cell reduction.

### 4. 🤖 AutoML Studio & Multi-Model Benchmarking
- **Dual Mode Support**: Binary / Multi-Class Classification & Continuous Regression.
- **Candidate Architectures**: Random Forest, Gradient Boosting, Logistic Regression, Decision Tree, Extra Trees, K-Nearest Neighbors, Ridge Regression.
- **Model Leaderboard**: Ranks algorithms by Accuracy, F1-Score, Precision, Recall, ROC-AUC, RMSE, MAE, and R².
- **Live Interactive Inference**: Fill custom feature values and evaluate predictions in real-time.

### 5. 💬 Conversational AI Data Scientist Chat
- Query your dataset in plain English (*"Summarize this data"*, *"Which columns have missing values?"*, *"What are the strongest correlations?"*).
- Instant statistics, actionable recommendations, and dynamically generated bar charts.

### 6. 📑 Executive Audit Reports
- Compiles standalone, boardroom-ready HTML audit summaries with KPIs, data profiles, and AutoML model leaderboards.
- Direct download and print-to-PDF ready.

### 7. 🗂️ Raw Data Explorer
- Searchable and paginated high-speed table viewer across all records.

---

## 🎨 Human-Crafted White Design System
- **Crisp, Distraction-Free Aesthetic**: Designed like modern enterprise tools (Stripe, Linear, Apple) with white cards, subtle gray surfaces (`#f8fafc`), crisp borders (`#e2e8f0`), deep charcoal typography (`#0f172a`), and modern indigo accents (`#4f46e5`).
- **2-Step User-Friendly Flow**:
  1. *Step 1*: Clean upload screen with drag-and-drop box and instant 1-click sample datasets.
  2. *Step 2*: Simple horizontal tabs to explore, clean, train, simulate, chat, and export.

---

## 🚀 Quickstart Guide

### 1. Start the FastAPI Backend
```bash
backend/venv/bin/uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```
API live at: `http://localhost:8000` (Swagger Docs: `http://localhost:8000/docs`)

### 2. Start the Frontend
```bash
cd frontend
npm run dev -- --host 127.0.0.1 --port 3000
```
Web Application live at: `http://localhost:3000`

### 3. Run Backend Verification Tests
```bash
backend/venv/bin/python backend/test_health.py
```
