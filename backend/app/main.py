import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router
from app.core.config import settings
from app.models.schemas import HealthResponse

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: env guardrails (never log secrets)
    if settings.is_mock_supabase():
        logger.warning(
            "Supabase not configured (SUPABASE_URL/SUPABASE_ANON_KEY missing or mock). "
            "Using mock mode for DB and storage. Set env vars for real Supabase."
        )
    else:
        logger.info("Supabase configured (credentials redacted).")
    if settings.is_mock_openai():
        logger.warning(
            "OPENAI_API_KEY not set. RAG and embeddings will use stub/mock mode. "
            "Set OPENAI_API_KEY for live OpenAI."
        )
    else:
        logger.info("OpenAI configured (key redacted).")
    yield
    # Shutdown: nothing to do
    return


app = FastAPI(
    title="Healthcare Document Analysis API",
    description="Backend API for analyzing healthcare documents and providing chat assistance",
    version="1.0.0",
    lifespan=lifespan,
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
