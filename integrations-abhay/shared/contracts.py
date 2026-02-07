"""
CareMap Integrations — Shared Contracts (Python)
=================================================

This is the contract. Frontend & backend must not diverge.

Hackathon note: network status is heuristic/seeded, not insurer-official.

No user PII storage; use only auth user_id if needed.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel, Field


# =============================================================================
# Core Types
# =============================================================================


class GeoPoint(BaseModel):
    lat: float
    lng: float


class Address(BaseModel):
    line1: str
    line2: Optional[str] = None
    city: str
    state: str
    zip: Optional[str] = Field(default=None, alias="zip")

    class Config:
        populate_by_name = True


class NetworkStatusSource(str, Enum):
    SEED = "seed"
    HEURISTIC = "heuristic"
    UNKNOWN = "unknown"


class NetworkStatus(BaseModel):
    in_network: bool
    network_name: Optional[str] = None
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score 0.0 - 1.0")
    source: Literal["seed", "heuristic", "unknown"] = Field(
        ..., description="Source of network determination"
    )


# =============================================================================
# Provider Types
# =============================================================================


class Provider(BaseModel):
    """A healthcare provider (doctor, hospital, clinic, etc.)"""

    id: str = Field(..., description="UUID string")
    place_id: Optional[str] = Field(
        default=None, description="Google Places ID (if sourced from Places API)"
    )
    name: str
    types: Optional[list[str]] = Field(
        default=None, description='Google Places types (e.g., "hospital", "doctor")'
    )
    specialties: Optional[list[str]] = Field(
        default=None, description='Medical specialties (e.g., "cardiology", "pediatrics")'
    )
    address: Address
    geo: GeoPoint
    phone: Optional[str] = None
    website: Optional[str] = None
    network_status: Optional[NetworkStatus] = None
    distance_miles: Optional[float] = Field(
        default=None, description="Distance from search origin in miles"
    )


# =============================================================================
# Plan Types
# =============================================================================


class Plan(BaseModel):
    """An insurance plan"""

    id: str
    payer: str
    plan_name: str
    network: Optional[str] = None
    state: Optional[str] = None


# =============================================================================
# Provider Search
# =============================================================================


class ProviderSearchRequest(BaseModel):
    """Request to search for providers"""

    q: Optional[str] = Field(default=None, description="Free-text search query")
    types: Optional[list[str]] = Field(default=None, description="Filter by Google Places types")
    specialty: Optional[str] = Field(default=None, description="Filter by medical specialty")
    lat: float = Field(..., description="Latitude of search origin")
    lng: float = Field(..., description="Longitude of search origin")
    radius_miles: float = Field(..., description="Search radius in miles")
    limit: int = Field(..., description="Max results to return")
    plan_id: Optional[str] = Field(
        default=None, description="Optional plan ID to check network status"
    )
    source: Literal["cache", "places", "mock"] = Field(..., description="Data source preference")


class ProviderSearchResponseMeta(BaseModel):
    total: int
    returned: int
    ts: str = Field(..., description="ISO 8601 timestamp")
    source_used: str


class ProviderSearchResponse(BaseModel):
    """Response from provider search"""

    request_id: str
    providers: list[Provider]
    meta: ProviderSearchResponseMeta


# =============================================================================
# Plan Search
# =============================================================================


class PlanSearchRequest(BaseModel):
    """Request to search for insurance plans"""

    q: Optional[str] = Field(default=None, description="Free-text search query")
    payer: Optional[str] = Field(default=None, description="Filter by payer/insurer name")
    state: Optional[str] = Field(default=None, description="Filter by state")
    limit: Optional[int] = Field(default=None, description="Max results to return")


class PlanSearchResponseMeta(BaseModel):
    returned: int
    ts: str = Field(..., description="ISO 8601 timestamp")


class PlanSearchResponse(BaseModel):
    """Response from plan search"""

    request_id: str
    plans: list[Plan]
    meta: PlanSearchResponseMeta


# =============================================================================
# Example JSON
# =============================================================================

# Example ProviderSearchRequest:
EXAMPLE_PROVIDER_SEARCH_REQUEST = {
    "q": "cardiologist",
    "types": ["doctor"],
    "specialty": "cardiology",
    "lat": 40.4406,
    "lng": -79.9959,
    "radius_miles": 10,
    "limit": 20,
    "plan_id": "plan_upmc_advantage_gold",
    "source": "cache",
}

# Example ProviderSearchResponse:
EXAMPLE_PROVIDER_SEARCH_RESPONSE = {
    "request_id": "req_abc123",
    "providers": [
        {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "place_id": "ChIJ1234567890",
            "name": "UPMC Heart & Vascular Institute",
            "types": ["hospital", "doctor"],
            "specialties": ["cardiology", "cardiovascular surgery"],
            "address": {
                "line1": "200 Lothrop St",
                "city": "Pittsburgh",
                "state": "PA",
                "zip": "15213",
            },
            "geo": {"lat": 40.4416, "lng": -79.9569},
            "phone": "+1-412-647-2345",
            "website": "https://www.upmc.com/heart",
            "network_status": {
                "in_network": True,
                "network_name": "UPMC Health Plan",
                "confidence": 0.95,
                "source": "seed",
            },
            "distance_miles": 2.3,
        }
    ],
    "meta": {
        "total": 15,
        "returned": 1,
        "ts": "2026-02-06T22:00:00.000Z",
        "source_used": "cache",
    },
}

# Example PlanSearchRequest:
EXAMPLE_PLAN_SEARCH_REQUEST = {
    "q": "advantage",
    "payer": "UPMC",
    "state": "PA",
    "limit": 10,
}

# Example PlanSearchResponse:
EXAMPLE_PLAN_SEARCH_RESPONSE = {
    "request_id": "req_plan_xyz789",
    "plans": [
        {
            "id": "plan_upmc_advantage_gold",
            "payer": "UPMC Health Plan",
            "plan_name": "UPMC Advantage Gold HMO",
            "network": "UPMC Premium",
            "state": "PA",
        }
    ],
    "meta": {
        "returned": 1,
        "ts": "2026-02-06T22:00:00.000Z",
    },
}


# =============================================================================
# Validation helpers
# =============================================================================


def validate_provider_search_request(data: dict) -> ProviderSearchRequest:
    """Parse and validate a provider search request dict."""
    return ProviderSearchRequest.model_validate(data)


def validate_plan_search_request(data: dict) -> PlanSearchRequest:
    """Parse and validate a plan search request dict."""
    return PlanSearchRequest.model_validate(data)


if __name__ == "__main__":
    # Quick validation test
    req = validate_provider_search_request(EXAMPLE_PROVIDER_SEARCH_REQUEST)
    print(f"✓ ProviderSearchRequest valid: {req.q}")

    resp = ProviderSearchResponse.model_validate(EXAMPLE_PROVIDER_SEARCH_RESPONSE)
    print(f"✓ ProviderSearchResponse valid: {len(resp.providers)} providers")

    plan_req = validate_plan_search_request(EXAMPLE_PLAN_SEARCH_REQUEST)
    print(f"✓ PlanSearchRequest valid: {plan_req.payer}")

    plan_resp = PlanSearchResponse.model_validate(EXAMPLE_PLAN_SEARCH_RESPONSE)
    print(f"✓ PlanSearchResponse valid: {len(plan_resp.plans)} plans")
