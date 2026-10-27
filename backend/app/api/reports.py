import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from app.services.report_service import ReportService
from app.schemas.report import ReportGenerateRequest, ReportSummary
from app.utils.helpers import REPORTS_DIR

router = APIRouter(prefix="/api/reports", tags=["reports"])

@router.post("/generate", response_model=ReportSummary)
def generate_report(request: ReportGenerateRequest):
    """Generate a comprehensive HTML executive audit report."""
    try:
        return ReportService.generate_html_report(request)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation error: {str(e)}")

@router.get("/download/{filename}")
def download_report(filename: str, download: bool = False):
    """Download or view an existing generated report.
    Defaults to inline disposition so iframe previewing does not force a browser download.
    Pass ?download=true to trigger file download.
    """
    clean_filename = os.path.basename(filename)
    file_path = os.path.join(REPORTS_DIR, clean_filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Report file not found")
    media_type = "application/pdf" if clean_filename.lower().endswith(".pdf") else "text/html"
    if download:
        return FileResponse(
            file_path,
            media_type=media_type,
            filename=clean_filename,
            content_disposition_type="attachment"
        )
    return FileResponse(
        file_path,
        media_type=media_type,
        headers={"Content-Disposition": "inline"}
    )
