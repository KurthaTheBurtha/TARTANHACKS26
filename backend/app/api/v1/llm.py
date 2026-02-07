"""
LLM smoke/health endpoints to verify provider-agnostic client.
No auth required for smoke (demo); optionally protect in production.
"""
from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import settings
from app.llm import LLMProvider, generate_text

router = APIRouter()


class LLMHealthResponse(BaseModel):
    provider: str
    openai_configured: bool
    gemini_configured: bool
    message: str


class LLMSmokeResponse(BaseModel):
    ok: bool
    provider: str
    response_preview: str
    mock_used: bool


@router.get("/health", response_model=LLMHealthResponse)
async def llm_health():
    """
    Report which LLM provider is active and which keys are configured.
    Never returns secret values.
    """
    provider = (settings.llm_provider or "openai").strip().lower()
    if provider not in ("openai", "gemini"):
        provider = "openai"
    openai_ok = bool(settings.openai_api_key and settings.openai_api_key.strip())
    gemini_ok = bool(settings.gemini_api_key and settings.gemini_api_key.strip())
    active_ok = (provider == "openai" and openai_ok) or (provider == "gemini" and gemini_ok)
    message = (
        "Live responses enabled."
        if active_ok
        else "Configure OPENAI_API_KEY or GEMINI_API_KEY and set LLM_PROVIDER for live responses."
    )
    return LLMHealthResponse(
        provider=provider,
        openai_configured=openai_ok,
        gemini_configured=gemini_ok,
        message=message,
    )


@router.get("/smoke", response_model=LLMSmokeResponse)
@router.post("/smoke", response_model=LLMSmokeResponse)
async def llm_smoke():
    """
    Call generate_text with a minimal prompt to prove the LLM client works.
    Returns a short preview of the response; mock used if no key is set.
    """
    provider = (settings.llm_provider or "openai").strip().lower()
    if provider not in ("openai", "gemini"):
        provider = "openai"
    prov_enum = LLMProvider.GEMINI if provider == "gemini" else LLMProvider.OPENAI
    text = await generate_text(
        prompt="Reply with exactly: OK",
        system=None,
        provider=prov_enum,
        model=None,
        temperature=0.0,
    )
    mock_used = text.strip().startswith("[LLM mock]") if text else True
    preview = (text or "")[:200].strip()
    return LLMSmokeResponse(
        ok=bool(text),
        provider=provider,
        response_preview=preview,
        mock_used=mock_used,
    )
