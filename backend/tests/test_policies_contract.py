"""
Policy endpoints contract tests.
"""
import pytest
from fastapi import status
from app.core.contracts import POLICY_UPLOAD_EXAMPLE, POLICY_INGEST_EXAMPLE


def test_policies_upload_contract(client, auth_headers):
    """Test POST /v1/policies/upload returns correct shape."""
    response = client.post(
        "/v1/policies/upload?doc_type=POLICY",
        headers=auth_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    # Validate required fields
    assert "doc" in data
    assert "upload" in data
    
    doc = data["doc"]
    assert "id" in doc
    assert "type" in doc
    assert "status" in doc
    assert "created_at" in doc
    
    upload = data["upload"]
    assert "bucket" in upload
    assert "path" in upload
    assert "expires_in" in upload
    
    # Validate types
    assert isinstance(doc["id"], str)
    assert doc["type"] in ["POLICY", "SOB"]
    assert isinstance(upload["bucket"], str)
    assert isinstance(upload["path"], str)


def test_policies_ingest_contract(client, auth_headers):
    """Test POST /v1/policies/{doc_id}/ingest returns correct shape."""
    doc_id = "policy_001"
    response = client.post(
        f"/v1/policies/{doc_id}/ingest",
        headers=auth_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    # Validate required fields
    assert "doc_id" in data
    assert "status" in data
    assert "chunks_created" in data
    assert "embedding_model" in data
    
    # Validate types
    assert isinstance(data["doc_id"], str)
    assert isinstance(data["status"], str)
    assert isinstance(data["chunks_created"], int)
    assert isinstance(data["embedding_model"], str)
    
    # Validate status enum
    assert data["status"] in ["ingested", "error", "processing"]
    
    # notes is optional
    if "notes" in data:
        assert isinstance(data["notes"], str)
