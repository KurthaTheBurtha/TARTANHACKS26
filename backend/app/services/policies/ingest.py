"""
Policy document ingestion orchestrator.
Handles: download → extract → chunk → embed → store
"""
from typing import Dict, Any, Optional
from app.services.storage.supabase_storage import storage_service
from app.services.policies.pdf_extract import extract_text_from_pdf, is_valid_extraction
from app.services.policies.chunker import chunk_text
from app.services.rag.embedder import embed_text
from app.services.db.policies_repo import create_policy_chunks_batch
from app.services.db.supabase_db import db_service
from app.core.logging import safe_log_info, safe_log_error


class IngestResult:
    """Result from policy ingestion."""
    def __init__(
        self,
        doc_id: str,
        status: str,
        chunks_created: int,
        embedding_model: str,
        notes: Optional[str] = None
    ):
        self.doc_id = doc_id
        self.status = status
        self.chunks_created = chunks_created
        self.embedding_model = embedding_model
        self.notes = notes


def ingest_policy_document(doc_id: str, user_id: str) -> IngestResult:
    """
    Ingest a policy document: download, extract, chunk, embed, store.
    """
    if not storage_service.is_configured() or not db_service.is_configured():
        return IngestResult(
            doc_id=doc_id,
            status="error",
            chunks_created=0,
            embedding_model="none",
            notes="Storage or DB not configured"
        )
    
    try:
        # Get document record
        doc_record = db_service.get_document(doc_id=doc_id, user_id=user_id)
        if not doc_record:
            return IngestResult(
                doc_id=doc_id,
                status="error",
                chunks_created=0,
                embedding_model="none",
                notes="Document not found"
            )
        
        # Update status to processing
        db_service.update_document_status(doc_id=doc_id, status="processing")
        
        # Get storage path
        storage_path = doc_record.get("storage_path")
        if not storage_path:
            return IngestResult(
                doc_id=doc_id,
                status="error",
                chunks_created=0,
                embedding_model="none",
                notes="Storage path not found"
            )
        
        # Download file
        safe_log_info("Downloading policy document", doc_id=doc_id)
        file_bytes = storage_service.download_bytes(storage_path)
        if not file_bytes:
            db_service.update_document_status(doc_id=doc_id, status="error")
            return IngestResult(
                doc_id=doc_id,
                status="error",
                chunks_created=0,
                embedding_model="none",
                notes="Failed to download document"
            )
        
        # Extract text
        safe_log_info("Extracting text from PDF", doc_id=doc_id)
        extracted_text = extract_text_from_pdf(file_bytes)
        if not is_valid_extraction(extracted_text):
            db_service.update_document_status(doc_id=doc_id, status="error")
            return IngestResult(
                doc_id=doc_id,
                status="error",
                chunks_created=0,
                embedding_model="none",
                notes="Failed to extract text from PDF. Please upload a text-based PDF."
            )
        
        # Chunk text
        safe_log_info("Chunking text", doc_id=doc_id, text_length=len(extracted_text))
        chunks = chunk_text(extracted_text, chunk_size=1000, overlap=150)
        
        if not chunks:
            db_service.update_document_status(doc_id=doc_id, status="error")
            return IngestResult(
                doc_id=doc_id,
                status="error",
                chunks_created=0,
                embedding_model="none",
                notes="No chunks created from text"
            )
        
        # Embed chunks
        safe_log_info("Embedding chunks", doc_id=doc_id, chunk_count=len(chunks))
        embedding_model = "text-embedding-3-small" if storage_service.is_configured() and db_service.is_configured() else "deterministic-hash"
        
        chunks_with_embeddings = []
        for i, chunk in enumerate(chunks):
            embedding = embed_text(chunk["text"])
            chunks_with_embeddings.append({
                "text": chunk["text"],
                "chunk_index": chunk["chunk_index"],
                "embedding": embedding,
                "metadata": {
                    "label": f"Policy document — Section {chunk['chunk_index'] + 1}",
                    "source": doc_record.get("file_name", "policy.pdf")
                }
            })
        
        # Store chunks
        safe_log_info("Storing policy chunks", doc_id=doc_id, chunk_count=len(chunks_with_embeddings))
        chunks_created = create_policy_chunks_batch(doc_id, chunks_with_embeddings)
        
        if chunks_created == 0:
            db_service.update_document_status(doc_id=doc_id, status="error")
            return IngestResult(
                doc_id=doc_id,
                status="error",
                chunks_created=0,
                embedding_model=embedding_model,
                notes="Failed to store chunks in database"
            )
        
        # Update document status
        db_service.update_document_status(doc_id=doc_id, status="ingested")
        
        notes = "Fallback embeddings used if OPENAI_API_KEY missing." if embedding_model == "deterministic-hash" else None
        
        return IngestResult(
            doc_id=doc_id,
            status="ingested",
            chunks_created=chunks_created,
            embedding_model=embedding_model,
            notes=notes
        )
    except Exception as e:
        safe_log_error("Policy ingestion failed", e, doc_id=doc_id)
        if db_service.is_configured():
            db_service.update_document_status(doc_id=doc_id, status="error")
        return IngestResult(
            doc_id=doc_id,
            status="error",
            chunks_created=0,
            embedding_model="none",
            notes=f"Ingestion failed: {str(e)}"
        )
