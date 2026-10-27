from fastapi import APIRouter, HTTPException
from app.services.eda_service import EDAService
from app.schemas.eda import EDAResponse

router = APIRouter(prefix="/api/eda", tags=["eda"])

@router.get("/{dataset_id}", response_model=EDAResponse)
def get_eda(dataset_id: str):
    """Run automated Exploratory Data Analysis (EDA) on a dataset."""
    try:
        return EDAService.analyze_dataset(dataset_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"EDA calculation error: {str(e)}")
