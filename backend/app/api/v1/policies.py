from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional
from datetime import datetime
import uuid
from app.models.schemas import (
    DocumentUploadResponse,
    DocumentResponse,
    UploadInfo
)
from app.core.security import get_current_user
from app.services.storage.supabase_storage import storage_service
from app.services.db.supabase_db import db_service
from app.services.policies.ingest import ingest_policy_document
from app.core.logging import safe_log_error

router = APIRouter()


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_policy(
    doc_type: str = Query(default="POLICY", description="Document type: POLICY or SOB"),
    current_user: dict = Depends(get_current_user)
):
    """
    Create a policy document record and return a signed upload URL.
    Mobile app should upload the PDF directly to the signed URL.
    """
    user_id = current_user.get("sub") or current_user.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token"
        )
    
    # Ensure doc_type is POLICY or SOB
    if doc_type not in ["POLICY", "SOB"]:
        doc_type = "POLICY"
    
    # Check if storage is configured
    if not storage_service.is_configured() or not db_service.is_configured():
        # Return mock response with warning
        doc_id = f"policy_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        return DocumentUploadResponse(
            doc=DocumentResponse(
                id=doc_id,
                type=doc_type,
                status="pending_upload",
                created_at=datetime.utcnow().isoformat() + "Z"
            ),
            upload=UploadInfo(
                bucket="documents",
                path=f"user/{user_id}/policies/{doc_id}/summary-of-benefits.pdf",
                signed_url=None,
                expires_in=None
            ),
            warning="Storage not configured; returned mock response."
        )
    
    try:
        # Generate doc_id (UUID)
        doc_id = str(uuid.uuid4())
        
        # Create document record
        filename = f"policy_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
        doc_record = db_service.create_document(
            user_id=user_id,
            doc_type=doc_type,
            file_name=filename,
            mime_type="application/pdf"
        )
        
        if not doc_record:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create document record"
            )
        
        # Get the actual doc_id from the record
        doc_id = doc_record["id"]
        
        # Create signed upload URL (use policies path)
        upload_info = storage_service.create_signed_upload_url(
            user_id=user_id,
            doc_id=doc_id,
            filename=filename,
            content_type="application/pdf"
        )
        
        # Update path to use policies folder
        if upload_info.get("path"):
            # Replace /docs/ with /policies/ in path
            upload_info["path"] = upload_info["path"].replace("/docs/", "/policies/")
        
        # Update document with storage path
        if upload_info.get("path"):
            db_service.update_document_status(
                doc_id=doc_id,
                status="pending_upload",
                storage_path=upload_info["path"]
            )
        
        return DocumentUploadResponse(
            doc=DocumentResponse(
                id=doc_id,
                type=doc_type,
                status="pending_upload",
                created_at=doc_record["created_at"]
            ),
            upload=UploadInfo(**upload_info)
        )
    except HTTPException:
        raise
    except Exception as e:
        safe_log_error("Failed to create policy upload", e, user_id=user_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create policy upload"
        )


@router.post("/{doc_id}/ingest")
async def ingest_policy(
    doc_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Ingest a policy document: extract text, chunk, embed, and store in vector DB.
    """
    user_id = current_user.get("sub") or current_user.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token"
        )
    
    # Check if services are configured
    if not storage_service.is_configured() or not db_service.is_configured():
        return {
            "doc_id": doc_id,
            "status": "error",
            "chunks_created": 0,
            "embedding_model": "none",
            "notes": "Storage or DB not configured"
        }
    
    try:
        # Verify document ownership
        doc_record = db_service.get_document(doc_id=doc_id, user_id=user_id)
        if not doc_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Policy document not found"
            )
        
        # Run ingestion
        result = ingest_policy_document(doc_id=doc_id, user_id=user_id)
        
        return {
            "doc_id": result.doc_id,
            "status": result.status,
            "chunks_created": result.chunks_created,
            "embedding_model": result.embedding_model,
            "notes": result.notes
        }
    except HTTPException:
        raise
    except Exception as e:
        safe_log_error("Failed to ingest policy", e, doc_id=doc_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to ingest policy document"
        )
