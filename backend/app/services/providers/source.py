"""
Provider source adapter interface with MockProviderSource implementation.
"""
from typing import List, Dict, Any, Optional
from abc import ABC, abstractmethod


class ProviderSource(ABC):
    """Abstract interface for provider data sources."""
    
    @abstractmethod
    def search(
        self,
        query: str,
        lat: float,
        lng: float,
        radius_miles: int
    ) -> List[Dict[str, Any]]:
        """Search for providers. Returns raw provider data."""
        pass


class MockProviderSource(ProviderSource):
    """Mock provider source returning deterministic results."""
    
    def search(
        self,
        query: str,
        lat: float,
        lng: float,
        radius_miles: int
    ) -> List[Dict[str, Any]]:
        """
        Return mock providers around Pittsburgh area.
        Deterministic based on query string.
        """
        # Default to Pittsburgh coordinates if not provided
        if not lat or not lng:
            lat, lng = 40.4433, -79.9436  # Pittsburgh
        
        # Generate providers based on query
        query_lower = query.lower()
        
        providers = []
        
        # UPMC providers (in-network signals)
        if "dermatology" in query_lower or "dermatologist" in query_lower:
            providers.extend([
                {
                    "provider_id": "mock_001",
                    "name": "UPMC Dermatology",
                    "lat": 40.441,
                    "lng": -79.95,
                    "address": "200 Lothrop St, Pittsburgh, PA 15213",
                    "phone": "+1-412-555-0101",
                    "types": ["doctor", "health", "dermatology"],
                    "npi": "1234567890"
                },
                {
                    "provider_id": "mock_002",
                    "name": "Allegheny Health Network Dermatology",
                    "lat": 40.445,
                    "lng": -79.94,
                    "address": "320 E North Ave, Pittsburgh, PA 15212",
                    "phone": "+1-412-555-0102",
                    "types": ["doctor", "health", "dermatology"],
                    "npi": "1234567891"
                }
            ])
        
        # Cardiology
        if "cardiology" in query_lower or "cardiologist" in query_lower or "heart" in query_lower:
            providers.extend([
                {
                    "provider_id": "mock_003",
                    "name": "UPMC Heart and Vascular Institute",
                    "lat": 40.442,
                    "lng": -79.945,
                    "address": "200 Lothrop St, Pittsburgh, PA 15213",
                    "phone": "+1-412-555-0103",
                    "types": ["doctor", "health", "cardiology"],
                    "npi": "1234567892"
                }
            ])
        
        # General/Internal Medicine
        if "internal" in query_lower or "primary" in query_lower or "general" in query_lower or not providers:
            providers.extend([
                {
                    "provider_id": "mock_004",
                    "name": "UPMC Internal Medicine",
                    "lat": 40.444,
                    "lng": -79.942,
                    "address": "200 Lothrop St, Pittsburgh, PA 15213",
                    "phone": "+1-412-555-0104",
                    "types": ["doctor", "health", "internal_medicine"],
                    "npi": "1234567893"
                },
                {
                    "provider_id": "mock_005",
                    "name": "Allegheny General Hospital",
                    "lat": 40.446,
                    "lng": -79.941,
                    "address": "320 E North Ave, Pittsburgh, PA 15212",
                    "phone": "+1-412-555-0105",
                    "types": ["hospital", "health"],
                    "npi": "1234567894"
                }
            ])
        
        # Out of network example
        if "out" in query_lower and "network" in query_lower:
            providers.append({
                "provider_id": "mock_006",
                "name": "Out of Network Medical Center",
                "lat": 40.448,
                "lng": -79.939,
                "address": "500 Example Blvd, Pittsburgh, PA 15215",
                "phone": "+1-412-555-0199",
                "types": ["doctor", "health"],
                "npi": "1234567899"
            })
        
        # Limit to requested radius (simple distance check)
        # For mock, return all providers (distance calculated later)
        return providers[:10]  # Max 10 providers


# Singleton instance
mock_provider_source = MockProviderSource()
