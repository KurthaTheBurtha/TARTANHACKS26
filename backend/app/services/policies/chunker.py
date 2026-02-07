"""
Text chunking utility for policy documents.
"""
from typing import List


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 150) -> List[dict]:
    """
    Split text into overlapping chunks.
    Returns list of dicts with 'text' and 'chunk_index'.
    """
    if not text or len(text) < chunk_size:
        return [{"text": text, "chunk_index": 0}]
    
    chunks = []
    start = 0
    chunk_index = 0
    
    while start < len(text):
        end = start + chunk_size
        
        # Try to break at sentence boundary
        if end < len(text):
            # Look for sentence endings
            for break_char in ['. ', '.\n', '! ', '!\n', '? ', '?\n']:
                last_break = text.rfind(break_char, start, end)
                if last_break != -1:
                    end = last_break + 2
                    break
        
        chunk_text = text[start:end].strip()
        if chunk_text:
            chunks.append({
                "text": chunk_text,
                "chunk_index": chunk_index
            })
            chunk_index += 1
        
        # Move start with overlap
        start = end - overlap
        if start >= len(text):
            break
    
    return chunks
