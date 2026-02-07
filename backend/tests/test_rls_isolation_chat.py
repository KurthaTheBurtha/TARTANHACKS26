"""
RLS isolation tests for chat.
Ensures user A cannot access user B's chat sessions or messages.
"""
import pytest
from fastapi import status
from tests.conftest import TEST_USER_A, TEST_USER_B


def test_chat_isolation_session_access(client):
    """Test that users cannot access other users' chat sessions."""
    # User A creates a chat session
    headers_a = {"X-Test-User": TEST_USER_A}
    response_a = client.post(
        "/v1/chat/sessions",
        json={},
        headers=headers_a
    )
    assert response_a.status_code == status.HTTP_200_OK
    session_id_a = response_a.json()["session_id"]
    
    # User B tries to send a message to User A's session
    headers_b = {"X-Test-User": TEST_USER_B}
    response_b = client.post(
        f"/v1/chat/sessions/{session_id_a}/messages",
        json={"content": "Hello"},
        headers=headers_b
    )
    
    # Should return 404 (not found)
    assert response_b.status_code == status.HTTP_404_NOT_FOUND


def test_chat_isolation_stream_access(client):
    """Test that users cannot stream messages to other users' sessions."""
    # User A creates a chat session
    headers_a = {"X-Test-User": TEST_USER_A}
    response_a = client.post(
        "/v1/chat/sessions",
        json={},
        headers=headers_a
    )
    assert response_a.status_code == status.HTTP_200_OK
    session_id_a = response_a.json()["session_id"]
    
    # User B tries to stream a message to User A's session
    headers_b = {"X-Test-User": TEST_USER_B}
    response_b = client.post(
        f"/v1/chat/sessions/{session_id_a}/messages/stream",
        json={"text": "Hello"},
        headers=headers_b
    )
    
    # Should return 404 or error in stream
    assert response_b.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_200_OK]
    # If 200, check that stream contains error event
    if response_b.status_code == status.HTTP_200_OK:
        content = response_b.text
        # Should contain error event or be empty
        assert "event: error" in content or len(content) == 0


def test_chat_isolation_user_can_access_own(client):
    """Test that users can access their own chat sessions."""
    # User A creates a chat session
    headers_a = {"X-Test-User": TEST_USER_A}
    response_a = client.post(
        "/v1/chat/sessions",
        json={},
        headers=headers_a
    )
    assert response_a.status_code == status.HTTP_200_OK
    session_id_a = response_a.json()["session_id"]
    
    # User A can send message to their own session
    response_msg = client.post(
        f"/v1/chat/sessions/{session_id_a}/messages",
        json={"content": "Hello"},
        headers=headers_a
    )
    
    # Should succeed
    assert response_msg.status_code == status.HTTP_200_OK
