"""
Bill parser adapter: call Kurt's bill-parser (HTTP) or return mock.
No PII in logs (do not log member_id, names, addresses from documents).
"""
from __future__ import annotations

import json
import os
import aiohttp
from typing import Tuple, Optional
from app.schemas.caremap import (
    BillBreakdown,
    CaremapLineItem,
    IntegrationError,
)
from app.core.config import settings
from app.core.logging import safe_log_info, safe_log_error


def _mock_bill_breakdown() -> BillBreakdown:
    """Deterministic mock so endpoint works when bill-parser is unavailable."""
    return BillBreakdown(
        provider_name="Example Medical Group",
        facility_name="Example Clinic",
        service_dates="2025-11-03",
        total_billed=310.0,
        patient_responsibility=180.0,
        line_items=[
            CaremapLineItem(
                description="Office visit",
                cpt_hcpcs="99213",
                units=1.0,
                amount_billed=310.0,
                amount_allowed=180.0,
                notes="Deductible may apply.",
            )
        ],
    )


async def parse_bill(bill_pdf_path: str) -> Tuple[BillBreakdown, Optional[IntegrationError]]:
    """
    Parse bill PDF: prefer Kurt's bill-parser (HTTP); on failure return mock and error.
    bill_pdf_path: path to saved PDF file on disk.
    Returns (BillBreakdown, None) on success, (BillBreakdown_mock, IntegrationError) on fallback.
    """
    base_url = (settings.bill_parser_url or "").rstrip("/")
    if not base_url:
        safe_log_info("Bill parser URL not set, using mock")
        return _mock_bill_breakdown(), IntegrationError(
            component="bill_parser",
            message="Bill parser not configured; using mock data.",
            recoverable=True,
        )

    url = f"{base_url}/api/parse-bill" if "/api" not in base_url else f"{base_url}/parse-bill"
    if not url.startswith("http"):
        url = f"http://{url}"

    try:
        with open(bill_pdf_path, "rb") as f:
            data = f.read()
    except OSError as e:
        safe_log_error("Failed to read bill PDF", e, path_redacted="[redacted]")
        return _mock_bill_breakdown(), IntegrationError(
            component="bill_parser",
            message="Could not read bill file.",
            recoverable=True,
        )

    try:
        timeout = aiohttp.ClientTimeout(total=65)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            form = aiohttp.FormData()
            form.add_field("file", data, filename="bill.pdf", content_type="application/pdf")
            async with session.post(url, data=form) as resp:
                if resp.status != 200:
                    body = await resp.text()
                    safe_log_info("Bill parser non-200", status=resp.status, body_preview=(body[:200] if body else ""))
                    # Surface the parser's error message when present (e.g. "No text could be extracted", "File too large")
                    try:
                        parsed = json.loads(body)
                        detail = parsed.get("error") if isinstance(parsed, dict) else None
                        if detail and isinstance(detail, str) and len(detail) < 500:
                            msg = detail
                        else:
                            msg = f"Bill parser returned {resp.status}."
                    except Exception:
                        msg = f"Bill parser returned {resp.status}."
                    return _mock_bill_breakdown(), IntegrationError(
                        component="bill_parser",
                        message=msg,
                        recoverable=True,
                    )
                out = await resp.json()
    except Exception as e:
        safe_log_error("Bill parser request failed", e)
        return _mock_bill_breakdown(), IntegrationError(
            component="bill_parser",
            message="Bill parser unavailable; using mock data.",
            recoverable=True,
        )

    # Map Kurt's BillData to our BillBreakdown
    line_items: list = out.get("line_items") or []
    mapped_items = [
        CaremapLineItem(
            description=item.get("description") or "Line item",
            cpt_hcpcs=item.get("cpt_code"),
            units=float(item["quantity"]) if item.get("quantity") is not None else None,
            amount_billed=float(item["total"]) if item.get("total") is not None else item.get("unit_price"),
            amount_allowed=None,
            notes=None,
        )
        for item in line_items
    ]
    insurance_info = out.get("insurance_info") or {}
    patient_resp = insurance_info.get("patient_responsibility")
    if patient_resp is None and mapped_items:
        patient_resp = sum((i.amount_billed or 0) for i in mapped_items)

    breakdown = BillBreakdown(
        provider_name=out.get("provider_name"),
        facility_name=None,
        service_dates=out.get("date_of_service"),
        total_billed=out.get("total_charges"),
        patient_responsibility=float(patient_resp) if patient_resp is not None else None,
        line_items=mapped_items if mapped_items else _mock_bill_breakdown().line_items,
    )
    return breakdown, None


# Singleton adapter interface (for health check)
class BillParserAdapter:
    async def parse_bill(self, bill_pdf_path: str) -> Tuple[BillBreakdown, Optional[IntegrationError]]:
        return await parse_bill(bill_pdf_path)

    def is_live(self) -> bool:
        return bool(settings.bill_parser_url)


bill_parser_adapter = BillParserAdapter()
