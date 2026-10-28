from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class ColumnProfile(BaseModel):
    name: str
    dtype: str
    inferred_type: str  # numeric, categorical, boolean, datetime, text
    total_count: int
    missing_count: int
    missing_percentage: float
    unique_count: int
    unique_percentage: float
    # Numeric stats
    mean: Optional[float] = None
    std: Optional[float] = None
    median: Optional[float] = None
    min: Optional[float] = None
    max: Optional[float] = None
    q25: Optional[float] = None
    q75: Optional[float] = None
    skewness: Optional[float] = None
    kurtosis: Optional[float] = None
    outlier_count: Optional[int] = None
    # Categorical stats
    top_values: Optional[List[Dict[str, Any]]] = None  # [{value: 'x', count: 10, percent: 12.5}]
    # Distribution histogram bins
    histogram: Optional[Dict[str, Any]] = None  # {bins: [...], counts: [...]}

class CorrelationPair(BaseModel):
    feature_a: str
    feature_b: str
    correlation: float
    abs_correlation: float

class HealthWarning(BaseModel):
    type: str  # 'missing', 'high_cardinality', 'imbalance', 'outliers', 'duplicate_rows'
    severity: str  # 'low', 'medium', 'high'
    column: Optional[str] = None
    message: str
    recommendation: str

class EDAResponse(BaseModel):
    dataset_id: str
    dataset_name: str
    row_count: int
    col_count: int
    duplicate_rows_count: int
    memory_usage_mb: float
    missing_cells_count: int = 0
    missing_cells_percentage: float = 0.0
    columns_with_missing_count: int = 0
    health_score: int  # 0 to 100
    warnings: List[HealthWarning]
    column_profiles: List[ColumnProfile]
    numeric_columns: List[str]
    categorical_columns: List[str]
    correlation_matrix: Dict[str, Dict[str, Optional[float]]]
    top_correlations: List[CorrelationPair]
    missing_matrix: Dict[str, float]

class ChartDataRequest(BaseModel):
    chart_type: str  # 'histogram', 'boxplot', 'scatter', 'correlation_heatmap', 'bar', 'stacked_bar', 'line'
    x_col: str
    y_col: Optional[str] = None
    group_by_col: Optional[str] = None
    target_col: Optional[str] = None
    correlation_method: Optional[str] = "pearson"  # 'pearson' or 'spearman'
    bins: Optional[int] = 15
    aggregation: Optional[str] = "count"  # 'count', 'mean', 'median', 'sum'
    sample_size: Optional[int] = 800
    filters: Optional[Dict[str, Any]] = None

class ChartDataResponse(BaseModel):
    chart_type: str
    x_col: str
    y_col: Optional[str] = None
    group_by_col: Optional[str] = None
    total_points: int
    sampled: bool = False
    title: str
    x_label: str
    y_label: str
    data: Dict[str, Any]  # Chart-specific payload (bins, box stats, scatter points, trendline, etc.)
    metadata: Optional[Dict[str, Any]] = None

class AutoInsightItem(BaseModel):
    id: str
    title: str
    category: str  # 'correlation', 'target_driver', 'distribution', 'outlier', 'imbalance', 'quality'
    statistic: str
    explanation: str
    feature_a: str
    feature_b: Optional[str] = None
    severity: str  # 'high', 'medium', 'low', 'info'
    chart_preset: Dict[str, Any]

class AutoInsightsResponse(BaseModel):
    dataset_id: str
    target_column: Optional[str] = None
    total_insights: int
    insights: List[AutoInsightItem]

class TopChartCard(BaseModel):
    id: str
    headline: str
    insight_text: str
    badge: str
    chart_data: ChartDataResponse

class TopChartsResponse(BaseModel):
    dataset_id: str
    target_column: Optional[str] = None
    charts: List[TopChartCard]
