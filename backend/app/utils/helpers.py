import os
import math
import numpy as np
import pandas as pd
from typing import Any

# Project root is 4 levels up from backend/app/utils/helpers.py
UTILS_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.dirname(UTILS_DIR)
BACKEND_DIR = os.path.dirname(APP_DIR)
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)

DATASETS_DIR = os.path.join(PROJECT_ROOT, "datasets")
REPORTS_DIR = os.path.join(PROJECT_ROOT, "reports")

# Fallback check
if not os.path.exists(DATASETS_DIR) and os.path.exists(os.path.join(BACKEND_DIR, "datasets")):
    DATASETS_DIR = os.path.join(BACKEND_DIR, "datasets")
if not os.path.exists(REPORTS_DIR) and os.path.exists(os.path.join(BACKEND_DIR, "reports")):
    REPORTS_DIR = os.path.join(BACKEND_DIR, "reports")

os.makedirs(DATASETS_DIR, exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)


def sanitize_value(val: Any) -> Any:
    """Sanitize float and numpy values to be JSON compliant (no NaN/Inf)."""
    if val is None:
        return None
    if isinstance(val, (float, np.floating)):
        if math.isnan(val) or np.isnan(val):
            return None
        if math.isinf(val) or np.isinf(val):
            return 1e308 if val > 0 else -1e308
        return float(val)
    if isinstance(val, (int, np.integer)):
        return int(val)
    if isinstance(val, (bool, np.bool_)):
        return bool(val)
    if isinstance(val, (np.ndarray, list)):
        return [sanitize_value(v) for v in val]
    if isinstance(val, dict):
        return {str(k): sanitize_value(v) for k, v in val.items()}
    if pd.isna(val):
        return None
    return val


def sanitize_dict(d: dict) -> dict:
    """Recursively sanitize all values in a dictionary."""
    return {str(k): sanitize_value(v) for k, v in d.items()}


def get_dataset_path(filename: str) -> str:
    """Get absolute path for a dataset inside the datasets folder."""
    clean_name = os.path.basename(filename)
    return os.path.join(DATASETS_DIR, clean_name)


def load_dataframe(file_path: str) -> pd.DataFrame:
    """Safely load dataframe from CSV, Excel, or JSON."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".csv":
        return pd.read_csv(file_path)
    elif ext in [".xlsx", ".xls"]:
        return pd.read_excel(file_path)
    elif ext == ".json":
        return pd.read_json(file_path)
    elif ext == ".parquet":
        return pd.read_parquet(file_path)
    else:
        # Fallback try csv
        return pd.read_csv(file_path)
