from fastapi import APIRouter, HTTPException
from app.services.automl_service import AutoMLService
from app.schemas.automl import (
    AutoMLTrainRequest,
    AutoMLTrainResponse,
    PredictRequest,
    PredictResponse,
    SimulateRequest,
)

router = APIRouter(prefix="/api/automl", tags=["automl"])

@router.post("/train", response_model=AutoMLTrainResponse)
def train_automl(request: AutoMLTrainRequest):
    """Train and benchmark multiple machine learning models on a dataset."""
    try:
        return AutoMLService.train_models(request)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AutoML training failed: {str(e)}")

@router.post("/predict", response_model=PredictResponse)
def predict_model(request: PredictRequest):
    """Generate live interactive prediction using a trained model."""
    try:
        return AutoMLService.predict(request)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@router.post("/simulate")
def simulate_scenario(request: SimulateRequest):
    """Simulate a what-if business hypothesis scenario comparing baseline vs modified features."""
    try:
        return AutoMLService.simulate_scenario(
            job_id=request.job_id,
            baseline_inputs=request.baseline_inputs,
            modified_inputs=request.modified_inputs,
        )
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")
