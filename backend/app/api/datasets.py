from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from typing import List, Optional
from app.services.dataset_service import DatasetService
from app.schemas.dataset import DatasetSummary, DatasetPreviewResponse

router = APIRouter(prefix="/api/datasets", tags=["datasets"])

@router.get("", response_model=List[DatasetSummary])
def list_datasets():
    """List all available datasets in the workspace."""
    return DatasetService.list_datasets()

@router.get("/{dataset_id}", response_model=DatasetSummary)
def get_dataset(dataset_id: str):
    """Get metadata and column statistics for a dataset."""
    try:
        return DatasetService.get_dataset_summary(dataset_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{dataset_id}/preview", response_model=DatasetPreviewResponse)
def get_preview(
    dataset_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    search: Optional[str] = None
):
    """Get paginated data rows and preview."""
    try:
        return DatasetService.get_preview(dataset_id, page=page, page_size=page_size, search=search)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload", response_model=DatasetSummary)
async def upload_dataset(file: UploadFile = File(...)):
    """Upload a new CSV, Excel, or JSON dataset."""
    allowed_exts = (".csv", ".xlsx", ".xls", ".json")
    if not file.filename.lower().endswith(allowed_exts):
        raise HTTPException(status_code=400, detail="Only CSV, Excel, and JSON files are supported.")

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        return DatasetService.save_uploaded_file(content, file.filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")

@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: str):
    """Delete a dataset."""
    success = DatasetService.delete_dataset(dataset_id)
    if not success:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return {"message": f"Dataset {dataset_id} deleted successfully."}

@router.get("/{dataset_id}/download")
def download_dataset(dataset_id: str):
    """Download a dataset file directly."""
    import os
    from fastapi.responses import FileResponse
    from app.utils.helpers import DATASETS_DIR
    clean_name = os.path.basename(dataset_id)
    file_path = os.path.join(DATASETS_DIR, clean_name)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Dataset file not found")
    return FileResponse(file_path, filename=clean_name, media_type="application/octet-stream")
