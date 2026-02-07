"""
Provider endpoints contract tests.
"""
import pytest
from fastapi import status
from app.core.contracts import PROVIDERS_SEARCH_EXAMPLE


def test_providers_search_contract(client, auth_headers):
    """Test GET /v1/providers/search returns correct shape."""
    response = client.get(
        "/v1/providers/search?query=Dermatologist&lat=40.4433&lng=-79.9436&radius_miles=10",
        headers=auth_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    # Validate required fields
    assert "query" in data
    assert "center" in data
    assert "radius_miles" in data
    assert "providers" in data
    assert "cache" in data
    
    # Validate center
    center = data["center"]
    assert "lat" in center
    assert "lng" in center
    assert isinstance(center["lat"], (int, float))
    assert isinstance(center["lng"], (int, float))
    
    # Validate cache
    cache = data["cache"]
    assert "hit" in cache
    assert "ttl_seconds" in cache
    assert isinstance(cache["hit"], bool)
    assert isinstance(cache["ttl_seconds"], int)
    
    # Validate providers array
    assert isinstance(data["providers"], list)
    
    if data["providers"]:
        provider = data["providers"][0]
        assert "provider_id" in provider
        assert "name" in provider
        assert "lat" in provider
        assert "lng" in provider
        assert "address" in provider
        assert "types" in provider
        assert "distance_miles" in provider
        assert "network" in provider
        
        # Validate network object
        network = provider["network"]
        assert "status" in network
        assert "confidence" in network
        assert "reasons" in network
        assert "evidence" in network
        
        # Validate status enum
        assert network["status"] in ["likely_in_network", "unknown", "likely_out_of_network"]
        
        # Validate confidence range
        assert 0.0 <= network["confidence"] <= 1.0
        
        # Validate types
        assert isinstance(network["reasons"], list)
        assert isinstance(network["evidence"], list)
        
        # Validate evidence structure
        if network["evidence"]:
            evidence_item = network["evidence"][0]
            assert "doc_id" in evidence_item
            assert "chunk_id" in evidence_item
            assert "label" in evidence_item


def test_providers_get_contract(client, auth_headers):
    """Test GET /v1/providers/{provider_id} returns correct shape."""
    provider_id = "mock_001"
    response = client.get(
        f"/v1/providers/{provider_id}",
        headers=auth_headers
    )
    
    # May return 404 if provider not in cache, or 200 with provider
    assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]
    
    if response.status_code == status.HTTP_200_OK:
        data = response.json()
        
        # Validate required fields (same as provider in search results)
        assert "provider_id" in data
        assert "name" in data
        assert "network" in data
        
        network = data["network"]
        assert "status" in network
        assert "confidence" in network
        assert network["status"] in ["likely_in_network", "unknown", "likely_out_of_network"]
