"""
Integration smoke tests.
Tests happy path for all major endpoints.
"""
import pytest
from fastapi import status
from tests.conftest import TEST_USER_A


@pytest.mark.integration
def test_health_endpoint(client):
    """Test health check."""
    response = client.get("/health")
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["ok"] is True


@pytest.mark.integration
def test_me_endpoint(client):
    """Test /v1/me endpoint."""
    headers = {"X-Test-User": TEST_USER_A}
    response = client.get("/v1/me", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "user_id" in data
    assert data["user_id"] == TEST_USER_A


@pytest.mark.integration
def test_docs_upload_analyze_get(client):
    """Test docs upload → analyze → get flow."""
    headers = {"X-Test-User": TEST_USER_A}
    
    # Upload
    response_upload = client.post(
        "/v1/docs/upload?doc_type=EOB",
        headers=headers
    )
    assert response_upload.status_code == status.HTTP_200_OK
    doc_id = response_upload.json()["doc"]["id"]
    
    # Analyze
    response_analyze = client.post(
        f"/v1/docs/{doc_id}/analyze",
        headers=headers
    )
    assert response_analyze.status_code == status.HTTP_200_OK
    assert "extraction" in response_analyze.json()
    
    # Get
    response_get = client.get(
        f"/v1/docs/{doc_id}",
        headers=headers
    )
    assert response_get.status_code == status.HTTP_200_OK
    assert "doc" in response_get.json()


@pytest.mark.integration
def test_policy_upload_ingest(client):
    """Test policy upload → ingest flow."""
    headers = {"X-Test-User": TEST_USER_A}
    
    # Upload
    response_upload = client.post(
        "/v1/policies/upload?doc_type=POLICY",
        headers=headers
    )
    assert response_upload.status_code == status.HTTP_200_OK
    policy_id = response_upload.json()["doc"]["id"]
    
    # Ingest
    response_ingest = client.post(
        f"/v1/policies/{policy_id}/ingest",
        headers=headers
    )
    assert response_ingest.status_code == status.HTTP_200_OK
    data = response_ingest.json()
    assert "status" in data
    assert "chunks_created" in data


@pytest.mark.integration
def test_chat_session_message(client):
    """Test chat session → send message → receive citations."""
    headers = {"X-Test-User": TEST_USER_A}
    
    # Create session
    response_session = client.post(
        "/v1/chat/sessions",
        json={},
        headers=headers
    )
    assert response_session.status_code == status.HTTP_200_OK
    session_id = response_session.json()["session_id"]
    
    # Send message
    response_msg = client.post(
        f"/v1/chat/sessions/{session_id}/messages",
        json={"content": "What is my deductible?"},
        headers=headers
    )
    assert response_msg.status_code == status.HTTP_200_OK
    data = response_msg.json()
    assert "assistant" in data
    assert "citations" in data["assistant"]
    assert isinstance(data["assistant"]["citations"], list)
    assert "confidence" in data["assistant"]


@pytest.mark.integration
def test_providers_search(client):
    """Test providers search returns providers + network + cache."""
    headers = {"X-Test-User": TEST_USER_A}
    
    response = client.get(
        "/v1/providers/search?query=Dermatologist&lat=40.4433&lng=-79.9436&radius_miles=10",
        headers=headers
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    assert "providers" in data
    assert "cache" in data
    assert "query" in data
    assert "center" in data
    
    if data["providers"]:
        provider = data["providers"][0]
        assert "network" in provider
        assert "status" in provider["network"]
        assert "confidence" in provider["network"]
        assert "reasons" in provider["network"]
