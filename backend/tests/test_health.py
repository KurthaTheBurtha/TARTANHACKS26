"""
Health check endpoint contract tests.
"""
from fastapi import status
from app.core.contracts import HEALTH_EXAMPLE


def test_health_endpoint(client):
    """Test GET /health returns correct shape."""
    response = client.get("/health")
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    # Validate required fields
    assert "ok" in data
    assert isinstance(data["ok"], bool)
    assert data["ok"] is True
    
    # Validate matches contract
    assert data == HEALTH_EXAMPLE
