"""
Database repository for policy chunks operations.
"""
from typing import List, Dict, Any, Optional
from app.services.db.supabase_db import db_service
from app.core.logging import safe_log_error


def create_policy_chunk(
    doc_id: str,
    chunk_text: str,
    chunk_index: int,
    embedding: List[float],
    metadata: Optional[Dict[str, Any]] = None
) -> Optional[str]:
    """Create a policy chunk record. Returns chunk_id."""
    if not db_service.is_configured():
        return None
    
    try:
        result = db_service.client.table("policy_chunks").insert({
            "doc_id": doc_id,
            "chunk_text": chunk_text,
            "chunk_index": chunk_index,
            "embedding": embedding,
            "metadata": metadata or {}
        }).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]["id"]
        return None
    except Exception as e:
        safe_log_error("Failed to create policy chunk", e, doc_id=doc_id, chunk_index=chunk_index)
        return None


def create_policy_chunks_batch(
    doc_id: str,
    chunks: List[Dict[str, Any]]
) -> int:
    """
    Create multiple policy chunks in a batch.
    Returns number of chunks created.
    """
    if not db_service.is_configured():
        return 0
    
    if not chunks:
        return 0
    
    try:
        items_to_insert = []
        for chunk in chunks:
            items_to_insert.append({
                "doc_id": doc_id,
                "chunk_text": chunk["text"],
                "chunk_index": chunk["chunk_index"],
                "embedding": chunk.get("embedding", []),
                "metadata": chunk.get("metadata", {})
            })
        
        result = db_service.client.table("policy_chunks").insert(items_to_insert).execute()
        return len(result.data) if result.data else 0
    except Exception as e:
        safe_log_error("Failed to create policy chunks batch", e, doc_id=doc_id, chunk_count=len(chunks))
        return 0


def get_policy_chunks_count(doc_id: str) -> int:
    """Get count of chunks for a policy document."""
    if not db_service.is_configured():
        return 0
    
    try:
        result = db_service.client.table("policy_chunks").select("id", count="exact").eq("doc_id", doc_id).execute()
        return result.count if hasattr(result, 'count') else 0
    except Exception as e:
        safe_log_error("Failed to get policy chunks count", e, doc_id=doc_id)
        return 0
