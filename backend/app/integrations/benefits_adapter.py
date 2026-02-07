"""
Benefits adapter: extract insurance benefits from SOB PDF (backend PDF extract or placeholder).
No PII in logs.
"""
from __future__ import annotations

import os
from typing import Tuple, Optional
from app.schemas.caremap import InsuranceBenefits, IntegrationError
from app.core.logging import safe_log_info, safe_log_error


def _mock_insurance_benefits() -> InsuranceBenefits:
    """Placeholder when SOB not provided or extraction fails."""
    return InsuranceBenefits(
        deductible_individual=None,
        deductible_family=None,
        oop_max_individual=None,
        oop_max_family=None,
        in_network_rules=[],
        out_network_rules=[],
        disclaimers=["Benefits could not be extracted. Use your plan documents for exact amounts."],
    )


def _extract_text(path: str) -> Optional[str]:
    """Use backend PDF extraction if available."""
    try:
        from app.services.policies.pdf_extract import extract_text_from_pdf
        with open(path, "rb") as f:
            return extract_text_from_pdf(f.read())
    except Exception:
        return None


def _parse_benefits_from_text(text: str) -> InsuranceBenefits:
    """
    Lightweight placeholder: look for common patterns or return unknown.
    Does not store or log raw text (PII-safe).
    """
    # Minimal heuristic: no PII, just numeric-like patterns for demo
    result = InsuranceBenefits(
        deductible_individual=None,
        deductible_family=None,
        oop_max_individual=None,
        oop_max_family=None,
        in_network_rules=[],
        out_network_rules=[],
        disclaimers=["Summary of benefits was read; specific amounts require full policy review."],
    )
    if not text or len(text) < 50:
        return _mock_insurance_benefits()
    lower = text.lower()
    if "deductible" in lower:
        result.in_network_rules.append("Deductible may apply (see plan for amounts).")
    if "out of pocket" in lower or "oop" in lower:
        result.out_network_rules.append("Out-of-pocket maximum may apply.")
    return result


async def parse_benefits(sob_pdf_path: Optional[str]) -> Tuple[InsuranceBenefits, Optional[IntegrationError]]:
    """
    Parse SOB PDF into insurance benefits. If path is None or empty, return placeholder.
    Returns (InsuranceBenefits, None) or (placeholder, IntegrationError).
    """
    if not sob_pdf_path or not os.path.isfile(sob_pdf_path):
        return _mock_insurance_benefits(), None

    text = _extract_text(sob_pdf_path)
    if not text:
        safe_log_info("SOB text extraction returned empty")
        return _mock_insurance_benefits(), IntegrationError(
            component="rag",
            message="Could not extract text from summary of benefits PDF.",
            recoverable=True,
        )

    benefits = _parse_benefits_from_text(text)
    return benefits, None


class BenefitsAdapter:
    async def parse_benefits(self, sob_pdf_path: Optional[str]) -> Tuple[InsuranceBenefits, Optional[IntegrationError]]:
        return await parse_benefits(sob_pdf_path)

    def is_live(self) -> bool:
        # "Live" if we have PDF extract available (backend has the service)
        try:
            from app.services.policies.pdf_extract import extract_text_from_pdf
            return True
        except Exception:
            return False


benefits_adapter = BenefitsAdapter()
