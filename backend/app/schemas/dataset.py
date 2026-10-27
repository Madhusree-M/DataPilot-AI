from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class ColumnInfo(BaseModel):
    name: str
    dtype: str
    non_null_count: int
    null_count: int
    null_percentage: float
    unique_count: int

class DatasetSummary(BaseModel):
    id: str
    name: str
    filename: str
    file_size_bytes: int
    row_count: int
    col_count: int
    created_at: str
    columns: List[str]
    column_details: Optional[List[ColumnInfo]] = None
    suggested_task: Optional[str] = None
    suggested_target: Optional[str] = None

class DatasetPreviewResponse(BaseModel):
    id: str
    columns: List[str]
    rows: List[Dict[str, Any]]
    total_rows: int
    total_cols: int
    page: int
    page_size: int
