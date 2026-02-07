"""
Database repository for providers_cache operations.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from app.services.db.supabase_db import db_service
from app.core.logging import safe_log_error, safe_log_info
import hashlib
import json


def generate_cache_key(
    user_id: str,
    query: str,
    lat: float,
    lng: float,
    radius_miles: int
) -> str:
    """Generate cache key from search parameters."""
    # Round lat/lng to 3 decimals for privacy + cache hit rate
    lat_rounded = round(lat, 3)
    lng_rounded = round(lng, 3)
    
    key_data = {
        "user_id": user_id,
        "query": query.lower().strip(),
        "lat": lat_rounded,
        "lng": lng_rounded,
        "radius_miles": radius_miles
    }
    
    key_string = json.dumps(key_data, sort_keys=True)
    return hashlib.sha256(key_string.encode()).hexdigest()


def get_cached_search(
    cache_key: str,
    ttl_hours: int = 24
) -> Optional[Dict[str, Any]]:
    """Get cached search results if not expired."""
    if not db_service.is_configured():
        return None
    
    try:
        # Check if cache entry exists and is not expired
        expires_at = datetime.utcnow() + timedelta(hours=ttl_hours)
        
        # For MVP, we'll store cache in a simple way
        # In production, use a dedicated cache table or Redis
        # For now, we'll use providers_cache with a cache_key field
        # This requires a migration, but for MVP we can work around it
        
        # Since providers_cache doesn't have cache_key yet, we'll skip caching for now
        # and implement it in the search service directly
        return None
    except Exception as e:
        safe_log_error("Failed to get cached search", e, cache_key=cache_key[:16])
        return None


def cache_search_results(
    cache_key: str,
    results: List[Dict[str, Any]],
    ttl_hours: int = 24
) -> bool:
    """Cache search results."""
    if not db_service.is_configured():
        return False
    
    try:
        # For MVP, we'll store results in providers_cache
        # In production, use a dedicated search_cache table
        # For now, we'll implement caching in the search service
        return True
    except Exception as e:
        safe_log_error("Failed to cache search results", e, cache_key=cache_key[:16])
        return False


def get_provider_by_id(provider_id: str) -> Optional[Dict[str, Any]]:
    """Get provider by ID from cache."""
    if not db_service.is_configured():
        return None
    
    try:
        result = db_service.client.table("providers_cache").select("*").eq("id", provider_id).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
        return None
    except Exception as e:
        safe_log_error("Failed to get provider by ID", e, provider_id=provider_id)
        return None


def upsert_provider(provider_data: Dict[str, Any]) -> Optional[str]:
    """Upsert provider to cache. Returns provider ID."""
    if not db_service.is_configured():
        return None
    
    try:
        # Use NPI as unique identifier if available
        npi = provider_data.get("npi")
        provider_id = provider_data.get("provider_id") or provider_data.get("id")
        
        upsert_data = {
            "name": provider_data.get("name", ""),
            "npi": npi,
            "specialty": provider_data.get("types", [""])[0] if provider_data.get("types") else None,
            "address": provider_data.get("address", ""),
            "city": provider_data.get("city"),
            "state": provider_data.get("state"),
            "zip": provider_data.get("zip"),
            "phone": provider_data.get("phone")
        }
        
        if npi:
            # Upsert by NPI
            result = db_service.client.table("providers_cache").upsert(
                upsert_data,
                on_conflict="npi"
            ).execute()
        elif provider_id:
            # Upsert by ID
            upsert_data["id"] = provider_id
            result = db_service.client.table("providers_cache").upsert(
                upsert_data,
                on_conflict="id"
            ).execute()
        else:
            # Insert new
            result = db_service.client.table("providers_cache").insert(upsert_data).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0].get("id")
        return None
    except Exception as e:
        safe_log_error("Failed to upsert provider", e, provider_id=provider_id)
        return None
