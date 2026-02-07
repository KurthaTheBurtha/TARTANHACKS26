from fastapi import APIRouter
from app.api.v1 import docs, chat, providers, policies, me
from app.core.config import settings

api_router = APIRouter()

api_router.include_router(
    me.router,
    prefix="/me",
    tags=["auth"]
)

api_router.include_router(
    docs.router,
    prefix="/docs",
    tags=["documents"]
)

api_router.include_router(
    chat.router,
    prefix="/chat",
    tags=["chat"]
)

api_router.include_router(
    providers.router,
    prefix="/providers",
    tags=["providers"]
)

api_router.include_router(
    policies.router,
    prefix="/policies",
    tags=["policies"]
)
