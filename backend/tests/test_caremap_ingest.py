"""
CareMap ingest integration test (happy path).
Asserts unified response shape; passes in all-mock mode.
"""
import os
import io

import pytest
from fastapi import status


# Minimal valid PDF (single page) so upload is accepted
MINIMAL_PDF_BYTES = (
    b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
    b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
    b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\n"
    b"xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000101 00000 n \n"
    b"trailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF"
)


def _sample_bill_path():
    """Resolve sample bill PDF: /mnt/data or repo root."""
    for path in (
        "/mnt/data/billing_statement.pdf",
        os.path.join(os.path.dirname(__file__), "..", "..", "billing_statement.pdf"),
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "billing_statement.pdf"),
    ):
        if os.path.isfile(path):
            return path
    return None


def _sample_sob_path():
    """Resolve sample SOB PDF."""
    for path in (
        "/mnt/data/summary-of-benefits.pdf",
        os.path.join(os.path.dirname(__file__), "..", "..", "summary-of-benefits.pdf"),
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "summary-of-benefits.pdf"),
    ):
        if os.path.isfile(path):
            return path
    return None


def test_caremap_health(client):
    """GET /v1/caremap/health returns component status."""
    response = client.get("/v1/caremap/health")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "bill_parser" in data
    assert "integrations" in data
    assert "rag" in data
    assert data["bill_parser"] in ("live", "mock")
    assert data["integrations"] in ("live", "mock")
    assert data["rag"] in ("live", "mock")


def test_caremap_ingest_missing_bill(client):
    """POST without bill_pdf returns 422/400."""
    response = client.post(
        "/v1/caremap/ingest",
        data={},
    )
    assert response.status_code in (status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY)


def test_caremap_ingest_happy_path(client):
    """
    POST /v1/caremap/ingest with a PDF returns unified response.
    Uses sample PDF from repo/CI if present, else minimal PDF (mock path).
    Asserts: bill.line_items >= 1, guidance.summary_plain_english non-empty, navigation.results >= 1.
    Passes in all-mock mode.
    """
    bill_path = _sample_bill_path()
    sob_path = _sample_sob_path()

    if bill_path:
        with open(bill_path, "rb") as f:
            bill_bytes = f.read()
        filename = "billing_statement.pdf"
    else:
        bill_bytes = MINIMAL_PDF_BYTES
        filename = "bill.pdf"

    files = [
        ("bill_pdf", (filename, bill_bytes, "application/pdf")),
    ]
    if sob_path and os.path.isfile(sob_path):
        with open(sob_path, "rb") as f:
            files.append(("sob_pdf", ("summary-of-benefits.pdf", f.read(), "application/pdf")))

    data = {}
    data["user_context"] = '{"zip_code": "15213", "radius_miles": 10, "specialty_keywords": ["primary care"]}'

    response = client.post(
        "/v1/caremap/ingest",
        files=files,
        data=data,
    )

    assert response.status_code == status.HTTP_200_OK, response.text
    body = response.json()

    assert "bill" in body
    assert "line_items" in body["bill"]
    assert len(body["bill"]["line_items"]) >= 1, "at least one line item (or mock)"
    assert "guidance" in body
    assert "summary_plain_english" in body["guidance"]
    assert len((body["guidance"].get("summary_plain_english") or "").strip()) > 0
    assert "navigation" in body
    assert "results" in body["navigation"]
    assert len(body["navigation"]["results"]) >= 1, "at least one navigation result (or mock)"
    assert "errors" in body
    assert isinstance(body["errors"], list)

    if body["bill"]["line_items"]:
        item = body["bill"]["line_items"][0]
        assert "description" in item
