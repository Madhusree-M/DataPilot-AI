from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.services.eda_service import EDAService
from app.schemas.eda import (
    EDAResponse,
    ChartDataRequest,
    ChartDataResponse,
    AutoInsightsResponse,
    TopChartsResponse
)

router = APIRouter(prefix="/api/eda", tags=["eda"])

@router.get("/{dataset_id}", response_model=EDAResponse)
def get_eda(dataset_id: str):
    """Run automated Exploratory Data Analysis (EDA) on a dataset."""
    try:
        return EDAService.analyze_dataset(dataset_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"EDA calculation error: {str(e)}")

@router.post("/{dataset_id}/chart-data", response_model=ChartDataResponse)
def get_chart_data(dataset_id: str, request: ChartDataRequest):
    """Generate dynamic chart-ready aggregated or sampled data for any chart type."""
    try:
        return EDAService.get_chart_data(dataset_id, request)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chart generation error: {str(e)}")

@router.get("/{dataset_id}/insights", response_model=AutoInsightsResponse)
def get_insights(dataset_id: str, target_column: Optional[str] = Query(None)):
    """Generate dynamic statistical insights, driver analyses, and anomalies for a dataset."""
    try:
        return EDAService.generate_insights(dataset_id, target_column)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Insights generation error: {str(e)}")

@router.get("/{dataset_id}/top-charts", response_model=TopChartsResponse)
def get_top_charts(dataset_id: str, target_column: Optional[str] = Query(None)):
    """Curate and generate the top 5 most analytical visualizations for the dataset."""
    try:
        return EDAService.get_top_charts(dataset_id, target_column)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Top charts generation error: {str(e)}")


