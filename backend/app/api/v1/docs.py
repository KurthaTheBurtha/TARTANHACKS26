from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional
from datetime import datetime
from uuid import UUID
from app.models.schemas import (
    DocumentUploadResponse,
    DocumentAnalysisResponse,
    DocumentResponse,
    Extraction,
    LineItem,
    UploadInfo
)
from app.core.security import get_current_user
from app.services.storage.supabase_storage import storage_service
from app.services.db.supabase_db import db_service
from app.services.docs.analyzer import analyze_document
from app.services.docs.parser import normalize_extraction
from app.core.logging import safe_log_info, safe_log_error

router = APIRouter()


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    doc_type: str = Query(..., description="Document type: EOB, BILL, SOB, POLICY"),
    current_user: dict = Depends(get_current_user)
):
    """
    Create a document record and return a signed upload URL.
    Mobile app should upload the file directly to the signed URL.
    """
    user_id = current_user.get("sub") or current_user.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token"
        )
    
    # Check if storage is configured
    if not storage_service.is_configured() or not db_service.is_configured():
        # Return mock response with warning
        doc_id = f"doc_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        return DocumentUploadResponse(
            doc=DocumentResponse(
                id=doc_id,
                type=doc_type,
                status="pending_upload",
                created_at=datetime.utcnow().isoformat() + "Z"
            ),
            upload=UploadInfo(
                bucket="documents",
                path=f"user/{user_id}/docs/{doc_id}/document.pdf",
                signed_url=None,
                expires_in=None
            ),
            warning="Storage not configured; returned mock response."
        )
    
    try:
        # Generate doc_id (UUID)
        import uuid
        doc_id = str(uuid.uuid4())
        
        # Create document record
        filename = f"document_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
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
        
        # Create signed upload URL
        upload_info = storage_service.create_signed_upload_url(
            user_id=user_id,
            doc_id=doc_id,
            filename=filename,
            content_type="application/pdf"
        )
        
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
        safe_log_error("Failed to create document upload", e, user_id=user_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create document upload"
        )


@router.post("/{doc_id}/analyze", response_model=DocumentAnalysisResponse)
async def analyze_document_endpoint(
    doc_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Analyze a document and extract structured data.
    Fetches the stored file, runs analysis, and persists results.
    """
    user_id = current_user.get("sub") or current_user.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token"
        )
    
    # Check if services are configured
    use_mock = not (storage_service.is_configured() and db_service.is_configured())
    
    if use_mock:
        # Return mock response with warning
        mock_doc = DocumentResponse(
            id=doc_id,
            type="EOB",
            status="analyzed",
            created_at="2026-02-06T00:00:00Z"
        )
        
        mock_extraction = Extraction(
            patient_responsibility=215.44,
            provider="Example Medical Group",
            service_date="2025-11-03",
            line_items=[
                LineItem(
                    description="Office visit",
                    cpt="99213",
                    billed=310.0,
                    allowed=180.0,
                    plan_paid=0.0,
                    you_owe=180.0,
                    network_status="in_network"
                )
            ],
            plain_english_summary="Your plan reduced the charge to an allowed amount. Because your deductible applies, you may owe the allowed amount.",
            next_steps=[
                "Confirm the provider was in-network on the date of service.",
                "Check whether the deductible was already met.",
                "If this looks wrong, request an itemized bill and compare CPT codes."
            ]
        )
        
        return DocumentAnalysisResponse(
            doc=mock_doc,
            extraction=mock_extraction,
            warning="Storage/DB not configured; returned mock response."
        )
    
    try:
        # Get document and verify ownership
        doc_record = db_service.get_document(doc_id=doc_id, user_id=user_id)
        if not doc_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        # Check if already analyzed
        existing_extraction = db_service.get_extraction(doc_id=doc_id)
        if existing_extraction:
            # Return existing extraction
            line_items_data = db_service.get_line_items(existing_extraction["id"])
            line_items = [
                LineItem(
                    description=item["description"],
                    cpt=item["cpt"],
                    billed=float(item["billed"]),
                    allowed=float(item["allowed"]),
                    plan_paid=float(item["plan_paid"]),
                    you_owe=float(item["you_owe"]),
                    network_status=item["network_status"]
                )
                for item in line_items_data
            ]
            
            return DocumentAnalysisResponse(
                doc=DocumentResponse(
                    id=doc_record["id"],
                    type=doc_record["type"],
                    status=doc_record["status"],
                    created_at=doc_record["created_at"]
                ),
                extraction=Extraction(
                    patient_responsibility=float(existing_extraction["patient_responsibility"]),
                    provider=existing_extraction["provider"],
                    service_date=existing_extraction["service_date"],
                    line_items=line_items,
                    plain_english_summary=existing_extraction["plain_english_summary"],
                    next_steps=existing_extraction["next_steps"]
                )
            )
        
        # Update status to processing
        db_service.update_document_status(doc_id=doc_id, status="processing")
        
        # Get storage path
        storage_path = doc_record.get("storage_path")
        if not storage_path:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Document storage path not found"
            )
        
        # Download file bytes
        file_bytes = storage_service.download_bytes(storage_path)
        if not file_bytes:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to download document"
            )
        
        # Analyze document (async; may use LLM for summary)
        mime_type = doc_record.get("mime_type", "application/pdf")
        extraction_result = await analyze_document(file_bytes, mime_type)
        
        # Normalize extraction
        normalized = normalize_extraction(extraction_result)
        
        # Persist extraction
        extraction_id = db_service.create_extraction(
            doc_id=doc_id,
            patient_responsibility=normalized["patient_responsibility"],
            provider=normalized["provider"],
            service_date=normalized["service_date"],
            plain_english_summary=normalized["plain_english_summary"],
            next_steps=normalized["next_steps"],
            raw_extraction=normalized["raw_extraction"]
        )
        
        if not extraction_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save extraction"
            )
        
        # Persist line items
        db_service.create_line_items(extraction_id, normalized["line_items"])
        
        # Update document status
        db_service.update_document_status(doc_id=doc_id, status="analyzed")
        
        # Build response
        line_items = [
            LineItem(**item) for item in normalized["line_items"]
        ]
        
        return DocumentAnalysisResponse(
            doc=DocumentResponse(
                id=doc_record["id"],
                type=doc_record["type"],
                status="analyzed",
                created_at=doc_record["created_at"]
            ),
            extraction=Extraction(
                patient_responsibility=normalized["patient_responsibility"],
                provider=normalized["provider"],
                service_date=normalized["service_date"],
                line_items=line_items,
                plain_english_summary=normalized["plain_english_summary"],
                next_steps=normalized["next_steps"]
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        safe_log_error("Failed to analyze document", e, doc_id=doc_id)
        # Update status to error
        if db_service.is_configured():
            db_service.update_document_status(doc_id=doc_id, status="error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze document"
        )


@router.get("/{doc_id}", response_model=DocumentAnalysisResponse)
async def get_document(
    doc_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a document and its extraction if available.
    """
    user_id = current_user.get("sub") or current_user.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token"
        )
    
    # Check if DB is configured
    if not db_service.is_configured():
        # Return mock response
        return DocumentAnalysisResponse(
            doc=DocumentResponse(
                id=doc_id,
                type="EOB",
                status="analyzed",
                created_at="2026-02-06T00:00:00Z"
            ),
            extraction=Extraction(
                patient_responsibility=215.44,
                provider="Example Medical Group",
                service_date="2025-11-03",
                line_items=[
                    LineItem(
                        description="Office visit",
                        cpt="99213",
                        billed=310.0,
                        allowed=180.0,
                        plan_paid=0.0,
                        you_owe=180.0,
                        network_status="in_network"
                    )
                ],
                plain_english_summary="Your plan reduced the charge to an allowed amount. Because your deductible applies, you may owe the allowed amount.",
                next_steps=[
                    "Confirm the provider was in-network on the date of service.",
                    "Check whether the deductible was already met.",
                    "If this looks wrong, request an itemized bill and compare CPT codes."
                ]
            ),
            warning="DB not configured; returned mock response."
        )
    
    try:
        # Get document
        doc_record = db_service.get_document(doc_id=doc_id, user_id=user_id)
        if not doc_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        # Get extraction if exists
        extraction_record = db_service.get_extraction(doc_id=doc_id)
        extraction = None
        
        if extraction_record:
            line_items_data = db_service.get_line_items(extraction_record["id"])
            line_items = [
                LineItem(
                    description=item["description"],
                    cpt=item["cpt"],
                    billed=float(item["billed"]),
                    allowed=float(item["allowed"]),
                    plan_paid=float(item["plan_paid"]),
                    you_owe=float(item["you_owe"]),
                    network_status=item["network_status"]
                )
                for item in line_items_data
            ]
            
            extraction = Extraction(
                patient_responsibility=float(extraction_record["patient_responsibility"]),
                provider=extraction_record["provider"],
                service_date=extraction_record["service_date"],
                line_items=line_items,
                plain_english_summary=extraction_record["plain_english_summary"],
                next_steps=extraction_record["next_steps"]
            )
        
        return DocumentAnalysisResponse(
            doc=DocumentResponse(
                id=doc_record["id"],
                type=doc_record["type"],
                status=doc_record["status"],
                created_at=doc_record["created_at"]
            ),
            extraction=extraction
        )
    except HTTPException:
        raise
    except Exception as e:
        safe_log_error("Failed to get document", e, doc_id=doc_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get document"
        )
