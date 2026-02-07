"""
Stable contract schemas for CareMap orchestrator (bill + benefits + navigation).
Request is accepted as multipart form; these models describe JSON parts and response.
"""
from __future__ import annotations

from typing import List, Optional, Literal
from pydantic import BaseModel, Field


# ----- Request (JSON parts in multipart) -----

class UserContext(BaseModel):
    """Non-PII user context for location and search."""
    zip_code: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    radius_miles: int = Field(default=10, ge=1, le=100)
    specialty_keywords: List[str] = Field(default_factory=list)


class NetworkContext(BaseModel):
    """Insurance network context. member_id is never stored, only ephemeral."""
    insurance_carrier: Optional[str] = None
    plan_name: Optional[str] = None


# ----- Response: Bill -----

class CaremapLineItem(BaseModel):
    """Single line item from bill breakdown."""
    description: str
    cpt_hcpcs: Optional[str] = None
    units: Optional[float] = None
    amount_billed: Optional[float] = None
    amount_allowed: Optional[float] = None
    notes: Optional[str] = None


class BillBreakdown(BaseModel):
    """Structured bill breakdown."""
    provider_name: Optional[str] = None
    facility_name: Optional[str] = None
    service_dates: Optional[str] = None
    total_billed: Optional[float] = None
    patient_responsibility: Optional[float] = None
    line_items: List[CaremapLineItem] = Field(default_factory=list)


# ----- Response: Insurance -----

class InsuranceBenefits(BaseModel):
    """Insurance-aware benefits summary (from SOB or placeholder)."""
    deductible_individual: Optional[float] = None
    deductible_family: Optional[float] = None
    oop_max_individual: Optional[float] = None
    oop_max_family: Optional[float] = None
    in_network_rules: List[str] = Field(default_factory=list)
    out_network_rules: List[str] = Field(default_factory=list)
    disclaimers: List[str] = Field(default_factory=list)


# ----- Response: Guidance -----

class Guidance(BaseModel):
    """Plain-English guidance and next steps."""
    summary_plain_english: str = ""
    next_steps: List[str] = Field(default_factory=list)
    appeal_tips: List[str] = Field(default_factory=list)
    questions_to_ask_provider: List[str] = Field(default_factory=list)


# ----- Response: Navigation -----

NetworkStatusEnum = Literal["in_network", "out_of_network", "unknown"]


class NavigationResult(BaseModel):
    """Single in-network / nearby provider or facility."""
    name: str
    npi: Optional[str] = None
    address: str = ""
    phone: Optional[str] = None
    distance_miles: Optional[float] = None
    lat: float = 0.0
    lng: float = 0.0
    network_status: NetworkStatusEnum = "unknown"
    source: str = ""


class Navigation(BaseModel):
    """In-network navigation results."""
    query_used: str = ""
    results: List[NavigationResult] = Field(default_factory=list)


# ----- Integration errors (partial results) -----

ComponentEnum = Literal["bill_parser", "integrations", "rag"]


class IntegrationError(BaseModel):
    """Per-component error so partial results can still return."""
    component: ComponentEnum
    message: str
    recoverable: bool = True


# ----- Full response -----

class CaremapIngestResponse(BaseModel):
    """Unified response from POST /v1/caremap/ingest."""
    bill: BillBreakdown = Field(default_factory=BillBreakdown)
    insurance: InsuranceBenefits = Field(default_factory=InsuranceBenefits)
    guidance: Guidance = Field(default_factory=Guidance)
    navigation: Navigation = Field(default_factory=Navigation)
    errors: List[IntegrationError] = Field(default_factory=list)


# ----- Health -----

class CaremapHealthResponse(BaseModel):
    """Component liveness for GET /v1/caremap/health."""
    bill_parser: Literal["live", "mock"] = "mock"
    integrations: Literal["live", "mock"] = "mock"
    rag: Literal["live", "mock"] = "mock"
    guidance_llm: Literal["live", "mock"] = Field(
        default="mock",
        description="Whether plain-English guidance uses LLM (openai/gemini); mock if no key or DEMO_MODE.",
    )
    demo_mode: bool = Field(default=False, description="If true, ingest returns deterministic fixture.")
