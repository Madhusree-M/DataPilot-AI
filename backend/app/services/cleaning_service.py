import os
import time
import numpy as np
import pandas as pd
from typing import List, Tuple
from sklearn.preprocessing import StandardScaler, MinMaxScaler, LabelEncoder
from app.utils.helpers import DATASETS_DIR, load_dataframe
from app.schemas.cleaning import CleaningConfig, CleaningResponse

class CleaningService:
    @staticmethod
    def clean_dataset(config: CleaningConfig) -> CleaningResponse:
        file_path = os.path.join(DATASETS_DIR, config.dataset_id)
        df = load_dataframe(file_path).copy()

        original_shape = [int(df.shape[0]), int(df.shape[1])]
        missing_before = int(df.isnull().sum().sum())
        actions_performed: List[str] = []
        duplicates_removed = 0

        # 1. Drop user-selected columns
        if config.drop_columns:
            valid_drops = [c for c in config.drop_columns if c in df.columns]
            if valid_drops:
                df.drop(columns=valid_drops, inplace=True)
                actions_performed.append(f"Dropped {len(valid_drops)} columns: {', '.join(valid_drops)}")

        # 2. Drop duplicates
        if config.drop_duplicates:
            dups = int(df.duplicated().sum())
            if dups > 0:
                df.drop_duplicates(inplace=True)
                duplicates_removed = dups
                actions_performed.append(f"Removed {dups} duplicate rows")

        # 3. Numeric imputation
        numeric_cols = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
        categorical_cols = [c for c in df.columns if c not in numeric_cols]

        if config.impute_numeric != "none":
            for col in numeric_cols:
                n_miss = int(df[col].isnull().sum())
                if n_miss > 0:
                    if config.impute_numeric == "median":
                        val = df[col].median()
                        df[col] = df[col].fillna(val)
                        actions_performed.append(f"Imputed {n_miss} missing values in numeric '{col}' with median ({round(val, 2)})")
                    elif config.impute_numeric == "mean":
                        val = df[col].mean()
                        df[col] = df[col].fillna(val)
                        actions_performed.append(f"Imputed {n_miss} missing values in numeric '{col}' with mean ({round(val, 2)})")
                    elif config.impute_numeric == "zero":
                        df[col] = df[col].fillna(0)
                        actions_performed.append(f"Imputed {n_miss} missing values in numeric '{col}' with 0")
                    elif config.impute_numeric == "drop":
                        df.dropna(subset=[col], inplace=True)
                        actions_performed.append(f"Dropped {n_miss} rows with missing '{col}'")

        # 4. Categorical imputation
        if config.impute_categorical != "none":
            for col in categorical_cols:
                n_miss = int(df[col].isnull().sum())
                if n_miss > 0:
                    if config.impute_categorical == "mode":
                        mode_val = df[col].mode()
                        val = mode_val.iloc[0] if len(mode_val) > 0 else "Missing"
                        df[col] = df[col].fillna(val)
                        actions_performed.append(f"Imputed {n_miss} missing values in categorical '{col}' with mode ('{val}')")
                    elif config.impute_categorical == "missing":
                        df[col] = df[col].fillna("Missing")
                        actions_performed.append(f"Imputed {n_miss} missing values in categorical '{col}' with 'Missing'")
                    elif config.impute_categorical == "drop":
                        df.dropna(subset=[col], inplace=True)
                        actions_performed.append(f"Dropped {n_miss} rows with missing '{col}'")

        # 5. Outlier handling
        if config.outlier_strategy in ["clip", "drop"]:
            current_numeric = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
            for col in current_numeric:
                q25 = df[col].quantile(0.25)
                q75 = df[col].quantile(0.75)
                iqr = q75 - q25
                lower = q25 - 1.5 * iqr
                upper = q75 + 1.5 * iqr

                if config.outlier_strategy == "clip":
                    outlier_mask = (df[col] < lower) | (df[col] > upper)
                    n_outliers = int(outlier_mask.sum())
                    if n_outliers > 0:
                        df[col] = df[col].clip(lower=lower, upper=upper)
                        actions_performed.append(f"Clipped {n_outliers} outliers in '{col}' to bounds [{round(lower, 2)}, {round(upper, 2)}]")
                elif config.outlier_strategy == "drop":
                    outlier_mask = (df[col] < lower) | (df[col] > upper)
                    n_outliers = int(outlier_mask.sum())
                    if n_outliers > 0:
                        df = df[~outlier_mask]
                        actions_performed.append(f"Dropped {n_outliers} outlier rows based on '{col}'")

        # 6. Categorical encoding
        if config.encode_categorical != "none":
            cat_to_encode = [c for c in df.columns if not pd.api.types.is_numeric_dtype(df[c])]
            if config.encode_categorical == "label":
                for col in cat_to_encode:
                    le = LabelEncoder()
                    df[col] = le.fit_transform(df[col].astype(str))
                actions_performed.append(f"Label encoded {len(cat_to_encode)} categorical columns: {', '.join(cat_to_encode)}")
            elif config.encode_categorical == "onehot":
                # Only onehot encode columns with reasonable cardinality (< 20 unique)
                low_card_cols = [c for c in cat_to_encode if df[c].nunique() <= 20]
                if low_card_cols:
                    df = pd.get_dummies(df, columns=low_card_cols, drop_first=True)
                    actions_performed.append(f"One-Hot encoded columns: {', '.join(low_card_cols)}")

        # 7. Numeric scaling
        if config.scale_numeric != "none":
            cols_to_scale = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
            if cols_to_scale:
                if config.scale_numeric == "standard":
                    scaler = StandardScaler()
                    df[cols_to_scale] = scaler.fit_transform(df[cols_to_scale])
                    actions_performed.append(f"Applied StandardScaler to numeric columns")
                elif config.scale_numeric == "minmax":
                    scaler = MinMaxScaler()
                    df[cols_to_scale] = scaler.fit_transform(df[cols_to_scale])
                    actions_performed.append(f"Applied MinMaxScaler to numeric columns")

        # Reset index
        df.reset_index(drop=True, inplace=True)

        cleaned_shape = [int(df.shape[0]), int(df.shape[1])]
        missing_after = int(df.isnull().sum().sum())

        # Generate output filename
        if config.output_filename and config.output_filename.strip():
            output_name = config.output_filename.strip()
            if not output_name.endswith(".csv"):
                output_name += ".csv"
        else:
            base, ext = os.path.splitext(config.dataset_id)
            timestamp = int(time.time())
            output_name = f"{base}_cleaned_{timestamp}.csv"

        clean_output_path = os.path.join(DATASETS_DIR, output_name)
        df.to_csv(clean_output_path, index=False)

        if not actions_performed:
            actions_performed.append("Dataset validated: no changes required based on current configuration.")

        return CleaningResponse(
            original_dataset_id=config.dataset_id,
            cleaned_dataset_id=output_name,
            cleaned_filename=output_name,
            original_shape=original_shape,
            cleaned_shape=cleaned_shape,
            actions_performed=actions_performed,
            missing_before=missing_before,
            missing_after=missing_after,
            duplicates_removed=duplicates_removed,
        )
