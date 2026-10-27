from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_full_pipeline():
    print("--- 1. Testing Root & Health ---")
    res = client.get("/")
    assert res.status_code == 200, res.text
    assert "message" in res.json()

    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "healthy"}
    print("Health check OK")

    print("\n--- 2. Testing Datasets API ---")
    res = client.get("/api/datasets")
    assert res.status_code == 200
    datasets = res.json()
    print(f"Found {len(datasets)} datasets: {[d['id'] for d in datasets]}")
    assert len(datasets) >= 4

    res = client.get("/api/datasets/titanic.csv/preview?page=1&page_size=5")
    assert res.status_code == 200
    preview = res.json()
    assert preview["total_rows"] == 800
    assert len(preview["rows"]) == 5
    print("Dataset preview OK")

    print("\n--- 3. Testing EDA API ---")
    res = client.get("/api/eda/titanic.csv")
    assert res.status_code == 200
    eda = res.json()
    print(f"Health score: {eda['health_score']}/100, warnings: {len(eda['warnings'])}, profiles: {len(eda['column_profiles'])}")
    assert eda["health_score"] > 0
    assert len(eda["column_profiles"]) > 0
    print("EDA API OK")

    print("\n--- 4. Testing Cleaning API ---")
    clean_req = {
        "dataset_id": "titanic.csv",
        "impute_numeric": "median",
        "impute_categorical": "mode",
        "drop_duplicates": True,
        "outlier_strategy": "clip",
        "drop_columns": ["passenger_id"],
        "scale_numeric": "none",
        "encode_categorical": "none",
    }
    res = client.post("/api/cleaning", json=clean_req)
    assert res.status_code == 200
    cleaned = res.json()
    print(f"Cleaned dataset: {cleaned['cleaned_filename']}, actions: {len(cleaned['actions_performed'])}")
    assert cleaned["missing_after"] == 0
    print("Cleaning API OK")

    print("\n--- 5. Testing AutoML API (Classification) ---")
    train_req = {
        "dataset_id": "titanic.csv",
        "target_column": "survived",
        "task_type": "classification",
        "test_size": 0.2,
    }
    res = client.post("/api/automl/train", json=train_req)
    assert res.status_code == 200, res.text
    automl_res = res.json()
    print(f"AutoML Job: {automl_res['job_id']}, Best: {automl_res['best_model_name']} ({automl_res['best_score']})")
    assert len(automl_res["models"]) >= 5

    # Test Prediction
    pred_req = {
        "job_id": automl_res["job_id"],
        "inputs": {
            "pclass": 1,
            "sex": "female",
            "age": 28,
            "fare": 80.0,
            "embarked": "Cherbourg",
        }
    }
    res = client.post("/api/automl/predict", json=pred_req)
    assert res.status_code == 200
    pred = res.json()
    print(f"Live Prediction Result: {pred['prediction_label']}, Probabilities: {pred['probabilities']}")

    # Test What-If Simulation
    sim_req = {
        "job_id": automl_res["job_id"],
        "baseline_inputs": {"pclass": 3, "sex": "male", "age": 30, "fare": 8.0, "embarked": "Southampton"},
        "modified_inputs": {"pclass": 1, "sex": "female", "age": 30, "fare": 90.0, "embarked": "Cherbourg"},
    }
    res_sim = client.post("/api/automl/simulate", json=sim_req)
    assert res_sim.status_code == 200, res_sim.text
    sim_data = res_sim.json()
    print(f"What-If Simulation Delta: {sim_data['delta']}")
    assert "baseline" in sim_data and "modified" in sim_data
    print("AutoML, Prediction & What-If Simulation OK")

    # Test Dataset File Download
    res_file = client.get("/api/datasets/titanic.csv/download")
    assert res_file.status_code == 200
    assert len(res_file.content) > 1000
    print("Dataset Download OK")

    print("\n--- 6. Testing Chat API ---")
    chat_req = {
        "dataset_id": "titanic.csv",
        "message": "What is the average fare and age?",
    }
    res = client.post("/api/chat", json=chat_req)
    assert res.status_code == 200
    chat_res = res.json()
    print("Chat Reply:", chat_res["reply"][:150] + "...")
    print("Chat API OK")

    print("\n--- 7. Testing Reports API ---")
    report_req = {
        "dataset_id": "titanic.csv",
        "job_id": automl_res["job_id"],
        "report_title": "Titanic Survival Science Audit",
    }
    res = client.post("/api/reports/generate", json=report_req)
    assert res.status_code == 200
    rep_summary = res.json()
    print(f"Generated report: {rep_summary['filename']}, size: {rep_summary['file_size_bytes']} bytes")
    
    # Download check
    res_down = client.get(f"/api/reports/download/{rep_summary['filename']}")
    assert res_down.status_code == 200
    assert res_down.content.startswith(b"%PDF")
    print("Reports API (PDF) OK")

    print("\n==========================================")
    print("  ALL BACKEND TESTS PASSED SUCCESSFULLY!  ")
    print("==========================================")

if __name__ == "__main__":
    test_full_pipeline()
