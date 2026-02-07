"""
Chat endpoints contract tests.
"""
import pytest
from fastapi import status
from app.core.contracts import CHAT_MESSAGE_EXAMPLE


def test_chat_sessions_create_contract(client, auth_headers):
    """Test POST /v1/chat/sessions returns correct shape."""
    response = client.post(
        "/v1/chat/sessions",
        json={},
        headers=auth_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    # Validate required fields
    assert "session_id" in data
    assert "created_at" in data
    
    # Validate types
    assert isinstance(data["session_id"], str)
    assert isinstance(data["created_at"], str)


def test_chat_messages_contract(client, auth_headers):
    """Test POST /v1/chat/sessions/{id}/messages returns correct shape."""
    session_id = "chat_abc"
    response = client.post(
        f"/v1/chat/sessions/{session_id}/messages",
        json={"content": "What is my deductible?"},
        headers=auth_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    # Validate required fields
    assert "session_id" in data
    assert "message_id" in data
    assert "assistant" in data
    
    assistant = data["assistant"]
    assert "text" in assistant
    assert "citations" in assistant
    assert "confidence" in assistant
    assert "disclaimer" in assistant
    
    # Validate types
    assert isinstance(assistant["text"], str)
    assert isinstance(assistant["citations"], list)
    assert isinstance(assistant["confidence"], (int, float))
    assert isinstance(assistant["disclaimer"], str)
    
    # Validate confidence range
    assert 0.0 <= assistant["confidence"] <= 1.0
    
    # Validate citations structure
    if assistant["citations"]:
        citation = assistant["citations"][0]
        assert "doc_id" in citation
        assert "chunk_id" in citation
        assert "label" in citation
        assert isinstance(citation["doc_id"], str)
        assert isinstance(citation["chunk_id"], str)
        assert isinstance(citation["label"], str)
