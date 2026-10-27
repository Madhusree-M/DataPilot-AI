from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.datasets import router as datasets_router
from app.api.eda import router as eda_router
from app.api.cleaning import router as cleaning_router
from app.api.automl import router as automl_router
from app.api.chat import router as chat_router
from app.api.reports import router as reports_router

app = FastAPI(
    title="DataPilot AI API",
    description="Backend API for DataPilot AI - Autonomous AI Data Scientist",
    version="1.0.0",
)

# Enable CORS for local web development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(datasets_router)
app.include_router(eda_router)
app.include_router(cleaning_router)
app.include_router(automl_router)
app.include_router(chat_router)
app.include_router(reports_router)


@app.get("/")
def read_root():
    return {
        "message": "DataPilot AI API is running",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
