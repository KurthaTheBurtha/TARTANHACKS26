"""
Minimal tests for provider-agnostic LLM client and smoke endpoint.
Uses conftest client (mock mode). With no API keys, smoke returns mock response.
"""
import pytest
from fastapi.testclient import TestClient


def test_llm_health(client: TestClient):
    r = client.get("/v1/llm/health")
    assert r.status_code == 200
    data = r.json()
    assert "provider" in data
    assert data["provider"] in ("openai", "gemini")
    assert "openai_configured" in data
    assert "gemini_configured" in data
    assert "message" in data
    # No secrets in response
    assert "key" not in data.get("message", "").lower() or "configure" in data.get("message", "").lower()


def test_llm_smoke_returns_ok(client: TestClient):
    r = client.post("/v1/llm/smoke")
    assert r.status_code == 200
    data = r.json()
    assert data["ok"] is True
    assert "provider" in data
    assert "response_preview" in data
    assert "mock_used" in data
    # With no keys, mock is used; with keys, response_preview may be model output
    assert len(data["response_preview"]) > 0
