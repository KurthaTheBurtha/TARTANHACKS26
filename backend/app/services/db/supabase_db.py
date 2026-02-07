"""
Database service for interacting with Supabase Postgres.
"""
from typing import Optional, Dict, Any, List
from uuid import UUID
from supabase import create_client, Client
from app.core.config import settings
from app.core.logging import safe_log_error


class SupabaseDBService:
    """Service for database operations."""
    
    def __init__(self):
        try:
            self.client: Client = create_client(
                settings.supabase_url,
                settings.supabase_service_role_key
            )
        except Exception as e:
            safe_log_error("Failed to initialize Supabase DB client", e)
            self.client = None
    
    def is_configured(self) -> bool:
        """Check if DB is properly configured."""
        return self.client is not None
    
    def create_document(
        self,
        user_id: str,
        doc_type: str,
        storage_path: Optional[str] = None,
        file_name: Optional[str] = None,
        file_size: Optional[int] = None,
        mime_type: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Create a new document record."""
        if not self.is_configured():
            return None
        
        try:
            result = self.client.table("documents").insert({
                "user_id": user_id,
                "type": doc_type,
                "status": "pending_upload",
                "storage_path": storage_path,
                "file_name": file_name,
                "file_size": file_size,
                "mime_type": mime_type
            }).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
        except Exception as e:
            safe_log_error("Failed to create document", e, user_id=user_id, doc_type=doc_type)
            return None
    
    def get_document(self, doc_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get a document by ID, verifying ownership."""
        if not self.is_configured():
            return None
        
        try:
            result = self.client.table("documents").select("*").eq("id", doc_id).eq("user_id", user_id).execute()
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
        except Exception as e:
            safe_log_error("Failed to get document", e, doc_id=doc_id)
            return None
    
    def update_document_status(self, doc_id: str, status: str, storage_path: Optional[str] = None) -> bool:
        """Update document status and optionally storage path."""
        if not self.is_configured():
            return False
        
        try:
            update_data = {"status": status}
            if storage_path:
                update_data["storage_path"] = storage_path
            
            self.client.table("documents").update(update_data).eq("id", doc_id).execute()
            return True
        except Exception as e:
            safe_log_error("Failed to update document status", e, doc_id=doc_id)
            return False
    
    def create_extraction(
        self,
        doc_id: str,
        patient_responsibility: float,
        provider: str,
        service_date: str,
        plain_english_summary: str,
        next_steps: List[str],
        raw_extraction: Dict[str, Any]
    ) -> Optional[str]:
        """Create a document extraction record. Returns extraction ID."""
        if not self.is_configured():
            return None
        
        try:
            result = self.client.table("doc_extractions").insert({
                "doc_id": doc_id,
                "patient_responsibility": patient_responsibility,
                "provider": provider,
                "service_date": service_date,
                "plain_english_summary": plain_english_summary,
                "next_steps": next_steps,
                "raw_extraction": raw_extraction
            }).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]["id"]
            return None
        except Exception as e:
            safe_log_error("Failed to create extraction", e, doc_id=doc_id)
            return None
    
    def create_line_items(self, extraction_id: str, line_items: List[Dict[str, Any]]) -> bool:
        """Create line items for an extraction."""
        if not self.is_configured():
            return False
        
        if not line_items:
            return True
        
        try:
            items_to_insert = []
            for idx, item in enumerate(line_items):
                items_to_insert.append({
                    "extraction_id": extraction_id,
                    "description": item.get("description"),
                    "cpt": item.get("cpt"),
                    "billed": item.get("billed"),
                    "allowed": item.get("allowed"),
                    "plan_paid": item.get("plan_paid"),
                    "you_owe": item.get("you_owe"),
                    "network_status": item.get("network_status"),
                    "line_number": idx + 1
                })
            
            self.client.table("line_items").insert(items_to_insert).execute()
            return True
        except Exception as e:
            safe_log_error("Failed to create line items", e, extraction_id=extraction_id)
            return False
    
    def get_extraction(self, doc_id: str) -> Optional[Dict[str, Any]]:
        """Get extraction for a document."""
        if not self.is_configured():
            return None
        
        try:
            result = self.client.table("doc_extractions").select("*").eq("doc_id", doc_id).execute()
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
        except Exception as e:
            safe_log_error("Failed to get extraction", e, doc_id=doc_id)
            return None
    
    def get_line_items(self, extraction_id: str) -> List[Dict[str, Any]]:
        """Get line items for an extraction."""
        if not self.is_configured():
            return []
        
        try:
            result = self.client.table("line_items").select("*").eq("extraction_id", extraction_id).order("line_number").execute()
            return result.data if result.data else []
        except Exception as e:
            safe_log_error("Failed to get line items", e, extraction_id=extraction_id)
            return []


# Singleton instance
db_service = SupabaseDBService()
