from pydantic import BaseModel
from typing import Dict, Any, Optional

class ReportGenerateRequest(BaseModel):
    dataset_id: str
    report_title: Optional[str] = "DataPilot AI - Comprehensive Data Science Audit"
    job_id: Optional[str] = None  # Optional AutoML job to include in the report

class ReportSummary(BaseModel):
    report_id: str
    filename: str
    dataset_name: str
    created_at: str
    file_size_bytes: int
    download_url: str
