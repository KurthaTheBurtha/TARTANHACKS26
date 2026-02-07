"""
PDF text extraction service with fallback handling.
"""
from typing import Optional
import io
from app.core.logging import safe_log_error, safe_log_info


def extract_text_from_pdf(file_bytes: bytes) -> Optional[str]:
    """
    Extract text from PDF bytes.
    Returns extracted text or None if extraction fails.
    """
    try:
        # Try pdfplumber first (better for tables)
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                text_parts = []
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)
                if text_parts:
                    return "\n\n".join(text_parts)
        except ImportError:
            # Fallback to pypdf
            try:
                from pypdf import PdfReader
                reader = PdfReader(io.BytesIO(file_bytes))
                text_parts = []
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)
                if text_parts:
                    return "\n\n".join(text_parts)
            except ImportError:
                safe_log_error("No PDF library available (pdfplumber or pypdf)")
                return None
    except Exception as e:
        safe_log_error("Failed to extract text from PDF", e)
        return None
    
    return None


def is_valid_extraction(text: Optional[str], min_length: int = 100) -> bool:
    """Check if extracted text is valid (not too short)."""
    if not text:
        return False
    return len(text.strip()) >= min_length
