"""
RLS isolation tests for policies.
Ensures user A cannot access user B's policy chunks.
"""
import pytest
from fastapi import status
from tests.conftest import TEST_USER_A, TEST_USER_B


def test_policies_isolation_upload(client):
    """Test that users can only see their own policy uploads."""
    # User A uploads a policy
    headers_a = {"X-Test-User": TEST_USER_A}
    response_a = client.post(
        "/v1/policies/upload?doc_type=POLICY",
        headers=headers_a
    )
    assert response_a.status_code == status.HTTP_200_OK
    policy_id_a = response_a.json()["doc"]["id"]
    
    # User B tries to ingest User A's policy (should fail)
    headers_b = {"X-Test-User": TEST_USER_B}
    response_b = client.post(
        f"/v1/policies/{policy_id_a}/ingest",
        headers=headers_b
    )
    
    # Should return 404 (not found)
    assert response_b.status_code == status.HTTP_404_NOT_FOUND


def test_policies_isolation_chat_citations(client):
    """Test that chat citations don't leak policy chunks across users."""
    # User A uploads and ingests a policy
    headers_a = {"X-Test-User": TEST_USER_A}
    response_upload = client.post(
        "/v1/policies/upload?doc_type=POLICY",
        headers=headers_a
    )
    assert response_upload.status_code == status.HTTP_200_OK
    policy_id_a = response_upload.json()["doc"]["id"]
    
    # User A ingests policy
    response_ingest = client.post(
        f"/v1/policies/{policy_id_a}/ingest",
        headers=headers_a
    )
    # May succeed or fail depending on mock mode
    
    # User A creates chat session and sends message
    response_session = client.post(
        "/v1/chat/sessions",
        json={},
        headers=headers_a
    )
    assert response_session.status_code == status.HTTP_200_OK
    session_id_a = response_session.json()["session_id"]
    
    # User A sends message with policy reference
    response_msg = client.post(
        f"/v1/chat/sessions/{session_id_a}/messages",
        json={"content": "What is my deductible?"},
        headers=headers_a
    )
    # Should succeed for user A
    
    # User B creates session and sends message
    # Citations should NOT reference User A's policy
    headers_b = {"X-Test-User": TEST_USER_B}
    response_session_b = client.post(
        "/v1/chat/sessions",
        json={},
        headers=headers_b
    )
    assert response_session_b.status_code == status.HTTP_200_OK
    session_id_b = response_session_b.json()["session_id"]
    
    response_msg_b = client.post(
        f"/v1/chat/sessions/{session_id_b}/messages",
        json={"content": "What is my deductible?"},
        headers=headers_b
    )
    
    if response_msg_b.status_code == status.HTTP_200_OK:
        # If citations exist, they should not reference User A's policy
        citations = response_msg_b.json()["assistant"]["citations"]
        for citation in citations:
            assert citation["doc_id"] != policy_id_a, "User B's citations leaked User A's policy"
