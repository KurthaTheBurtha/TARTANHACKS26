# API Contracts Documentation

## Overview

This document defines the **guaranteed** API response shapes that the backend provides. These contracts ensure frontend and backend stay aligned, and breaking changes are caught by contract tests.

## Contract Guarantees

### What We Guarantee

1. **Required Fields:** All fields listed in contract examples are present in responses
2. **Field Types:** Types match exactly (string, number, boolean, array, object)
3. **Enum Values:** Status fields use only specified enum values
4. **Nested Structure:** Objects and arrays maintain consistent structure
5. **Mock Consistency:** In mock mode, deterministic values match contract examples exactly

### What We Don't Guarantee

1. **Field Order:** JSON field order may vary
2. **Additional Fields:** Responses may include extra fields (additive only)
3. **Exact Values:** Non-mock responses may have different values (but same structure)
4. **Optional Fields:** Fields marked optional may be null or omitted

## Contract Examples

All canonical contract examples are defined in `backend/app/core/contracts.py`:

- `HEALTH_EXAMPLE`
- `DOC_UPLOAD_EXAMPLE`
- `DOC_ANALYZE_EXAMPLE`
- `CHAT_MESSAGE_EXAMPLE`
- `POLICY_UPLOAD_EXAMPLE`
- `POLICY_INGEST_EXAMPLE`
- `PROVIDERS_SEARCH_EXAMPLE`

## Endpoint Contracts

### Health Check

**Endpoint:** `GET /health`

**Response:**
```json
{
  "ok": true
}
```

**Guarantees:**
- `ok` is always `true` (boolean)
- No other fields required

---

### Document Upload

**Endpoint:** `POST /v1/docs/upload?doc_type={type}`

**Response:**
```json
{
  "doc": {
    "id": "string (UUID)",
    "type": "string (EOB|BILL|SOB|POLICY)",
    "status": "string",
    "created_at": "string (ISO 8601)"
  },
  "upload": {
    "bucket": "string",
    "path": "string",
    "signed_url": "string | null",
    "expires_in": "number | null"
  },
  "warning": "string | null (optional)"
}
```

**Guarantees:**
- `doc.id` is a valid UUID string
- `doc.type` matches one of: EOB, BILL, SOB, POLICY
- `upload.bucket` is always "documents"
- `upload.path` follows pattern: `user/{user_id}/docs/{doc_id}/{filename}`

---

### Document Analysis

**Endpoint:** `POST /v1/docs/{doc_id}/analyze`

**Response:**
```json
{
  "doc": {
    "id": "string",
    "type": "string",
    "status": "string",
    "created_at": "string"
  },
  "extraction": {
    "patient_responsibility": "number",
    "provider": "string",
    "service_date": "string (YYYY-MM-DD)",
    "line_items": [
      {
        "description": "string",
        "cpt": "string",
        "billed": "number",
        "allowed": "number",
        "plan_paid": "number",
        "you_owe": "number",
        "network_status": "string"
      }
    ],
    "plain_english_summary": "string",
    "next_steps": ["string"]
  },
  "warning": "string | null (optional)"
}
```

**Guarantees:**
- `extraction.patient_responsibility` is a non-negative number
- `extraction.line_items` is an array (may be empty)
- All line item fields are numbers (except description, cpt, network_status)
- `extraction.next_steps` is an array of strings

---

### Chat Message

**Endpoint:** `POST /v1/chat/sessions/{session_id}/messages`

**Response:**
```json
{
  "session_id": "string",
  "message_id": "string",
  "assistant": {
    "text": "string",
    "citations": [
      {
        "doc_id": "string",
        "chunk_id": "string",
        "label": "string"
      }
    ],
    "confidence": "number (0.0-1.0)",
    "disclaimer": "string"
  }
}
```

**Guarantees:**
- `assistant.confidence` is between 0.0 and 1.0 (inclusive)
- `assistant.citations` is an array (may be empty)
- All citation fields are strings

---

### Policy Upload

**Endpoint:** `POST /v1/policies/upload?doc_type={POLICY|SOB}`

**Response:** Same shape as Document Upload

**Guarantees:**
- `doc.type` is either "POLICY" or "SOB"
- `upload.path` follows pattern: `user/{user_id}/policies/{doc_id}/{filename}`

---

### Policy Ingest

**Endpoint:** `POST /v1/policies/{doc_id}/ingest`

**Response:**
```json
{
  "doc_id": "string",
  "status": "string (ingested|error|processing)",
  "chunks_created": "number (>= 0)",
  "embedding_model": "string",
  "notes": "string | null (optional)"
}
```

**Guarantees:**
- `status` is one of: "ingested", "error", "processing"
- `chunks_created` is a non-negative integer
- `embedding_model` is a string (e.g., "text-embedding-3-small" or "deterministic-hash")

---

### Provider Search

**Endpoint:** `GET /v1/providers/search?query={query}&lat={lat}&lng={lng}&radius_miles={radius}`

**Response:**
```json
{
  "query": "string",
  "center": {
    "lat": "number",
    "lng": "number"
  },
  "radius_miles": "number",
  "providers": [
    {
      "provider_id": "string",
      "name": "string",
      "lat": "number",
      "lng": "number",
      "address": "string",
      "phone": "string | null",
      "types": ["string"],
      "distance_miles": "number (>= 0)",
      "network": {
        "status": "string (likely_in_network|unknown|likely_out_of_network)",
        "confidence": "number (0.0-1.0)",
        "reasons": ["string"],
        "evidence": [
          {
            "doc_id": "string",
            "chunk_id": "string",
            "label": "string"
          }
        ]
      },
      "npi": "string | null"
    }
  ],
  "cache": {
    "hit": "boolean",
    "ttl_seconds": "number"
  }
}
```

**Guarantees:**
- `providers` is an array (may be empty)
- `network.status` is one of: "likely_in_network", "unknown", "likely_out_of_network"
- `network.confidence` is between 0.0 and 1.0 (inclusive)
- `network.reasons` is an array of strings (may be empty)
- `network.evidence` is an array (may be empty)
- `cache.hit` is a boolean
- `cache.ttl_seconds` is 86400 (24 hours) in current implementation

---

## Contract Testing

All contracts are validated by automated tests in `backend/tests/test_*_contract.py`:

- `test_health.py` - Health check contract
- `test_docs_contract.py` - Document endpoints
- `test_chat_contract.py` - Chat endpoints
- `test_policies_contract.py` - Policy endpoints
- `test_providers_contract.py` - Provider endpoints

**Running Tests:**
```bash
make test          # Run all tests
pytest -q          # Quiet mode
pytest -v          # Verbose mode
```

## Breaking Changes

If you need to change a contract:

1. **Additive Changes:** Add new optional fields (safe)
2. **Breaking Changes:** 
   - Update contract example in `contracts.py`
   - Update all contract tests
   - Update frontend code
   - Document in changelog

**Never:**
- Remove required fields
- Change field types
- Change enum values
- Make required fields optional (without deprecation period)

## Mock Mode

In mock mode (when Supabase/OpenAI not configured), responses return **exactly** the contract examples. This ensures:

- Frontend can develop without backend dependencies
- Tests pass without external services
- Contract validation is deterministic

## Versioning

Contracts are versioned with the API:
- `/v1/*` endpoints use v1 contracts
- Future `/v2/*` endpoints may have different contracts
- Old contract versions remain valid until deprecated
