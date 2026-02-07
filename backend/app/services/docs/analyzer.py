"""
Document analyzer service with OpenAI Vision stub.
Falls back to deterministic mock extraction if OpenAI key is missing.
"""
from typing import Dict, Any, Optional
from app.core.config import settings
from app.core.logging import safe_log_info, safe_log_error


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


def analyze_document(file_bytes: bytes, mime_type: str) -> ExtractionResult:
    """
    Analyze a document and extract structured data.
    Uses OpenAI Vision if key is available, otherwise returns mock data.
    """
    # Check if OpenAI is configured
    if settings.openai_api_key:
        try:
            # TODO: Implement OpenAI Vision API call
            # For now, return mock even if key exists (stub implementation)
            safe_log_info("OpenAI key present but using stub implementation")
            return _get_mock_extraction()
        except Exception as e:
            safe_log_error("OpenAI analysis failed, falling back to mock", e)
            return _get_mock_extraction()
    else:
        safe_log_info("OpenAI key not configured, using mock extraction")
        return _get_mock_extraction()


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
