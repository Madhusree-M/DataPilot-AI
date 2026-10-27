import os
import re
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from app.utils.helpers import DATASETS_DIR, load_dataframe, sanitize_value, sanitize_dict
from app.schemas.chat import ChatQueryRequest, ChatQueryResponse, DataInsight

class ChatService:
    @staticmethod
    def answer_query(request: ChatQueryRequest) -> ChatQueryResponse:
        file_path = os.path.join(DATASETS_DIR, request.dataset_id)
        df = load_dataframe(file_path)

        query = request.message.strip().lower()
        cols = list(df.columns)
        cols_lower = {str(c).lower(): str(c) for c in cols}

        reply = ""
        insights: List[DataInsight] = []
        chart_suggestion: Optional[Dict[str, Any]] = None
        computed_data: Optional[Dict[str, Any]] = None

        # 1. Summary / Overview question
        if any(w in query for w in ["summary", "summarize", "overview", "describe", "tell me about this data", "what is this dataset"]):
            num_rows, num_cols = df.shape
            missing_total = int(df.isnull().sum().sum())
            numeric_cols = [c for c in cols if pd.api.types.is_numeric_dtype(df[c])]
            cat_cols = [c for c in cols if c not in numeric_cols]

            reply = (
                f"### 📊 Dataset Overview\n\n"
                f"- **Total Rows:** {num_rows:,}\n"
                f"- **Total Columns:** {num_cols}\n"
                f"- **Missing Values:** {missing_total:,} cells ({round(missing_total / (num_rows * num_cols) * 100, 2)}%)\n"
                f"- **Numeric Features ({len(numeric_cols)}):** {', '.join(numeric_cols[:6])}{'...' if len(numeric_cols) > 6 else ''}\n"
                f"- **Categorical Features ({len(cat_cols)}):** {', '.join(cat_cols[:6])}{'...' if len(cat_cols) > 6 else ''}\n\n"
                f"**Data Scientist Recommendation:** This dataset is ready for exploration. You can run automated EDA to inspect distributions or head to the AutoML tab to train predictive models."
            )
            insights.append(
                DataInsight(
                    type="stat",
                    title="Dataset Dimensions",
                    description=f"Loaded {num_rows} rows and {num_cols} attributes.",
                )
            )

        # 2. Missing values question
        elif any(w in query for w in ["missing", "null", "nan", "empty"]):
            missing = df.isnull().sum()
            missing_cols = missing[missing > 0].sort_values(ascending=False)

            if len(missing_cols) == 0:
                reply = "🎉 **Great news!** This dataset contains **zero** missing values across all columns."
            else:
                top_missing_str = "\n".join([f"- **`{col}`**: {cnt:,} missing ({round(cnt/len(df)*100, 1)}%)" for col, cnt in missing_cols.items()])
                reply = (
                    f"### ⚠️ Missing Values Breakdown\n\n"
                    f"Detected missing values in **{len(missing_cols)}** columns:\n\n"
                    f"{top_missing_str}\n\n"
                    f"**Recommendation:** Visit the **Smart Clean** tab to impute these columns using median/mode or drop them before training."
                )
                chart_suggestion = {
                    "type": "bar",
                    "title": "Missing Values Count by Column",
                    "x_label": "Column",
                    "y_label": "Missing Count",
                    "data": [{"name": str(c), "value": int(cnt)} for c, cnt in missing_cols.items()],
                }

        # 3. Correlation question
        elif any(w in query for w in ["correlation", "correlated", "relationship", "relation"]):
            numeric_cols = [c for c in cols if pd.api.types.is_numeric_dtype(df[c])]
            if len(numeric_cols) < 2:
                reply = "There are fewer than 2 numeric columns in this dataset, so correlation cannot be calculated."
            else:
                corr = df[numeric_cols].corr()
                pairs = []
                for i in range(len(numeric_cols)):
                    for j in range(i + 1, len(numeric_cols)):
                        c1, c2 = numeric_cols[i], numeric_cols[j]
                        val = corr.loc[c1, c2]
                        if not pd.isna(val):
                            pairs.append((c1, c2, float(val)))
                pairs.sort(key=lambda x: abs(x[2]), reverse=True)
                top_pairs = pairs[:5]

                pair_str = "\n".join([f"- **`{p[0]}`** & **`{p[1]}`**: `{round(p[2], 3)}` ({'Strong Positive' if p[2] > 0.6 else 'Moderate Positive' if p[2] > 0.3 else 'Strong Negative' if p[2] < -0.6 else 'Moderate Negative' if p[2] < -0.3 else 'Weak'})" for p in top_pairs])
                reply = (
                    f"### 🔗 Key Correlations\n\n"
                    f"The highest correlations among numeric features are:\n\n"
                    f"{pair_str}\n\n"
                    f"Features with high mutual correlation (> 0.8) may lead to multicollinearity in linear models."
                )

        # 4. Outliers question
        elif any(w in query for w in ["outlier", "anomaly", "extreme"]):
            numeric_cols = [c for c in cols if pd.api.types.is_numeric_dtype(df[c])]
            outlier_results = []
            for col in numeric_cols:
                clean = df[col].dropna()
                if len(clean) > 0:
                    q25 = clean.quantile(0.25)
                    q75 = clean.quantile(0.75)
                    iqr = q75 - q25
                    lower = q25 - 1.5 * iqr
                    upper = q75 + 1.5 * iqr
                    outliers = clean[(clean < lower) | (clean > upper)]
                    if len(outliers) > 0:
                        outlier_results.append((col, len(outliers), round(len(outliers)/len(clean)*100, 1)))

            outlier_results.sort(key=lambda x: x[1], reverse=True)
            if not outlier_results:
                reply = "No significant outliers detected using the 1.5x IQR method across numeric features."
            else:
                outlier_str = "\n".join([f"- **`{c}`**: {cnt} outliers ({pct}%)" for c, cnt, pct in outlier_results[:6]])
                reply = (
                    f"### 🎯 Outliers Detected (IQR Method)\n\n"
                    f"{outlier_str}\n\n"
                    f"**Action:** You can use IQR clipping in the **Smart Clean** tab to cap extreme outliers without discarding data."
                )

        # 5. Column-specific query (e.g., "average age", "max fare", "distribution of churn")
        else:
            # Check if any column name is mentioned
            matched_col = None
            for c_lower, c_orig in cols_lower.items():
                if c_lower in query:
                    matched_col = c_orig
                    break

            if matched_col:
                series = df[matched_col]
                if pd.api.types.is_numeric_dtype(series):
                    mean_val = round(float(series.mean()), 2)
                    median_val = round(float(series.median()), 2)
                    min_val = round(float(series.min()), 2)
                    max_val = round(float(series.max()), 2)
                    std_val = round(float(series.std()), 2)

                    reply = (
                        f"### 📈 Statistics for `{matched_col}`\n\n"
                        f"- **Mean:** {mean_val}\n"
                        f"- **Median:** {median_val}\n"
                        f"- **Std Deviation:** {std_val}\n"
                        f"- **Min / Max:** {min_val} / {max_val}\n"
                        f"- **Missing:** {int(series.isnull().sum())} ({round(series.isnull().sum()/len(df)*100, 1)}%)\n"
                    )

                    # Binned distribution
                    try:
                        counts, bins = np.histogram(series.dropna(), bins=8)
                        chart_suggestion = {
                            "type": "bar",
                            "title": f"Distribution of {matched_col}",
                            "x_label": matched_col,
                            "y_label": "Frequency",
                            "data": [{"name": f"{round(bins[i], 1)}-{round(bins[i+1], 1)}", "value": int(counts[i])} for i in range(len(counts))],
                        }
                    except Exception:
                        pass
                else:
                    # Categorical column breakdown
                    counts = series.value_counts().head(8)
                    counts_str = "\n".join([f"- **`{val}`**: {cnt:,} ({round(cnt/len(df)*100, 1)}%)" for val, cnt in counts.items()])
                    reply = (
                        f"### 🏷️ Top Values for `{matched_col}`\n\n"
                        f"{counts_str}\n\n"
                        f"- **Total Unique Values:** {series.nunique():,}\n"
                        f"- **Missing:** {int(series.isnull().sum())}"
                    )
                    chart_suggestion = {
                        "type": "bar",
                        "title": f"Top Categories in {matched_col}",
                        "x_label": matched_col,
                        "y_label": "Count",
                        "data": [{"name": str(k), "value": int(v)} for k, v in counts.items()],
                    }
            else:
                # General query fallback
                reply = (
                    f"I analyzed your question regarding **`{request.dataset_id}`**.\n\n"
                    f"You can ask me specific questions like:\n"
                    f"- *'Summarize the dataset'*\n"
                    f"- *'Which columns have missing values?'*\n"
                    f"- *'What are the strongest correlations?'*\n"
                    f"- *'Show stats for [column name]'*\n"
                    f"- *'Are there any outliers?'*\n\n"
                    f"Available columns: {', '.join([f'`{c}`' for c in cols[:8]])}{'...' if len(cols) > 8 else ''}"
                )

        return ChatQueryResponse(
            reply=reply,
            insights=insights,
            chart_suggestion=chart_suggestion,
            computed_data=computed_data,
        )
