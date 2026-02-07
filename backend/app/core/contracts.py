"""
Canonical contract examples and validators for API responses.
These ensure frontend and backend stay aligned on response shapes.
"""
from typing import Dict, Any

# Document Analysis Contract
DOC_ANALYZE_EXAMPLE: Dict[str, Any] = {
    "doc": {
        "id": "doc_123",
        "type": "EOB",
        "status": "analyzed",
        "created_at": "2026-02-06T00:00:00Z"
    },
    "extraction": {
        "patient_responsibility": 215.44,
        "provider": "Example Medical Group",
        "service_date": "2025-11-03",
        "line_items": [
            {
                "description": "Office visit",
                "cpt": "99213",
                "billed": 310.0,
                "allowed": 180.0,
                "plan_paid": 0.0,
                "you_owe": 180.0,
                "network_status": "in_network"
            }
        ],
        "plain_english_summary": "Your plan reduced the charge to an allowed amount. Because your deductible applies, you may owe the allowed amount.",
        "next_steps": [
            "Confirm the provider was in-network on the date of service.",
            "Check whether the deductible was already met.",
            "If this looks wrong, request an itemized bill and compare CPT codes."
        ]
    }
}

# Document Upload Contract
DOC_UPLOAD_EXAMPLE: Dict[str, Any] = {
    "doc": {
        "id": "doc_123",
        "type": "EOB",
        "status": "pending_upload",
        "created_at": "2026-02-06T00:00:00Z"
    },
    "upload": {
        "bucket": "documents",
        "path": "user/user_123/docs/doc_123/document.pdf",
        "signed_url": "https://example.com/signed-url",
        "expires_in": 600
    }
}

# Chat Message Contract
CHAT_MESSAGE_EXAMPLE: Dict[str, Any] = {
    "session_id": "chat_abc",
    "message_id": "msg_010",
    "assistant": {
        "text": "Based on your plan summary, in-network office visits apply to the deductible first. If your deductible is not met, you may owe the allowed amount.",
        "citations": [
            {
                "doc_id": "policy_001",
                "chunk_id": "chunk_12",
                "label": "Summary of Benefits — Deductible section"
            }
        ],
        "confidence": 0.74,
        "disclaimer": "I'm not a lawyer or your insurer; verify with your plan documents or insurer."
    }
}

# Policy Upload Contract
POLICY_UPLOAD_EXAMPLE: Dict[str, Any] = {
    "doc": {
        "id": "policy_001",
        "type": "POLICY",
        "status": "pending_upload",
        "created_at": "2026-02-06T00:00:00Z"
    },
    "upload": {
        "bucket": "documents",
        "path": "user/user_123/policies/policy_001/summary-of-benefits.pdf",
        "signed_url": "https://example.com/signed-url",
        "expires_in": 600
    }
}

# Policy Ingest Contract
POLICY_INGEST_EXAMPLE: Dict[str, Any] = {
    "doc_id": "policy_001",
    "status": "ingested",
    "chunks_created": 42,
    "embedding_model": "text-embedding-3-small",
    "notes": "Fallback embeddings used if OPENAI_API_KEY missing."
}

# Providers Search Contract
PROVIDERS_SEARCH_EXAMPLE: Dict[str, Any] = {
    "query": "Dermatologist",
    "center": {
        "lat": 40.4433,
        "lng": -79.9436
    },
    "radius_miles": 10,
    "providers": [
        {
            "provider_id": "mock_001",
            "name": "UPMC Dermatology",
            "lat": 40.441,
            "lng": -79.95,
            "address": "Example St, Pittsburgh, PA",
            "phone": "+1-412-555-0101",
            "types": ["doctor", "health"],
            "distance_miles": 1.7,
            "network": {
                "status": "unknown",
                "confidence": 0.55,
                "reasons": [
                    "Provider appears affiliated with a major local health system",
                    "Policy indicates PPO-style network usage (limited signal)"
                ],
                "evidence": [
                    {
                        "doc_id": "policy_001",
                        "chunk_id": "chunk_07",
                        "label": "Network overview"
                    }
                ]
            }
        }
    ],
    "cache": {
        "hit": False,
        "ttl_seconds": 86400
    }
}

# Health Check Contract
HEALTH_EXAMPLE: Dict[str, Any] = {
    "ok": True
}
