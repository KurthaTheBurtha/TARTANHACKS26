"""
Document endpoints contract tests.
"""
import pytest
from fastapi import status
from app.core.contracts import DOC_UPLOAD_EXAMPLE, DOC_ANALYZE_EXAMPLE


def test_docs_upload_contract(client, auth_headers):
    """Test POST /v1/docs/upload returns correct shape."""
    response = client.post(
        "/v1/docs/upload?doc_type=EOB",
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
    assert isinstance(doc["type"], str)
    assert isinstance(doc["status"], str)
    assert isinstance(upload["bucket"], str)
    assert isinstance(upload["path"], str)


def test_docs_analyze_contract(client, auth_headers):
    """Test POST /v1/docs/{doc_id}/analyze returns correct shape."""
    doc_id = "doc_123"
    response = client.post(
        f"/v1/docs/{doc_id}/analyze",
        headers=auth_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    # Validate required fields
    assert "doc" in data
    assert "extraction" in data
    
    doc = data["doc"]
    assert "id" in doc
    assert "type" in doc
    assert "status" in doc
    assert "created_at" in doc
    
    extraction = data["extraction"]
    assert "patient_responsibility" in extraction
    assert "provider" in extraction
    assert "service_date" in extraction
    assert "line_items" in extraction
    assert "plain_english_summary" in extraction
    assert "next_steps" in extraction
    
    # Validate types
    assert isinstance(extraction["patient_responsibility"], (int, float))
    assert isinstance(extraction["provider"], str)
    assert isinstance(extraction["service_date"], str)
    assert isinstance(extraction["line_items"], list)
    assert isinstance(extraction["plain_english_summary"], str)
    assert isinstance(extraction["next_steps"], list)
    
    # Validate line item structure
    if extraction["line_items"]:
        line_item = extraction["line_items"][0]
        assert "description" in line_item
        assert "cpt" in line_item
        assert "billed" in line_item
        assert "allowed" in line_item
        assert "plan_paid" in line_item
        assert "you_owe" in line_item
        assert "network_status" in line_item


def test_docs_get_contract(client, auth_headers):
    """Test GET /v1/docs/{doc_id} returns correct shape."""
    doc_id = "doc_123"
    response = client.get(
        f"/v1/docs/{doc_id}",
        headers=auth_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    # Validate required fields
    assert "doc" in data
    
    doc = data["doc"]
    assert "id" in doc
    assert "type" in doc
    assert "status" in doc
    assert "created_at" in doc
    
    # extraction may be null
    if "extraction" in data and data["extraction"] is not None:
        extraction = data["extraction"]
        assert "patient_responsibility" in extraction
        assert "provider" in extraction
