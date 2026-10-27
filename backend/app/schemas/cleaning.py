from pydantic import BaseModel, Field
from typing import List, Optional

class CleaningConfig(BaseModel):
    dataset_id: str
    impute_numeric: str = Field(default="median", description="'median', 'mean', 'zero', 'drop', or 'none'")
    impute_categorical: str = Field(default="mode", description="'mode', 'missing', 'drop', or 'none'")
    drop_duplicates: bool = True
    outlier_strategy: str = Field(default="none", description="'none', 'clip', or 'drop'")
    drop_columns: Optional[List[str]] = Field(default_factory=list)
    scale_numeric: str = Field(default="none", description="'none', 'standard', 'minmax'")
    encode_categorical: str = Field(default="none", description="'none', 'onehot', 'label'")
    output_filename: Optional[str] = None

class CleaningResponse(BaseModel):
    original_dataset_id: str
    cleaned_dataset_id: str
    cleaned_filename: str
    original_shape: List[int]
    cleaned_shape: List[int]
    actions_performed: List[str]
    missing_before: int
    missing_after: int
    duplicates_removed: int
