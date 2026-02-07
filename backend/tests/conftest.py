"""
Pytest configuration and fixtures.
"""
import pytest
import os
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture(scope="function")
def client():
    """
    Create a test client for FastAPI app.
    Tests run in mock mode by default (no Supabase/OpenAI needed).
    """
    # Set environment to ensure mock mode
    os.environ.setdefault("ENVIRONMENT", "test")
    os.environ.setdefault("TEST_BYPASS_AUTH", "true")
    
    # Mock mode: don't require Supabase/OpenAI env vars
    # Set dummy values if not present
    if "SUPABASE_URL" not in os.environ:
        os.environ["SUPABASE_URL"] = "https://mock.supabase.co"
    if "SUPABASE_KEY" not in os.environ:
        os.environ["SUPABASE_KEY"] = "mock-key"
    if "SUPABASE_SERVICE_ROLE_KEY" not in os.environ:
        os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "mock-service-key"
    if "SUPABASE_JWT_SECRET" not in os.environ:
        os.environ["SUPABASE_JWT_SECRET"] = "mock-jwt-secret"
    if "DATABASE_URL" not in os.environ:
        os.environ["DATABASE_URL"] = "postgresql://mock:mock@localhost/mock"
    
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def mock_jwt_token():
    """Generate a mock JWT token for testing."""
    # In real tests, this would be a valid JWT
    # For mock mode, we'll use a simple token
    return "Bearer mock-jwt-token"


@pytest.fixture
def auth_headers(mock_jwt_token):
    """Return headers with authentication token."""
    return {"Authorization": mock_jwt_token}


# Test users
TEST_USER_A = "test_user_a"
TEST_USER_B = "test_user_b"
