"""
RAG retriever for vector search in policy_chunks.
"""
from typing import List, Dict, Optional
from app.services.rag.embedder import embed_query
from app.services.db.supabase_db import db_service
from app.core.logging import safe_log_error, safe_log_info


class ChunkResult:
    """Result from vector search."""
    def __init__(self, chunk_id: str, doc_id: str, text: str, similarity: float, metadata: Optional[dict] = None):
        self.chunk_id = chunk_id
        self.doc_id = doc_id
        self.text = text
        self.similarity = similarity
        self.metadata = metadata or {}


def search_chunks(
    query: str,
    user_id: str,
    top_k: int = 5,
    doc_id: Optional[str] = None
) -> List[ChunkResult]:
    """
    Search policy chunks using vector similarity.
    Always filters by user_id to prevent data leakage.
    """
    if not db_service.is_configured():
        safe_log_info("DB not configured, returning empty results")
        return []
    
    try:
        # Generate query embedding
        query_embedding = embed_query(query)
        
        # Build SQL query for vector search
        # Use cosine similarity with pgvector
        filter_conditions = ["documents.user_id = %s"]
        params = [user_id]
        
        if doc_id:
            filter_conditions.append("policy_chunks.doc_id = %s")
            params.append(doc_id)
        
        filter_sql = " AND ".join(filter_conditions)
        
        # Vector similarity query
        # Note: This is a simplified version; actual implementation may vary
        # based on Supabase client capabilities
        query_sql = f"""
            SELECT 
                policy_chunks.id as chunk_id,
                policy_chunks.doc_id,
                policy_chunks.chunk_text,
                policy_chunks.metadata,
                1 - (policy_chunks.embedding <=> %s::vector) as similarity
            FROM policy_chunks
            JOIN documents ON documents.id = policy_chunks.doc_id
            WHERE {filter_sql}
            ORDER BY policy_chunks.embedding <=> %s::vector
            LIMIT %s
        """
        
        params.extend([str(query_embedding), str(query_embedding), top_k])
        
        # Execute via Supabase client
        # Note: Supabase Python client may need raw SQL execution
        # For now, we'll use a workaround with the client
        results = _execute_vector_search(query_sql, params, query_embedding, user_id, doc_id, top_k)
        
        return results
    except Exception as e:
        safe_log_error("Vector search failed", e, query_length=len(query))
        return []


def _execute_vector_search(
    query_sql: str,
    params: List,
    query_embedding: List[float],
    user_id: str,
    doc_id: Optional[str],
    top_k: int
) -> List[ChunkResult]:
    """
    Execute vector search using Supabase.
    Falls back to simple text search if vector search not available.
    """
    try:
        # Try to use Supabase RPC or direct query
        # For MVP, we'll use a simpler approach: fetch all user's chunks and filter client-side
        # In production, use Supabase's vector search capabilities
        
        # Get user's policy documents
        from app.services.db.supabase_db import db_service
        
        # Fetch policy chunks for user's documents
        chunks_query = db_service.client.table("policy_chunks").select(
            "id, doc_id, chunk_text, metadata, chunk_index"
        )
        
        # Join with documents to filter by user_id
        # This is a simplified approach; in production, use proper vector search
        documents = db_service.client.table("documents").select("id").eq("user_id", user_id).in_("type", ["POLICY", "SOB"]).execute()
        
        if not documents.data:
            return []
        
        doc_ids = [doc["id"] for doc in documents.data]
        if doc_id and doc_id in doc_ids:
            doc_ids = [doc_id]
        
        if not doc_ids:
            return []
        
        # Get chunks for these documents
        chunks = db_service.client.table("policy_chunks").select(
            "id, doc_id, chunk_text, metadata, chunk_index"
        ).in_("doc_id", doc_ids).execute()
        
        if not chunks.data:
            return []
        
        # Simple text-based similarity (fallback when vector search not available)
        # In production, use proper pgvector cosine similarity
        query_lower = query.lower()
        scored_chunks = []
        
        for chunk in chunks.data:
            chunk_text = chunk.get("chunk_text", "")
            # Simple keyword matching score
            keywords = query_lower.split()
            matches = sum(1 for kw in keywords if kw in chunk_text.lower())
            similarity = matches / max(len(keywords), 1) if keywords else 0.0
            
            if similarity > 0:
                scored_chunks.append(ChunkResult(
                    chunk_id=chunk["id"],
                    doc_id=chunk["doc_id"],
                    text=chunk_text[:500],  # Truncate for response
                    similarity=min(similarity, 1.0),
                    metadata=chunk.get("metadata")
                ))
        
        # Sort by similarity and return top_k
        scored_chunks.sort(key=lambda x: x.similarity, reverse=True)
        return scored_chunks[:top_k]
        
    except Exception as e:
        safe_log_error("Vector search execution failed", e)
        return []
