"""
Document analyzer service; uses shared LLM client for summary when configured.
Falls back to deterministic mock extraction when no LLM key is set.
"""
import io
from typing import Dict, Any, Optional
from app.core.config import settings
from app.core.logging import safe_log_info, safe_log_error
from app.llm import summarize_document


class ExtractionResult:
    """Result from document analysis."""
    def __init__(
        self,
        provider: str,
        service_date: str,
        patient_responsibility: float,
        line_items: list,
        plain_english_summary: str,
        next_steps: list,
        raw_extraction: Optional[Dict[str, Any]] = None
    ):
        self.provider = provider
        self.service_date = service_date
        self.patient_responsibility = patient_responsibility
        self.line_items = line_items
        self.plain_english_summary = plain_english_summary
        self.next_steps = next_steps
        self.raw_extraction = raw_extraction or {}


def _extract_text_from_pdf(file_bytes: bytes) -> Optional[str]:
    """Extract raw text from PDF for summarization. Returns None if not PDF or extraction fails."""
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            parts = []
            for page in pdf.pages[:10]:
                t = page.extract_text()
                if t:
                    parts.append(t)
            return "\n".join(parts).strip() if parts else None
    except Exception:
        return None


async def analyze_document(file_bytes: bytes, mime_type: str) -> ExtractionResult:
    """
    Analyze a document and extract structured data.
    Uses shared LLM client (OpenAI/Gemini) for plain-English summary when a key is set;
    otherwise returns mock data. Structured extraction (line items, etc.) remains mock until Vision/OCR is added.
    """
    mock = _get_mock_extraction()
    has_llm = (
        (settings.openai_api_key and settings.openai_api_key.strip())
        or (settings.gemini_api_key and settings.gemini_api_key.strip())
    )
    if has_llm and mime_type and "pdf" in mime_type.lower():
        text = _extract_text_from_pdf(file_bytes)
        if text:
            try:
                summary = await summarize_document(text)
                if summary and not summary.strip().startswith("[LLM mock]"):
                    return ExtractionResult(
                        provider=mock.provider,
                        service_date=mock.service_date,
                        patient_responsibility=mock.patient_responsibility,
                        line_items=mock.line_items,
                        plain_english_summary=summary,
                        next_steps=mock.next_steps,
                        raw_extraction=mock.raw_extraction,
                    )
            except Exception as e:
                safe_log_error("LLM summarization failed, using mock summary", e)
    else:
        safe_log_info("No LLM key or no PDF text, using mock extraction")
    return mock


def _get_mock_extraction() -> ExtractionResult:
    """Return deterministic mock extraction matching contract."""
    return ExtractionResult(
        provider="Example Medical Group",
        service_date="2025-11-03",
        patient_responsibility=215.44,
        line_items=[
            {
                "description": "Office visit",
                "cpt": "99213",
                "billed": 310.0,
                "allowed": 180.0,
                "plan_paid": 0.0,
                "you_owe": 180.0,
                "network_status": "in_network"
            }
        ],
        plain_english_summary="Your plan reduced the charge to an allowed amount. Because your deductible applies, you may owe the allowed amount.",
        next_steps=[
            "Confirm the provider was in-network on the date of service.",
            "Check whether the deductible was already met.",
            "If this looks wrong, request an itemized bill and compare CPT codes."
        ],
        raw_extraction={}
    )
