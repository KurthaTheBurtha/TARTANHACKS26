"""
Provider data normalizer.
"""
from typing import Dict, Any, List
import math


def normalize_provider(raw_provider: Dict[str, Any], center_lat: float, center_lng: float) -> Dict[str, Any]:
    """
    Normalize raw provider data to standard format.
    Calculates distance from center point.
    """
    provider_lat = raw_provider.get("lat", 0.0)
    provider_lng = raw_provider.get("lng", 0.0)
    
    # Calculate distance in miles (Haversine formula)
    distance_miles = _calculate_distance(center_lat, center_lng, provider_lat, provider_lng)
    
    return {
        "provider_id": raw_provider.get("provider_id") or raw_provider.get("id"),
        "name": raw_provider.get("name", ""),
        "lat": provider_lat,
        "lng": provider_lng,
        "address": raw_provider.get("address", ""),
        "phone": raw_provider.get("phone"),
        "types": raw_provider.get("types", []),
        "npi": raw_provider.get("npi"),
        "distance_miles": round(distance_miles, 2)
    }


def _calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in miles using Haversine formula."""
    # Earth radius in miles
    R = 3959.0
    
    # Convert to radians
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    
    # Haversine formula
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    
    return R * c
