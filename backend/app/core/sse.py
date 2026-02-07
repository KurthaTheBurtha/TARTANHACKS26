"""
Server-Sent Events (SSE) helpers for streaming responses.
"""
from typing import Dict, Any, Iterator
import json


def format_sse_event(event_type: str, data: Dict[str, Any]) -> str:
    """
    Format a single SSE event.
    Returns properly formatted SSE string with newlines.
    """
    data_json = json.dumps(data)
    return f"event: {event_type}\ndata: {data_json}\n\n"


def stream_meta_event(session_id: str, message_id: str, citations: list) -> str:
    """Format a meta event with session and citation info."""
    return format_sse_event("meta", {
        "session_id": session_id,
        "message_id": message_id,
        "citations": citations
    })


def stream_delta_event(text: str) -> str:
    """Format a delta event with incremental text."""
    return format_sse_event("delta", {"text": text})


def stream_final_event(
    text: str,
    confidence: float,
    citations: list,
    disclaimer: str
) -> str:
    """Format a final event with complete response."""
    return format_sse_event("final", {
        "text": text,
        "confidence": confidence,
        "citations": citations,
        "disclaimer": disclaimer
    })


def stream_error_event(error: str) -> str:
    """Format an error event."""
    return format_sse_event("error", {"error": error})


def chunk_text_for_streaming(text: str, chunk_size: int = 10) -> Iterator[str]:
    """
    Split text into chunks for streaming.
    For stub mode, creates deterministic chunks.
    """
    words = text.split()
    current_chunk = []
    current_length = 0
    
    for word in words:
        current_chunk.append(word)
        current_length += len(word) + 1  # +1 for space
        
        if current_length >= chunk_size:
            yield " ".join(current_chunk) + " "
            current_chunk = []
            current_length = 0
    
    # Yield remaining words
    if current_chunk:
        yield " ".join(current_chunk)
