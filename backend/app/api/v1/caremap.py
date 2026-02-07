"""
CareMap orchestrator: single ingest endpoint (bill + SOB + navigation) with stable contract.
"""
from __future__ import annotations

import json
import os
import tempfile
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from app.schemas.caremap import (
    CaremapIngestResponse,
    CaremapHealthResponse,
    BillBreakdown,
    CaremapLineItem,
    InsuranceBenefits,
    Guidance,
    Navigation,
    UserContext,
    NetworkContext,
    IntegrationError,
)
from app.core.config import settings
from app.core.logging import safe_log_error, safe_log_info
from app.integrations.bill_parser_adapter import bill_parser_adapter
from app.integrations.benefits_adapter import benefits_adapter
from app.integrations.network_adapter import network_adapter

# Demo plan IDs (integrations-abhay state.md) for network_context.insurance_carrier hint
DEMO_PLAN_IDS = {
    "bcbs": "11111111-1111-1111-1111-111111111111",
    "aetna": "22222222-2222-2222-2222-222222222222",
    "upmc": "33333333-3333-3333-3333-333333333333",
}

router = APIRouter()


def _persist_upload(upload: UploadFile, base_dir: str) -> Optional[str]:
    """Save upload to base_dir; return path or None. No PII in paths."""
    try:
        name = upload.filename or "upload"
        if not name.lower().endswith(".pdf"):
            name = name + ".pdf"
        safe_name = str(uuid.uuid4())[:8] + "_" + os.path.basename(name)
        path = os.path.join(base_dir, safe_name)
        with open(path, "wb") as f:
            while chunk := upload.file.read(64 * 1024):
                f.write(chunk)
        return path
    except Exception as e:
        safe_log_error("Failed to persist upload", e)
        return None


def _build_guidance_from_bill(bill: BillBreakdown, insurance: InsuranceBenefits) -> Guidance:
    """Build plain-English guidance from bill and insurance."""
    summary = "Review your line items and patient responsibility below."
    if bill.patient_responsibility is not None:
        summary = f"Your estimated patient responsibility is ${bill.patient_responsibility:.2f}. " + summary
    next_steps = [
        "Confirm the provider was in-network on the date of service.",
        "Check whether your deductible has been met.",
        "If amounts look wrong, request an itemized bill and compare to your EOB.",
    ]
    if insurance.disclaimers:
        next_steps.append("Review your summary of benefits for exact deductible and OOP amounts.")
    return Guidance(
        summary_plain_english=summary,
        next_steps=next_steps,
        appeal_tips=[
            "Keep copies of all bills and EOBs.",
            "Ask the provider for a detailed itemized bill if you dispute a charge.",
            "Contact your insurer's appeals line if you believe a claim was processed incorrectly.",
        ],
        questions_to_ask_provider=[
            "Was this service billed with the correct CPT codes?",
            "Can I get an itemized bill?",
            "Do you have a financial assistance program?",
        ],
    )


@router.post("/ingest", response_model=CaremapIngestResponse)
async def caremap_ingest(
    bill_pdf: UploadFile = File(..., description="Medical bill or EOB PDF (required)"),
    sob_pdf: Optional[UploadFile] = File(None, description="Summary of benefits PDF (optional)"),
    user_context: Optional[str] = Form(None, description="JSON: UserContext (zip_code, lat, lng, radius_miles, specialty_keywords)"),
    network_context: Optional[str] = Form(None, description="JSON: NetworkContext (insurance_carrier, plan_name)"),
):
    """
    Single endpoint: upload bill + optional SOB, get bill breakdown + insurance guidance + in-network navigation.
    Returns unified response with partial error reporting; never 500 unless bill_pdf is missing/invalid.
    """
    # Require a PDF file (FastAPI may 422 if File(...) is missing; we return 400 for invalid type)
    if not bill_pdf or (not getattr(bill_pdf, "filename", None) and not getattr(bill_pdf, "file", None)):
        raise HTTPException(status_code=400, detail="bill_pdf is required")

    # Allow PDF by content type or filename
    ct = getattr(bill_pdf, "content_type", "") or ""
    if "pdf" not in ct.lower() and not (bill_pdf.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="bill_pdf must be a PDF file")

    base_dir = settings.caremap_temp_dir or tempfile.gettempdir()
    caremap_dir = os.path.join(base_dir, "caremap_ingest")
    os.makedirs(caremap_dir, exist_ok=True)

    bill_path: Optional[str] = None
    sob_path: Optional[str] = None
    errors: list[IntegrationError] = []

    try:
        bill_path = _persist_upload(bill_pdf, caremap_dir)
        if not bill_path:
            raise HTTPException(status_code=400, detail="Failed to save bill PDF")

        if sob_pdf and sob_pdf.filename:
            sob_path = _persist_upload(sob_pdf, caremap_dir)

        user_ctx = UserContext()
        if user_context:
            try:
                data = json.loads(user_context)
                user_ctx = UserContext(**{k: v for k, v in data.items() if k in UserContext.model_fields})
            except Exception:
                pass

        net_ctx = NetworkContext()
        if network_context:
            try:
                data = json.loads(network_context)
                net_ctx = NetworkContext(**{k: v for k, v in data.items() if k in NetworkContext.model_fields})
            except Exception:
                pass

        # 1) Bill breakdown
        bill, err_bill = await bill_parser_adapter.parse_bill(bill_path)
        if err_bill:
            errors.append(err_bill)

        # 2) Insurance benefits (if SOB provided)
        insurance, err_benefits = await benefits_adapter.parse_benefits(sob_path)
        if err_benefits:
            errors.append(err_benefits)

        # 3) Navigation (specialty from user + hints from bill)
        hints = {}
        if bill.provider_name:
            hints["provider_name"] = bill.provider_name
        if bill.facility_name:
            hints["facility_name"] = bill.facility_name
        plan_id_override = None
        if net_ctx.insurance_carrier:
            carrier_lower = (net_ctx.insurance_carrier or "").lower()
            for key, plan_id in DEMO_PLAN_IDS.items():
                if key in carrier_lower:
                    plan_id_override = plan_id
                    break
        nav, err_nav = await network_adapter.find_in_network(
            user_ctx,
            user_ctx.specialty_keywords or ["primary care"],
            hints=hints,
            plan_id_override=plan_id_override,
        )
        if err_nav:
            errors.append(err_nav)

        guidance = _build_guidance_from_bill(bill, insurance)

        return CaremapIngestResponse(
            bill=bill,
            insurance=insurance,
            guidance=guidance,
            navigation=nav,
            errors=errors,
        )
    except HTTPException:
        raise
    except Exception as e:
        safe_log_error("CareMap ingest failed", e)
        return CaremapIngestResponse(
            bill=BillBreakdown(line_items=[CaremapLineItem(description="Parse failed", notes="See errors.")]),
            insurance=InsuranceBenefits(disclaimers=["Request failed; please try again."]),
            guidance=Guidance(summary_plain_english="An error occurred. Please try again."),
            navigation=Navigation(query_used="", results=[]),
            errors=[IntegrationError(component="bill_parser", message="Ingest failed.", recoverable=True)],
        )
    finally:
        if bill_path and os.path.isfile(bill_path):
            try:
                os.remove(bill_path)
            except Exception:
                pass
        if sob_path and os.path.isfile(sob_path):
            try:
                os.remove(sob_path)
            except Exception:
                pass


@router.get("/health", response_model=CaremapHealthResponse)
async def caremap_health():
    """
    Returns which components are live vs mock: bill_parser, integrations, rag.
    No auth required.
    """
    return CaremapHealthResponse(
        bill_parser="live" if bill_parser_adapter.is_live() else "mock",
        integrations="live" if network_adapter.is_live() else "mock",
        rag="live" if benefits_adapter.is_live() else "mock",
    )
