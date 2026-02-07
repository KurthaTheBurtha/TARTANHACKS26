from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional
from app.models.schemas import ProviderSearchResponse, Provider, NetworkStatus, NetworkEvidence, CenterPoint, CacheInfo
from app.core.security import get_current_user
from app.services.providers.search import search_providers
from app.services.db.providers_repo import get_provider_by_id
from app.services.providers.normalizer import normalize_provider
from app.services.network.in_network import evaluate_in_network
from app.core.logging import safe_log_error

router = APIRouter()


@router.get("/search", response_model=ProviderSearchResponse)
async def search_providers_endpoint(
    query: str = Query(..., description="Search query for provider name or specialty"),
    lat: float = Query(..., description="Latitude for search center"),
    lng: float = Query(..., description="Longitude for search center"),
    radius_miles: int = Query(default=10, description="Search radius in miles"),
    policy_doc_id: Optional[str] = Query(None, description="Optional policy document ID for policy-aware scoring"),
    current_user: dict = Depends(get_current_user)
):
    """
    Search for healthcare providers with in-network scoring.
    Results are cached and sorted by network confidence, then distance.
    """
    user_id = current_user.get("sub") or current_user.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token"
        )
    
    try:
        # Search providers
        result = search_providers(
            query=query,
            lat=lat,
            lng=lng,
            radius_miles=radius_miles,
            user_id=user_id,
            policy_doc_id=policy_doc_id
        )
        
        # Convert to response schema
        providers = []
        for p in result["providers"]:
            # Convert evidence
            evidence = [
                NetworkEvidence(**e) for e in p["network"]["evidence"]
            ]
            
            providers.append(Provider(
                provider_id=p["provider_id"],
                name=p["name"],
                lat=p["lat"],
                lng=p["lng"],
                address=p["address"],
                phone=p.get("phone"),
                types=p.get("types", []),
                distance_miles=p["distance_miles"],
                network=NetworkStatus(
                    status=p["network"]["status"],
                    confidence=p["network"]["confidence"],
                    reasons=p["network"]["reasons"],
                    evidence=evidence
                ),
                npi=p.get("npi")
            ))
        
        return ProviderSearchResponse(
            query=query,
            center=CenterPoint(lat=lat, lng=lng),
            radius_miles=radius_miles,
            providers=providers,
            cache=CacheInfo(
                hit=result["cache"]["hit"],
                ttl_seconds=result["cache"]["ttl_seconds"]
            )
        )
    except Exception as e:
        safe_log_error("Failed to search providers", e, query=query[:50])
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search providers"
        )


@router.get("/{provider_id}", response_model=Provider)
async def get_provider(
    provider_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a provider by ID from cache.
    """
    user_id = current_user.get("sub") or current_user.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token"
        )
    
    try:
        # Get provider from cache
        cached_provider = get_provider_by_id(provider_id)
        
        if not cached_provider:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Provider not found"
            )
        
        # Normalize and add network scoring
        # For single provider, we need lat/lng - use default if not in cache
        provider_data = {
            "provider_id": cached_provider.get("id", provider_id),
            "name": cached_provider.get("name", ""),
            "lat": cached_provider.get("lat", 40.4433),  # Default to Pittsburgh
            "lng": cached_provider.get("lng", -79.9436),
            "address": cached_provider.get("address", ""),
            "phone": cached_provider.get("phone"),
            "types": [cached_provider.get("specialty", "")] if cached_provider.get("specialty") else [],
            "npi": cached_provider.get("npi")
        }
        
        normalized = normalize_provider(provider_data, provider_data["lat"], provider_data["lng"])
        
        # Score network status
        network = evaluate_in_network(
            normalized,
            user_id,
            query="",  # No query for single provider lookup
            policy_doc_id=None
        )
        normalized["network"] = network
        
        # Convert evidence
        evidence = [
            NetworkEvidence(**e) for e in network["evidence"]
        ]
        
        return Provider(
            provider_id=normalized["provider_id"],
            name=normalized["name"],
            lat=normalized["lat"],
            lng=normalized["lng"],
            address=normalized["address"],
            phone=normalized.get("phone"),
            types=normalized.get("types", []),
            distance_miles=normalized["distance_miles"],
            network=NetworkStatus(
                status=network["status"],
                confidence=network["confidence"],
                reasons=network["reasons"],
                evidence=evidence
            ),
            npi=normalized.get("npi")
        )
    except HTTPException:
        raise
    except Exception as e:
        safe_log_error("Failed to get provider", e, provider_id=provider_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get provider"
        )
