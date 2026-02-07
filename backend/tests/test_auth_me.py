"""
Auth and /me endpoint tests.
"""
import pytest
from fastapi import status
from app.core.config import settings


def test_me_endpoint(client, auth_headers):
    """Test GET /v1/me returns user identity."""
    # Set test user via header
    headers = {"X-Test-User": "test_user_a"}
    
    response = client.get("/v1/me", headers=headers)
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    assert "user_id" in data
    assert data["user_id"] == "test_user_a"
    assert "auth_source" in data
    assert data["auth_source"] == "test_override"


def test_me_endpoint_requires_auth(client):
    """Test GET /v1/me requires authentication."""
    response = client.get("/v1/me")
    
    # Should return 401 or 403
    assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]


def test_test_override_header(client):
    """Test X-Test-User header works in test mode."""
    headers = {"X-Test-User": "test_user_b"}
    
    response = client.get("/v1/me", headers=headers)
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["user_id"] == "test_user_b"
