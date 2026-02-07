"""
Text embedding service with OpenAI and deterministic fallback.
"""
from typing import List
import hashlib
import struct
from app.core.config import settings
from app.core.logging import safe_log_info, safe_log_error


def embed_text(text: str) -> List[float]:
    """
    Generate embedding for text.
    Uses OpenAI if available, otherwise deterministic hash-based embedding.
    """
    if settings.openai_api_key:
        try:
            return _embed_with_openai(text)
        except Exception as e:
            safe_log_error("OpenAI embedding failed, using fallback", e)
            return _embed_deterministic(text)
    else:
        safe_log_info("OpenAI key not configured, using deterministic embedding")
        return _embed_deterministic(text)


def _embed_with_openai(text: str) -> List[float]:
    """Generate embedding using OpenAI API."""
    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.openai_api_key)
        
        response = client.embeddings.create(
            model=settings.openai_embedding_model,
            input=text
        )
        
        return response.data[0].embedding
    except ImportError:
        safe_log_error("OpenAI library not installed")
        return _embed_deterministic(text)
    except Exception as e:
        safe_log_error("OpenAI embedding API call failed", e)
        return _embed_deterministic(text)


def _embed_deterministic(text: str, dimension: int = 256) -> List[float]:
    """
    Generate deterministic embedding using hash-based approach.
    Creates a fixed-dimension vector from text hash.
    """
    # Normalize text
    normalized = text.lower().strip()
    
    # Create hash
    hash_obj = hashlib.sha256(normalized.encode('utf-8'))
    hash_bytes = hash_obj.digest()
    
    # Convert to float vector
    vector = []
    for i in range(0, min(len(hash_bytes), dimension * 4), 4):
        # Use 4 bytes to create a float in [0, 1]
        if i + 4 <= len(hash_bytes):
            uint_val = struct.unpack('>I', hash_bytes[i:i+4])[0]
            # Normalize to [0, 1]
            float_val = (uint_val % 1000000) / 1000000.0
            vector.append(float_val)
    
    # Pad or truncate to desired dimension
    while len(vector) < dimension:
        # Use hash again with offset for padding
        offset = len(vector)
        extra_hash = hashlib.sha256(f"{normalized}{offset}".encode('utf-8')).digest()
        uint_val = struct.unpack('>I', extra_hash[:4])[0]
        vector.append((uint_val % 1000000) / 1000000.0)
    
    return vector[:dimension]


def embed_query(query: str) -> List[float]:
    """Alias for embed_text (for clarity)."""
    return embed_text(query)
