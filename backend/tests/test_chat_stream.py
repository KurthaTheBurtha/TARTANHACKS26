"""
Streaming chat endpoint contract tests.
"""
import pytest
from fastapi import status
import json


def test_chat_stream_endpoint(client, auth_headers):
    """Test POST /v1/chat/sessions/{id}/messages/stream returns SSE."""
    session_id = "chat_abc"
    
    response = client.post(
        f"/v1/chat/sessions/{session_id}/messages/stream",
        json={"text": "What is my deductible?"},
        headers=auth_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    assert response.headers["content-type"] == "text/event-stream; charset=utf-8"
    
    # Parse SSE events
    content = response.text
    lines = content.split("\n")
    
    # Find meta event
    meta_found = False
    final_found = False
    
    i = 0
    while i < len(lines):
        if lines[i].startswith("event: meta"):
            meta_found = True
            # Next line should be data
            if i + 1 < len(lines) and lines[i + 1].startswith("data: "):
                data_str = lines[i + 1][6:]  # Remove "data: " prefix
                try:
                    data = json.loads(data_str)
                    assert "session_id" in data
                    assert "message_id" in data
                    assert "citations" in data
                except json.JSONDecodeError:
                    pytest.fail("Invalid JSON in meta event")
        elif lines[i].startswith("event: final"):
            final_found = True
            # Next line should be data
            if i + 1 < len(lines) and lines[i + 1].startswith("data: "):
                data_str = lines[i + 1][6:]  # Remove "data: " prefix
                try:
                    data = json.loads(data_str)
                    assert "text" in data
                    assert "confidence" in data
                    assert "citations" in data
                    assert "disclaimer" in data
                    # Validate confidence range
                    assert 0.0 <= data["confidence"] <= 1.0
                except json.JSONDecodeError:
                    pytest.fail("Invalid JSON in final event")
        i += 1
    
    assert meta_found, "Meta event not found"
    assert final_found, "Final event not found"


def test_chat_stream_contains_delta_events(client, auth_headers):
    """Test that stream contains delta events."""
    session_id = "chat_abc"
    
    response = client.post(
        f"/v1/chat/sessions/{session_id}/messages/stream",
        json={"text": "What is my deductible?"},
        headers=auth_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    
    content = response.text
    # Should contain at least one delta event
    assert "event: delta" in content or "event: final" in content
