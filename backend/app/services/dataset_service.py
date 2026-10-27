import os
import time
import uuid
import pandas as pd
from typing import List, Dict, Any, Optional
from app.utils.helpers import DATASETS_DIR, load_dataframe, sanitize_value, sanitize_dict
from app.schemas.dataset import DatasetSummary, ColumnInfo, DatasetPreviewResponse

class DatasetService:
    @staticmethod
    def list_datasets() -> List[DatasetSummary]:
        results = []
        if not os.path.exists(DATASETS_DIR):
            return results

        for filename in sorted(os.listdir(DATASETS_DIR)):
            if filename.startswith(".") or not filename.endswith((".csv", ".xlsx", ".xls", ".json")):
                continue

            file_path = os.path.join(DATASETS_DIR, filename)
            file_size = os.path.getsize(file_path)
            created_at = time.ctime(os.path.getmtime(file_path))

            try:
                # Read only a small sample or header for speed
                df = load_dataframe(file_path)
                row_count, col_count = df.shape
                columns = list(df.columns)

                # Infer suggested target and task
                suggested_task = "classification"
                suggested_target = None
                for col in reversed(columns):
                    lower = col.lower()
                    if lower in ["target", "label", "survived", "churn", "species", "status", "class", "outcome", "price", "median_house_value", "total_charges"]:
                        suggested_target = col
                        if lower in ["price", "median_house_value", "total_charges"] or (pd.api.types.is_numeric_dtype(df[col]) and df[col].nunique() > 20):
                            suggested_task = "regression"
                        else:
                            suggested_task = "classification"
                        break

                if not suggested_target and len(columns) > 0:
                    suggested_target = columns[-1]
                    if pd.api.types.is_numeric_dtype(df[suggested_target]) and df[suggested_target].nunique() > 15:
                        suggested_task = "regression"
                    else:
                        suggested_task = "classification"

                results.append(
                    DatasetSummary(
                        id=filename,
                        name=filename.replace("_", " ").rsplit(".", 1)[0].title(),
                        filename=filename,
                        file_size_bytes=file_size,
                        row_count=row_count,
                        col_count=col_count,
                        created_at=created_at,
                        columns=columns,
                        suggested_task=suggested_task,
                        suggested_target=suggested_target,
                    )
                )
            except Exception as e:
                # If error reading file, still list basic info
                results.append(
                    DatasetSummary(
                        id=filename,
                        name=filename,
                        filename=filename,
                        file_size_bytes=file_size,
                        row_count=0,
                        col_count=0,
                        created_at=created_at,
                        columns=[],
                        suggested_task=None,
                        suggested_target=None,
                    )
                )

        return results

    @staticmethod
    def get_dataset_summary(dataset_id: str) -> DatasetSummary:
        file_path = os.path.join(DATASETS_DIR, dataset_id)
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Dataset {dataset_id} not found.")

        df = load_dataframe(file_path)
        file_size = os.path.getsize(file_path)
        created_at = time.ctime(os.path.getmtime(file_path))

        column_details = []
        for col in df.columns:
            series = df[col]
            null_count = int(series.isnull().sum())
            non_null = int(len(series) - null_count)
            null_pct = round((null_count / len(series) * 100) if len(series) > 0 else 0, 2)
            unique_count = int(series.nunique())

            column_details.append(
                ColumnInfo(
                    name=str(col),
                    dtype=str(series.dtype),
                    non_null_count=non_null,
                    null_count=null_count,
                    null_percentage=null_pct,
                    unique_count=unique_count,
                )
            )

        # Detect suggested target & task
        suggested_target = None
        suggested_task = "classification"
        for col in reversed(df.columns):
            lower = str(col).lower()
            if lower in ["target", "label", "survived", "churn", "species", "status", "class", "outcome", "price", "median_house_value", "total_charges"]:
                suggested_target = str(col)
                if lower in ["price", "median_house_value", "total_charges"] or (pd.api.types.is_numeric_dtype(df[col]) and df[col].nunique() > 20):
                    suggested_task = "regression"
                else:
                    suggested_task = "classification"
                break

        if not suggested_target and len(df.columns) > 0:
            suggested_target = str(df.columns[-1])
            if pd.api.types.is_numeric_dtype(df[suggested_target]) and df[suggested_target].nunique() > 15:
                suggested_task = "regression"
            else:
                suggested_task = "classification"

        return DatasetSummary(
            id=dataset_id,
            name=dataset_id.replace("_", " ").rsplit(".", 1)[0].title(),
            filename=dataset_id,
            file_size_bytes=file_size,
            row_count=len(df),
            col_count=len(df.columns),
            created_at=created_at,
            columns=[str(c) for c in df.columns],
            column_details=column_details,
            suggested_task=suggested_task,
            suggested_target=suggested_target,
        )

    @staticmethod
    def get_preview(
        dataset_id: str,
        page: int = 1,
        page_size: int = 50,
        search: Optional[str] = None
    ) -> DatasetPreviewResponse:
        file_path = os.path.join(DATASETS_DIR, dataset_id)
        df = load_dataframe(file_path)

        if search and search.strip():
            query = search.strip().lower()
            mask = df.astype(str).apply(lambda row: row.str.lower().str.contains(query, regex=False)).any(axis=1)
            filtered_df = df[mask]
        else:
            filtered_df = df

        total_rows = len(filtered_df)
        total_cols = len(filtered_df.columns)

        start = (page - 1) * page_size
        end = start + page_size
        sliced = filtered_df.iloc[start:end]

        # Convert to dictionary with sanitized values
        records = []
        for idx, row in sliced.iterrows():
            rec = {"_index": idx}
            for col in filtered_df.columns:
                rec[str(col)] = sanitize_value(row[col])
            records.append(rec)

        return DatasetPreviewResponse(
            id=dataset_id,
            columns=[str(c) for c in df.columns],
            rows=records,
            total_rows=total_rows,
            total_cols=total_cols,
            page=page,
            page_size=page_size,
        )

    @staticmethod
    def save_uploaded_file(file_content: bytes, filename: str) -> DatasetSummary:
        # Sanitize filename
        clean_name = filename.replace(" ", "_")
        target_path = os.path.join(DATASETS_DIR, clean_name)

        with open(target_path, "wb") as f:
            f.write(file_content)

        return DatasetService.get_dataset_summary(clean_name)

    @staticmethod
    def delete_dataset(dataset_id: str) -> bool:
        file_path = os.path.join(DATASETS_DIR, dataset_id)
        if os.path.exists(file_path):
            os.remove(file_path)
            return True
        return False
