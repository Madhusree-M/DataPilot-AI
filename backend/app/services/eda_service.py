import os
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple, Optional
from app.utils.helpers import DATASETS_DIR, load_dataframe, sanitize_value
from app.schemas.eda import (
    EDAResponse,
    ColumnProfile,
    CorrelationPair,
    HealthWarning
)

class EDAService:
    @staticmethod
    def analyze_dataset(dataset_id: str) -> EDAResponse:
        file_path = os.path.join(DATASETS_DIR, dataset_id)
        df = load_dataframe(file_path)

        row_count, col_count = df.shape
        duplicate_rows_count = int(df.duplicated().sum())
        memory_usage_mb = round(float(df.memory_usage(deep=True).sum()) / (1024 * 1024), 2)

        column_profiles: List[ColumnProfile] = []
        numeric_columns: List[str] = []
        categorical_columns: List[str] = []
        warnings: List[HealthWarning] = []

        # Missing matrix
        missing_matrix: Dict[str, float] = {}

        total_cells = row_count * col_count if row_count > 0 else 1
        total_missing_cells = 0
        total_outliers = 0

        for col in df.columns:
            series = df[col]
            null_count = int(series.isnull().sum())
            total_missing_cells += null_count
            null_pct = round((null_count / row_count * 100) if row_count > 0 else 0, 2)
            missing_matrix[str(col)] = null_pct

            unique_count = int(series.nunique(dropna=True))
            unique_pct = round((unique_count / row_count * 100) if row_count > 0 else 0, 2)

            # Infer type
            if pd.api.types.is_bool_dtype(series):
                inferred_type = "boolean"
                categorical_columns.append(str(col))
            elif pd.api.types.is_numeric_dtype(series):
                # Check if it acts like a discrete categorical (e.g. 0/1 or 1/2/3 with few unique)
                if unique_count <= 2 and row_count > 20:
                    inferred_type = "boolean"
                    categorical_columns.append(str(col))
                else:
                    inferred_type = "numeric"
                    numeric_columns.append(str(col))
            elif pd.api.types.is_datetime64_any_dtype(series):
                inferred_type = "datetime"
            else:
                if unique_pct > 75 and unique_count > 50:
                    inferred_type = "text"
                else:
                    inferred_type = "categorical"
                categorical_columns.append(str(col))

            # Warnings for column
            if null_pct > 40:
                warnings.append(
                    HealthWarning(
                        type="missing",
                        severity="high",
                        column=str(col),
                        message=f"Column '{col}' has {null_pct}% missing values.",
                        recommendation="Consider dropping this column or using an advanced imputer.",
                    )
                )
            elif null_pct > 10:
                warnings.append(
                    HealthWarning(
                        type="missing",
                        severity="medium",
                        column=str(col),
                        message=f"Column '{col}' has {null_pct}% missing values.",
                        recommendation="Impute using median for numeric or mode for categorical features.",
                    )
                )

            if inferred_type in ["categorical", "text"] and unique_pct > 80 and row_count > 50:
                warnings.append(
                    HealthWarning(
                        type="high_cardinality",
                        severity="medium",
                        column=str(col),
                        message=f"Column '{col}' has high cardinality ({unique_count} distinct values).",
                        recommendation="Likely an identifier or free text. Drop before training ML models.",
                    )
                )

            # Profile calculation
            profile_data = {
                "name": str(col),
                "dtype": str(series.dtype),
                "inferred_type": inferred_type,
                "total_count": row_count,
                "missing_count": null_count,
                "missing_percentage": null_pct,
                "unique_count": unique_count,
                "unique_percentage": unique_pct,
                "mean": None,
                "std": None,
                "median": None,
                "min": None,
                "max": None,
                "q25": None,
                "q75": None,
                "skewness": None,
                "kurtosis": None,
                "outlier_count": None,
                "top_values": None,
                "histogram": None,
            }

            clean_series = series.dropna()

            if inferred_type == "numeric" and len(clean_series) > 0:
                q25 = float(clean_series.quantile(0.25))
                q75 = float(clean_series.quantile(0.75))
                iqr = q75 - q25
                lower_bound = q25 - 1.5 * iqr
                upper_bound = q75 + 1.5 * iqr

                outliers = clean_series[(clean_series < lower_bound) | (clean_series > upper_bound)]
                outlier_count = int(len(outliers))
                total_outliers += outlier_count

                if outlier_count > 0 and (outlier_count / len(clean_series)) > 0.05:
                    warnings.append(
                        HealthWarning(
                            type="outliers",
                            severity="low",
                            column=str(col),
                            message=f"Column '{col}' contains {outlier_count} outliers ({round(outlier_count/len(clean_series)*100, 1)}%).",
                            recommendation="Consider IQR clipping or robust scaling to avoid skewing ML models.",
                        )
                    )

                profile_data.update({
                    "mean": sanitize_value(round(float(clean_series.mean()), 3)),
                    "std": sanitize_value(round(float(clean_series.std()), 3)),
                    "median": sanitize_value(round(float(clean_series.median()), 3)),
                    "min": sanitize_value(round(float(clean_series.min()), 3)),
                    "max": sanitize_value(round(float(clean_series.max()), 3)),
                    "q25": sanitize_value(round(q25, 3)),
                    "q75": sanitize_value(round(q75, 3)),
                    "skewness": sanitize_value(round(float(clean_series.skew()), 3)) if len(clean_series) > 2 else None,
                    "kurtosis": sanitize_value(round(float(clean_series.kurtosis()), 3)) if len(clean_series) > 3 else None,
                    "outlier_count": outlier_count,
                })

                # Histogram generation (10 bins)
                try:
                    counts, bin_edges = np.histogram(clean_series, bins=10)
                    profile_data["histogram"] = {
                        "bins": [round(float(b), 2) for b in bin_edges],
                        "counts": [int(c) for c in counts],
                    }
                except Exception:
                    profile_data["histogram"] = None

            elif inferred_type in ["categorical", "boolean", "text"] and len(clean_series) > 0:
                val_counts = clean_series.value_counts().head(10)
                top_vals = []
                for val, cnt in val_counts.items():
                    top_vals.append({
                        "value": str(val),
                        "count": int(cnt),
                        "percentage": round(float(cnt) / len(clean_series) * 100, 2),
                    })
                profile_data["top_values"] = top_vals

                # Class imbalance check
                if len(top_vals) >= 2 and top_vals[0]["percentage"] > 85:
                    warnings.append(
                        HealthWarning(
                            type="imbalance",
                            severity="medium",
                            column=str(col),
                            message=f"High class imbalance in '{col}': '{top_vals[0]['value']}' represents {top_vals[0]['percentage']}% of records.",
                            recommendation="Use stratified sampling or class weights when training predictive models.",
                        )
                    )

            column_profiles.append(ColumnProfile(**profile_data))

        # Check duplicate rows
        if duplicate_rows_count > 0:
            dup_pct = round(duplicate_rows_count / row_count * 100, 2)
            warnings.append(
                HealthWarning(
                    type="duplicate_rows",
                    severity="medium" if dup_pct < 10 else "high",
                    column=None,
                    message=f"Found {duplicate_rows_count} duplicate rows ({dup_pct}% of the dataset).",
                    recommendation="Remove duplicate rows to prevent bias and model overfitting.",
                )
            )

        # Correlation Matrix
        correlation_matrix: Dict[str, Dict[str, Optional[float]]] = {}
        top_correlations: List[CorrelationPair] = []

        if len(numeric_columns) > 1:
            try:
                corr_df = df[numeric_columns].corr()
                for c1 in numeric_columns:
                    correlation_matrix[c1] = {}
                    for c2 in numeric_columns:
                        val = corr_df.loc[c1, c2] if (c1 in corr_df.index and c2 in corr_df.columns) else None
                        correlation_matrix[c1][c2] = sanitize_value(round(float(val), 3)) if val is not None and not pd.isna(val) else None

                # Extract top correlated pairs (c1 != c2, avoid duplicate pairs)
                seen_pairs = set()
                pairs = []
                for i in range(len(numeric_columns)):
                    for j in range(i + 1, len(numeric_columns)):
                        c1, c2 = numeric_columns[i], numeric_columns[j]
                        val = correlation_matrix.get(c1, {}).get(c2)
                        if val is not None:
                            pairs.append(
                                CorrelationPair(
                                    feature_a=c1,
                                    feature_b=c2,
                                    correlation=val,
                                    abs_correlation=abs(val),
                                )
                            )
                pairs.sort(key=lambda x: x.abs_correlation, reverse=True)
                top_correlations = pairs[:15]
            except Exception:
                pass

        # Compute Overall Health Score (0 - 100)
        # Deduct points for: missing data, duplicate rows, severe outliers, heavy warnings
        score = 100.0
        missing_rate = (total_missing_cells / total_cells) * 100
        score -= min(missing_rate * 1.5, 30.0)  # Max 30 pts off for missing data

        dup_rate = (duplicate_rows_count / row_count * 100) if row_count > 0 else 0
        score -= min(dup_rate * 2.0, 20.0)  # Max 20 pts off for duplicates

        high_warnings = len([w for w in warnings if w.severity == "high"])
        med_warnings = len([w for w in warnings if w.severity == "medium"])
        score -= (high_warnings * 7.0 + med_warnings * 3.0)

        health_score = max(int(round(score)), 10)
        missing_cells_pct = round((total_missing_cells / total_cells * 100), 2)
        cols_with_missing = len([p for p in column_profiles if p.missing_count > 0])

        return EDAResponse(
            dataset_id=dataset_id,
            dataset_name=dataset_id.replace("_", " ").rsplit(".", 1)[0].title(),
            row_count=row_count,
            col_count=col_count,
            duplicate_rows_count=duplicate_rows_count,
            memory_usage_mb=memory_usage_mb,
            missing_cells_count=total_missing_cells,
            missing_cells_percentage=missing_cells_pct,
            columns_with_missing_count=cols_with_missing,
            health_score=health_score,
            warnings=warnings,
            column_profiles=column_profiles,
            numeric_columns=numeric_columns,
            categorical_columns=categorical_columns,
            correlation_matrix=correlation_matrix,
            top_correlations=top_correlations,
            missing_matrix=missing_matrix,
        )
