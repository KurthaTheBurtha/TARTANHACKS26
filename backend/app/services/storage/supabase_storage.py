"""
Supabase Storage service for document upload/download with signed URLs.
"""
from typing import Optional, Dict
from supabase import create_client, Client
from app.core.config import settings
from app.core.logging import safe_log_error


class SupabaseStorageService:
    """Service for managing document storage in Supabase Storage."""
    
    def __init__(self):
        self.bucket = settings.supabase_storage_bucket
        self.expires_in = settings.signed_url_expires_in
        try:
            self.client: Client = create_client(
                settings.supabase_url,
                settings.supabase_service_role_key
            )
        except Exception as e:
            safe_log_error("Failed to initialize Supabase storage client", e)
            self.client = None
    
    def is_configured(self) -> bool:
        """Check if storage is properly configured."""
        return (
            self.client is not None and
            settings.supabase_url and
            settings.supabase_service_role_key
        )
    
    def create_signed_upload_url(
        self,
        user_id: str,
        doc_id: str,
        filename: str,
        content_type: str
    ) -> Dict[str, any]:
        """
        Create a signed upload URL for a document.
        Returns: {path, signed_url, expires_in, bucket}
        """
        if not self.is_configured():
            return {
                "path": None,
                "signed_url": None,
                "expires_in": None,
                "bucket": None
            }
        
        # Construct storage path: user/{user_id}/docs/{doc_id}/{filename}
        # For policies, use /policies/ instead of /docs/
        if "policy" in filename.lower() or doc_id.startswith("policy"):
            path = f"user/{user_id}/policies/{doc_id}/{filename}"
        else:
            path = f"user/{user_id}/docs/{doc_id}/{filename}"
        
        try:
            # Create signed URL for upload
            response = self.client.storage.from_(self.bucket).create_signed_url(
                path=path,
                expires_in=self.expires_in
            )
            
            signed_url = response.get("signedURL") if isinstance(response, dict) else None
            
            return {
                "bucket": self.bucket,
                "path": path,
                "signed_url": signed_url,
                "expires_in": self.expires_in
            }
        except Exception as e:
            safe_log_error(
                "Failed to create signed upload URL",
                e,
                doc_id=doc_id,
                path=path
            )
            return {
                "path": path,
                "signed_url": None,
                "expires_in": None,
                "bucket": self.bucket
            }
    
    def create_signed_download_url(self, path: str) -> Optional[str]:
        """Create a signed download URL for a document."""
        if not self.is_configured():
            return None
        
        try:
            response = self.client.storage.from_(self.bucket).create_signed_url(
                path=path,
                expires_in=self.expires_in
            )
            return response.get("signedURL") if isinstance(response, dict) else None
        except Exception as e:
            safe_log_error("Failed to create signed download URL", e, path=path)
            return None
    
    def download_bytes(self, path: str) -> Optional[bytes]:
        """Download file bytes from storage (server-side)."""
        if not self.is_configured():
            return None
        
        try:
            response = self.client.storage.from_(self.bucket).download(path)
            if isinstance(response, bytes):
                return response
            elif hasattr(response, 'content'):
                return response.content
            return None
        except Exception as e:
            safe_log_error("Failed to download file bytes", e, path=path)
            return None


# Singleton instance
storage_service = SupabaseStorageService()
