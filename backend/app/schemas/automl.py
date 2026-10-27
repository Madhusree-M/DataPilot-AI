from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class AutoMLTrainRequest(BaseModel):
    dataset_id: str
    target_column: str
    task_type: Optional[str] = "classification"  # "classification" or "regression"
    selected_features: Optional[List[str]] = None
    selected_models: Optional[List[str]] = None
    test_size: float = Field(default=0.2, ge=0.05, le=0.5)
    random_state: int = 42

class FeatureImportanceItem(BaseModel):
    feature: str
    importance: float

class ModelEvaluation(BaseModel):
    model_name: str
    model_key: str
    training_time_seconds: float
    metrics: Dict[str, Any]  # accuracy, precision, recall, f1, roc_auc / rmse, mae, r2
    confusion_matrix: Optional[List[List[int]]] = None
    confusion_labels: Optional[List[str]] = None
    feature_importance: Optional[List[FeatureImportanceItem]] = None
    is_best: bool = False

class ModelRecommendationRationale(BaseModel):
    model_name: str
    headline: str
    key_reasons: List[str]
    dataset_fit_analysis: str
    strengths: List[str]
    tradeoffs: str
    score_margin: Optional[str] = None

class AutoMLTrainResponse(BaseModel):
    job_id: str
    dataset_id: str
    target_column: str
    task_type: str  # "classification" or "regression"
    target_classes: Optional[List[str]] = None
    features: List[str]
    sample_size: int
    train_size: int
    test_size: int
    best_model_name: str
    best_score_metric: str
    best_score: float
    models: List[ModelEvaluation]
    recommendation_rationale: Optional[ModelRecommendationRationale] = None
    sample_record: Optional[Dict[str, Any]] = None

class PredictRequest(BaseModel):
    job_id: str
    inputs: Dict[str, Any]

class PredictResponse(BaseModel):
    job_id: str
    model_name: str
    prediction: Any
    prediction_label: Optional[str] = None
    probabilities: Optional[Dict[str, float]] = None

class SimulateRequest(BaseModel):
    job_id: str
    baseline_inputs: Dict[str, Any]
    modified_inputs: Dict[str, Any]
