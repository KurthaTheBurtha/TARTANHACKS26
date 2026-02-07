from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router
from app.core.config import settings
from app.models.schemas import HealthResponse

app = FastAPI(
    title="Healthcare Document Analysis API",
    description="Backend API for analyzing healthcare documents and providing chat assistance",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(ok=True)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Healthcare Document Analysis API",
        "version": "1.0.0",
        "docs": "/docs"
    }
