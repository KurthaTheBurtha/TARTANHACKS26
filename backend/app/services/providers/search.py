"""
Provider search service with cache-first logic.
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import hashlib
import json
from app.services.providers.source import mock_provider_source
from app.services.providers.normalizer import normalize_provider
from app.services.network.in_network import evaluate_in_network
from app.services.db.providers_repo import generate_cache_key, upsert_provider
from app.services.db.supabase_db import db_service
from app.core.logging import safe_log_info, safe_log_error


class SearchCache:
    """Simple in-memory cache for search results (MVP)."""
    def __init__(self):
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.ttl_hours = 24
    
    def get(self, key: str) -> Optional[Dict[str, Any]]:
        """Get cached result if not expired."""
        if key not in self.cache:
            return None
        
        entry = self.cache[key]
        expires_at = datetime.fromisoformat(entry["expires_at"])
        
        if datetime.utcnow() > expires_at:
            del self.cache[key]
            return None
        
        return entry["results"]
    
    def set(self, key: str, results: List[Dict[str, Any]]):
        """Cache search results."""
        expires_at = (datetime.utcnow() + timedelta(hours=self.ttl_hours)).isoformat()
        self.cache[key] = {
            "results": results,
            "expires_at": expires_at
        }


# Singleton cache instance
search_cache = SearchCache()


def search_providers(
    query: str,
    lat: float,
    lng: float,
    radius_miles: int,
    user_id: str,
    policy_doc_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Search for providers with caching and in-network scoring.
    Returns search results with cache metadata.
    """
    # Generate cache key
    cache_key = generate_cache_key(user_id, query, lat, lng, radius_miles)
    
    # Check cache
    cached_results = search_cache.get(cache_key)
    cache_hit = cached_results is not None
    
    if cache_hit:
        safe_log_info("Cache hit for provider search", cache_key=cache_key[:16])
        providers = cached_results
    else:
        safe_log_info("Cache miss, fetching providers", query=query[:50])
        
        # Fetch from source
        raw_providers = mock_provider_source.search(query, lat, lng, radius_miles)
        
        # Normalize providers
        providers = []
        for raw_provider in raw_providers:
            normalized = normalize_provider(raw_provider, lat, lng)
            
            # Filter by radius
            if normalized["distance_miles"] <= radius_miles:
                # Score in-network status
                network = evaluate_in_network(
                    normalized,
                    user_id,
                    query,
                    policy_doc_id
                )
                normalized["network"] = network
                
                # Store provider in cache (by NPI if available)
                if normalized.get("npi"):
                    upsert_provider(normalized)
                
                providers.append(normalized)
        
        # Sort by network confidence (desc), then distance (asc)
        providers.sort(key=lambda p: (-p["network"]["confidence"], p["distance_miles"]))
        
        # Cache results
        search_cache.set(cache_key, providers)
    
    return {
        "providers": providers,
        "cache": {
            "hit": cache_hit,
            "ttl_seconds": 86400  # 24 hours
        }
    }
