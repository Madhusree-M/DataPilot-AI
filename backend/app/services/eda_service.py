import os
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple, Optional
from app.utils.helpers import DATASETS_DIR, load_dataframe, sanitize_value
from app.schemas.eda import (
    EDAResponse,
    ColumnProfile,
    CorrelationPair,
    HealthWarning,
    ChartDataRequest,
    ChartDataResponse,
    AutoInsightItem,
    AutoInsightsResponse
)
from scipy import stats

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

    @staticmethod
    def get_chart_data(dataset_id: str, req: ChartDataRequest) -> ChartDataResponse:
        file_path = os.path.join(DATASETS_DIR, dataset_id)
        df = load_dataframe(file_path)

        # Apply optional filters
        if req.filters:
            for col, rule in req.filters.items():
                if col in df.columns:
                    if isinstance(rule, dict):
                        if "min" in rule and rule["min"] is not None:
                            df = df[df[col] >= float(rule["min"])]
                        if "max" in rule and rule["max"] is not None:
                            df = df[df[col] <= float(rule["max"])]
                        if "values" in rule and rule["values"] is not None:
                            val_set = [str(v) for v in rule["values"]]
                            df = df[df[col].astype(str).isin(val_set)]
                    elif isinstance(rule, list) and len(rule) > 0:
                        val_set = [str(v) for v in rule]
                        df = df[df[col].astype(str).isin(val_set)]

        total_pts = len(df)
        sampled = False
        chart_type = req.chart_type
        x_col = req.x_col
        y_col = req.y_col
        group_by_col = req.group_by_col
        target_col = req.target_col

        data_payload: Dict[str, Any] = {}
        metadata_payload: Dict[str, Any] = {}

        if chart_type == "histogram":
            if x_col not in df.columns:
                raise ValueError(f"Column '{x_col}' not found in dataset.")
            series = pd.to_numeric(df[x_col], errors='coerce').dropna()
            if len(series) == 0:
                data_payload = {"bins": [], "density_curve": [], "stats": {}}
            else:
                s_min = float(series.min())
                s_max = float(series.max())
                s_mean = float(series.mean())
                s_median = float(series.median())
                s_std = float(series.std()) if len(series) > 1 else 0.0

                num_bins = min(20, max(8, int(np.sqrt(len(series))))) if s_max > s_min else 1
                counts, bin_edges = np.histogram(series, bins=num_bins)
                bins = []
                for i in range(len(counts)):
                    b_start = round(float(bin_edges[i]), 2)
                    b_end = round(float(bin_edges[i+1]), 2)
                    cnt = int(counts[i])
                    pct = round(cnt / len(series) * 100, 2)
                    bins.append({
                        "bin_start": b_start,
                        "bin_end": b_end,
                        "bin_label": f"{b_start} - {b_end}",
                        "count": cnt,
                        "percentage": pct
                    })

                # Density / KDE curve approximation
                density_curve = []
                if len(series) > 5 and series.nunique() > 2:
                    try:
                        from scipy.stats import gaussian_kde
                        kde = gaussian_kde(series)
                        x_eval = np.linspace(s_min, s_max, 25)
                        y_eval = kde(x_eval)
                        density_curve = [{"x": round(float(x), 2), "y": round(float(y), 5)} for x, y in zip(x_eval, y_eval)]
                    except Exception:
                        density_curve = []

                data_payload = {
                    "bins": bins,
                    "density_curve": density_curve,
                    "stats": {
                        "count": len(series),
                        "mean": round(s_mean, 2),
                        "median": round(s_median, 2),
                        "std": round(s_std, 2),
                        "min": round(s_min, 2),
                        "max": round(s_max, 2)
                    }
                }

        elif chart_type == "boxplot":
            if x_col not in df.columns:
                raise ValueError(f"Column '{x_col}' not found in dataset.")

            group_col = group_by_col if group_by_col and group_by_col in df.columns else (target_col if target_col and target_col in df.columns and target_col != x_col else None)
            
            groups_data = []
            if group_col:
                top_cats = df[group_col].dropna().value_counts().head(8).index.tolist()
                for cat in top_cats:
                    sub_vals = pd.to_numeric(df[df[group_col] == cat][x_col], errors='coerce').dropna()
                    if len(sub_vals) > 0:
                        q1 = float(sub_vals.quantile(0.25))
                        q3 = float(sub_vals.quantile(0.75))
                        median = float(sub_vals.median())
                        v_min = float(sub_vals.min())
                        v_max = float(sub_vals.max())
                        iqr = q3 - q1
                        w_low = max(v_min, q1 - 1.5 * iqr)
                        w_high = min(v_max, q3 + 1.5 * iqr)
                        outliers = sub_vals[(sub_vals < w_low) | (sub_vals > w_high)].tolist()
                        if len(outliers) > 40:
                            outliers = list(np.random.choice(outliers, 40, replace=False))
                        groups_data.append({
                            "group": str(cat),
                            "count": len(sub_vals),
                            "min": round(v_min, 2),
                            "q1": round(q1, 2),
                            "median": round(median, 2),
                            "q3": round(q3, 2),
                            "max": round(v_max, 2),
                            "whisker_low": round(w_low, 2),
                            "whisker_high": round(w_high, 2),
                            "mean": round(float(sub_vals.mean()), 2),
                            "outliers": [round(float(o), 2) for o in outliers]
                        })
            else:
                sub_vals = pd.to_numeric(df[x_col], errors='coerce').dropna()
                if len(sub_vals) > 0:
                    q1 = float(sub_vals.quantile(0.25))
                    q3 = float(sub_vals.quantile(0.75))
                    median = float(sub_vals.median())
                    v_min = float(sub_vals.min())
                    v_max = float(sub_vals.max())
                    iqr = q3 - q1
                    w_low = max(v_min, q1 - 1.5 * iqr)
                    w_high = min(v_max, q3 + 1.5 * iqr)
                    outliers = sub_vals[(sub_vals < w_low) | (sub_vals > w_high)].tolist()
                    if len(outliers) > 40:
                        outliers = list(np.random.choice(outliers, 40, replace=False))
                    groups_data.append({
                        "group": "Overall",
                        "count": len(sub_vals),
                        "min": round(v_min, 2),
                        "q1": round(q1, 2),
                        "median": round(median, 2),
                        "q3": round(q3, 2),
                        "max": round(v_max, 2),
                        "whisker_low": round(w_low, 2),
                        "whisker_high": round(w_high, 2),
                        "mean": round(float(sub_vals.mean()), 2),
                        "outliers": [round(float(o), 2) for o in outliers]
                    })
            data_payload = {"groups": groups_data}

        elif chart_type == "scatter":
            if not y_col:
                raise ValueError("Scatter plot requires both x_col and y_col.")
            cols_needed = [x_col, y_col]
            if group_by_col and group_by_col in df.columns:
                cols_needed.append(group_by_col)
            
            sub_df = df[cols_needed].copy()
            sub_df[x_col] = pd.to_numeric(sub_df[x_col], errors='coerce')
            sub_df[y_col] = pd.to_numeric(sub_df[y_col], errors='coerce')
            sub_df = sub_df.dropna(subset=[x_col, y_col])

            trendline = None
            if len(sub_df) >= 3:
                x_vals = sub_df[x_col].values
                y_vals = sub_df[y_col].values
                try:
                    res = stats.linregress(x_vals, y_vals)
                    m = float(res.slope)
                    c = float(res.intercept)
                    r = float(res.rvalue)
                    r2 = float(r ** 2)
                    pval = float(res.pvalue)
                    spearman_r, _ = stats.spearmanr(x_vals, y_vals)
                    sign = "+" if c >= 0 else "-"
                    trendline = {
                        "slope": round(m, 4),
                        "intercept": round(c, 4),
                        "pearson_r": round(r, 4),
                        "spearman_r": round(float(spearman_r), 4),
                        "r2": round(r2, 4),
                        "p_value": pval,
                        "equation": f"y = {m:.2f}x {sign} {abs(c):.2f}"
                    }
                except Exception:
                    trendline = None

            max_pts = req.sample_size or 800
            if len(sub_df) > max_pts:
                sampled = True
                plot_df = sub_df.sample(n=max_pts, random_state=42)
            else:
                plot_df = sub_df

            points = []
            for _, r in plot_df.iterrows():
                pt = {
                    "x": round(float(r[x_col]), 2),
                    "y": round(float(r[y_col]), 2),
                }
                if group_by_col and group_by_col in r:
                    pt["group"] = str(r[group_by_col])
                points.append(pt)

            data_payload = {
                "points": points,
                "trendline": trendline,
                "x_stats": {"min": round(float(sub_df[x_col].min()), 2), "max": round(float(sub_df[x_col].max()), 2)},
                "y_stats": {"min": round(float(sub_df[y_col].min()), 2), "max": round(float(sub_df[y_col].max()), 2)}
            }

        elif chart_type == "correlation_heatmap":
            num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
            if len(num_cols) > 14:
                # Select top 14 with most variance
                variances = df[num_cols].var().sort_values(ascending=False)
                num_cols = variances.head(14).index.tolist()

            p_mat = df[num_cols].corr(method='pearson').fillna(0.0)
            s_mat = df[num_cols].corr(method='spearman').fillna(0.0)

            data_payload = {
                "columns": num_cols,
                "pearson_matrix": [[round(float(val), 3) for val in row] for row in p_mat.values],
                "spearman_matrix": [[round(float(val), 3) for val in row] for row in s_mat.values]
            }

        elif chart_type in ["bar", "count"]:
            if x_col not in df.columns:
                raise ValueError(f"Column '{x_col}' not found in dataset.")

            if y_col and y_col in df.columns and req.aggregation in ["mean", "median", "sum"]:
                agg_fn = req.aggregation
                grouped = df.groupby(x_col)[y_col].agg(agg_fn).reset_index()
                grouped.columns = ["label", "value"]
                grouped = grouped.sort_values(by="value", ascending=False).head(15)
                categories = []
                for _, r in grouped.iterrows():
                    categories.append({
                        "label": str(r["label"]),
                        "value": round(float(r["value"]), 2)
                    })
                data_payload = {"categories": categories, "is_aggregated": True, "agg_type": agg_fn}
            else:
                vc = df[x_col].dropna().value_counts().head(15)
                total_cat = vc.sum()
                categories = []
                for label, count in vc.items():
                    categories.append({
                        "label": str(label),
                        "count": int(count),
                        "percentage": round(float(count / total_cat * 100), 2)
                    })
                data_payload = {"categories": categories, "is_aggregated": False}

        elif chart_type == "stacked_bar":
            if x_col not in df.columns:
                raise ValueError(f"Column '{x_col}' not found in dataset.")
            sec_col = group_by_col or target_col
            if not sec_col or sec_col not in df.columns:
                raise ValueError("Stacked bar requires a secondary grouping column.")

            top_x = df[x_col].dropna().value_counts().head(10).index.tolist()
            top_sec = df[sec_col].dropna().value_counts().head(5).index.tolist()
            filtered = df[df[x_col].isin(top_x) & df[sec_col].isin(top_sec)]
            ct = pd.crosstab(filtered[x_col], filtered[sec_col], normalize=False)

            series_dict = {}
            for col_name in ct.columns:
                series_dict[str(col_name)] = [int(v) for v in ct[col_name].tolist()]

            data_payload = {
                "x_categories": [str(c) for c in ct.index.tolist()],
                "groups": [str(g) for g in ct.columns.tolist()],
                "series": series_dict
            }

        elif chart_type == "line":
            if not y_col or y_col not in df.columns:
                raise ValueError("Line chart requires a numeric y_col.")
            
            sub_df = df[[x_col, y_col]].dropna().copy()
            sub_df[y_col] = pd.to_numeric(sub_df[y_col], errors='coerce')
            sub_df = sub_df.dropna(subset=[y_col])

            # Try date sorting
            try:
                sub_df['_date_sort'] = pd.to_datetime(sub_df[x_col], errors='coerce')
                if sub_df['_date_sort'].notna().sum() > len(sub_df) * 0.7:
                    sub_df = sub_df.sort_values(by='_date_sort')
                else:
                    sub_df = sub_df.sort_values(by=x_col)
            except Exception:
                sub_df = sub_df.sort_values(by=x_col)

            if len(sub_df) > 500:
                sampled = True
                sub_df = sub_df.iloc[np.linspace(0, len(sub_df) - 1, 500, dtype=int)]

            pts = [{"x": str(r[x_col]), "y": round(float(r[y_col]), 2)} for _, r in sub_df.iterrows()]
            data_payload = {"points": pts}

        else:
            raise ValueError(f"Unsupported chart type: {chart_type}")

        title = f"{chart_type.replace('_', ' ').title()}: {x_col}" + (f" vs {y_col}" if y_col else "")
        x_label = x_col.replace('_', ' ').title()
        y_label = (y_col.replace('_', ' ').title()) if y_col else ("Frequency" if chart_type in ["histogram", "bar", "count"] else "Value")

        return ChartDataResponse(
            chart_type=chart_type,
            x_col=x_col,
            y_col=y_col,
            group_by_col=group_by_col,
            total_points=total_pts,
            sampled=sampled,
            title=title,
            x_label=x_label,
            y_label=y_label,
            data=data_payload,
            metadata=metadata_payload
        )

    @staticmethod
    def generate_insights(dataset_id: str, target_col: Optional[str] = None) -> AutoInsightsResponse:
        file_path = os.path.join(DATASETS_DIR, dataset_id)
        df = load_dataframe(file_path)

        insights: List[AutoInsightItem] = []
        counter = 1

        num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        cat_cols = df.select_dtypes(exclude=[np.number]).columns.tolist()

        # Determine target column if not supplied
        effective_target = target_col
        if not effective_target and len(num_cols) > 0:
            for cand in ['target', 'label', 'Exam_Score', 'score', 'price', 'salary', 'churn', 'Survived', 'class']:
                matches = [c for c in df.columns if c.lower() == cand.lower()]
                if matches:
                    effective_target = matches[0]
                    break

        # 1. Target Driver Insights
        if effective_target and effective_target in df.columns:
            if effective_target in num_cols:
                # Numeric Target: Correlations
                corrs = []
                for col in num_cols:
                    if col == effective_target:
                        continue
                    valid = df[[col, effective_target]].dropna()
                    if len(valid) >= 10:
                        try:
                            p_r, _ = stats.pearsonr(valid[col], valid[effective_target])
                            s_r, _ = stats.spearmanr(valid[col], valid[effective_target])
                            corrs.append((col, float(p_r), float(s_r)))
                        except Exception:
                            pass
                
                # Sort by absolute Pearson correlation
                corrs.sort(key=lambda x: abs(x[1]), reverse=True)

                for col, p_r, s_r in corrs:
                    abs_r = abs(p_r)
                    dir_str = "positive" if p_r > 0 else "negative"
                    trend_verb = "increases" if p_r > 0 else "decreases"
                    if abs_r >= 0.5:
                        insights.append(AutoInsightItem(
                            id=f"insight_{counter}",
                            title=f"Strong {dir_str.title()} Driver: {col} → {effective_target}",
                            category="target_driver",
                            statistic=f"Pearson r = {p_r:+.2f} | Spearman r_s = {s_r:+.2f}",
                            explanation=f"'{col}' has a strong {dir_str} correlation with '{effective_target}'. As {col} rises, {effective_target} tends to {trend_verb} proportionally.",
                            feature_a=col,
                            feature_b=effective_target,
                            severity="high",
                            chart_preset={"chart_type": "scatter", "x_col": col, "y_col": effective_target}
                        ))
                        counter += 1
                    elif abs_r >= 0.3:
                        insights.append(AutoInsightItem(
                            id=f"insight_{counter}",
                            title=f"Moderate {dir_str.title()} Relationship: {col} → {effective_target}",
                            category="target_driver",
                            statistic=f"Pearson r = {p_r:+.2f}",
                            explanation=f"'{col}' demonstrates a noticeable {dir_str} association with '{effective_target}'.",
                            feature_a=col,
                            feature_b=effective_target,
                            severity="medium",
                            chart_preset={"chart_type": "scatter", "x_col": col, "y_col": effective_target}
                        ))
                        counter += 1

                # Check for weak relationships
                weak_corrs = [c for c in corrs if abs(c[1]) < 0.05]
                for col, p_r, s_r in weak_corrs[:2]:
                    insights.append(AutoInsightItem(
                        id=f"insight_{counter}",
                        title=f"Negligible Driver: {col} & {effective_target}",
                        category="target_driver",
                        statistic=f"Pearson r = {p_r:+.2f}",
                        explanation=f"'{col}' has virtually no linear correlation with '{effective_target}', suggesting it does not directly predict {effective_target}.",
                        feature_a=col,
                        feature_b=effective_target,
                        severity="info",
                        chart_preset={"chart_type": "scatter", "x_col": col, "y_col": effective_target}
                    ))
                    counter += 1
            else:
                # Categorical Target: Group differences
                target_classes = df[effective_target].dropna().value_counts()
                if len(target_classes) >= 2 and len(target_classes) <= 10:
                    for col in num_cols[:4]:
                        grouped_means = df.groupby(effective_target)[col].mean()
                        spread = float(grouped_means.max() - grouped_means.min())
                        overall_std = float(df[col].std()) if len(df) > 1 else 1.0
                        if spread > overall_std * 0.5:
                            insights.append(AutoInsightItem(
                                id=f"insight_{counter}",
                                title=f"Class Disparity: {col} across {effective_target}",
                                category="target_driver",
                                statistic=f"Max group gap = {spread:.2f} ({grouped_means.idxmax()}: {grouped_means.max():.1f} vs {grouped_means.idxmin()}: {grouped_means.min():.1f})",
                                explanation=f"Average '{col}' values differ substantially across classes of '{effective_target}'.",
                                feature_a=col,
                                feature_b=effective_target,
                                severity="high",
                                chart_preset={"chart_type": "boxplot", "x_col": col, "group_by_col": effective_target}
                            ))
                            counter += 1

        # 2. Pairwise feature correlations (outside target)
        pairwise_pairs = []
        for i in range(len(num_cols)):
            for j in range(i + 1, len(num_cols)):
                c1, c2 = num_cols[i], num_cols[j]
                if effective_target and (c1 == effective_target or c2 == effective_target):
                    continue
                valid = df[[c1, c2]].dropna()
                if len(valid) >= 10:
                    try:
                        p_r, _ = stats.pearsonr(valid[c1], valid[c2])
                        if abs(p_r) >= 0.45:
                            pairwise_pairs.append((c1, c2, float(p_r)))
                    except Exception:
                        pass
        pairwise_pairs.sort(key=lambda x: abs(x[2]), reverse=True)
        for c1, c2, r_val in pairwise_pairs[:3]:
            dir_str = "positive" if r_val > 0 else "negative"
            insights.append(AutoInsightItem(
                id=f"insight_{counter}",
                title=f"Multicollinearity Alert: {c1} & {c2}",
                category="correlation",
                statistic=f"Pearson r = {r_val:+.2f}",
                explanation=f"'{c1}' and '{c2}' exhibit high collinearity ({dir_str}). Consider feature selection or regularization to avoid redundant predictors.",
                feature_a=c1,
                feature_b=c2,
                severity="medium",
                chart_preset={"chart_type": "scatter", "x_col": c1, "y_col": c2}
            ))
            counter += 1

        # 3. Outlier Concentrations
        for col in num_cols:
            vals = df[col].dropna()
            if len(vals) >= 15:
                q1 = float(vals.quantile(0.25))
                q3 = float(vals.quantile(0.75))
                iqr = q3 - q1
                if iqr > 0:
                    outliers = vals[(vals < q1 - 1.5 * iqr) | (vals > q3 + 1.5 * iqr)]
                    pct = len(outliers) / len(vals) * 100
                    if pct >= 3.0:
                        insights.append(AutoInsightItem(
                            id=f"insight_{counter}",
                            title=f"Outlier Anomaly Detected: {col}",
                            category="outlier",
                            statistic=f"{len(outliers)} outliers ({pct:.1f}% of values)",
                            explanation=f"'{col}' contains {len(outliers)} observations outside 1.5x IQR boundaries. Verify if these represent valid high values or data entry errors.",
                            feature_a=col,
                            severity="medium" if pct < 8.0 else "high",
                            chart_preset={"chart_type": "boxplot", "x_col": col}
                        ))
                        counter += 1

        # 4. Distribution Skewness
        for col in num_cols:
            vals = df[col].dropna()
            if len(vals) >= 20:
                try:
                    skew_val = float(stats.skew(vals))
                    if abs(skew_val) >= 1.2:
                        direction = "right-skewed (positive tail)" if skew_val > 0 else "left-skewed (negative tail)"
                        insights.append(AutoInsightItem(
                            id=f"insight_{counter}",
                            title=f"Asymmetric Distribution: {col}",
                            category="distribution",
                            statistic=f"Skewness = {skew_val:+.2f}",
                            explanation=f"'{col}' is heavily {direction}. A logarithmic or Box-Cox transformation may improve linear model performance.",
                            feature_a=col,
                            severity="low",
                            chart_preset={"chart_type": "histogram", "x_col": col}
                        ))
                        counter += 1
                except Exception:
                    pass

        # 5. Categorical Class Imbalance
        for col in cat_cols:
            vc = df[col].dropna().value_counts()
            if len(vc) > 1:
                top_pct = float(vc.iloc[0] / vc.sum() * 100)
                if top_pct >= 75.0:
                    insights.append(AutoInsightItem(
                        id=f"insight_{counter}",
                        title=f"Heavy Category Imbalance: {col}",
                        category="imbalance",
                        statistic=f"'{vc.index[0]}' represents {top_pct:.1f}%",
                        explanation=f"Column '{col}' is heavily skewed toward '{vc.index[0]}'. Minor classes may suffer poor representation.",
                        feature_a=col,
                        severity="medium",
                        chart_preset={"chart_type": "bar", "x_col": col}
                    ))
                    counter += 1

        # 6. High Missing Data
        for col in df.columns:
            null_count = int(df[col].isnull().sum())
            null_pct = float(null_count / len(df) * 100) if len(df) > 0 else 0
            if null_pct >= 10.0:
                insights.append(AutoInsightItem(
                    id=f"insight_{counter}",
                    title=f"Data Quality Alert: Missing Data in {col}",
                    category="quality",
                    statistic=f"{null_count} missing rows ({null_pct:.1f}%)",
                    explanation=f"Column '{col}' is missing significant data. Imputation or column pruning recommended.",
                    feature_a=col,
                    severity="high" if null_pct > 25.0 else "medium",
                    chart_preset={"chart_type": "bar", "x_col": col}
                ))
                counter += 1

        return AutoInsightsResponse(
            dataset_id=dataset_id,
            target_column=effective_target,
            total_insights=len(insights),
            insights=insights
        )

