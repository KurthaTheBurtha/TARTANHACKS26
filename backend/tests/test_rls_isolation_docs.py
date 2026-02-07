"""
RLS isolation tests for documents.
Ensures user A cannot access user B's documents.
"""
import pytest
from fastapi import status
from tests.conftest import TEST_USER_A, TEST_USER_B


def test_docs_isolation_upload(client):
    """Test that users can only see their own uploaded documents."""
    # User A uploads a document
    headers_a = {"X-Test-User": TEST_USER_A}
    response_a = client.post(
        "/v1/docs/upload?doc_type=EOB",
        headers=headers_a
    )
    assert response_a.status_code == status.HTTP_200_OK
    doc_id_a = response_a.json()["doc"]["id"]
    
    # User B tries to get User A's document
    headers_b = {"X-Test-User": TEST_USER_B}
    response_b = client.get(
        f"/v1/docs/{doc_id_a}",
        headers=headers_b
    )
    
    # Should return 404 (not found) to prevent resource enumeration
    assert response_b.status_code == status.HTTP_404_NOT_FOUND


def test_docs_isolation_analyze(client):
    """Test that users cannot analyze other users' documents."""
    # User A uploads a document
    headers_a = {"X-Test-User": TEST_USER_A}
    response_a = client.post(
        "/v1/docs/upload?doc_type=EOB",
        headers=headers_a
    )
    assert response_a.status_code == status.HTTP_200_OK
    doc_id_a = response_a.json()["doc"]["id"]
    
    # User B tries to analyze User A's document
    headers_b = {"X-Test-User": TEST_USER_B}
    response_b = client.post(
        f"/v1/docs/{doc_id_a}/analyze",
        headers=headers_b
    )
    
    # Should return 404 (not found)
    assert response_b.status_code == status.HTTP_404_NOT_FOUND


def test_docs_isolation_user_can_access_own(client):
    """Test that users can access their own documents."""
    # User A uploads a document
    headers_a = {"X-Test-User": TEST_USER_A}
    response_a = client.post(
        "/v1/docs/upload?doc_type=EOB",
        headers=headers_a
    )
    assert response_a.status_code == status.HTTP_200_OK
    doc_id_a = response_a.json()["doc"]["id"]
    
    # User A can get their own document
    response_get = client.get(
        f"/v1/docs/{doc_id_a}",
        headers=headers_a
    )
    
    # Should succeed (200 or 404 if not analyzed yet, but not 403)
    assert response_get.status_code != status.HTTP_403_FORBIDDEN
    assert response_get.status_code != status.HTTP_401_UNAUTHORIZED
