from fastapi import APIRouter, HTTPException
from app.services.cleaning_service import CleaningService
from app.schemas.cleaning import CleaningConfig, CleaningResponse

router = APIRouter(prefix="/api/cleaning", tags=["cleaning"])

@router.post("", response_model=CleaningResponse)
def clean_dataset(config: CleaningConfig):
    """Apply cleaning, outlier handling, and imputation pipeline to a dataset."""
    try:
        return CleaningService.clean_dataset(config)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cleaning error: {str(e)}")
