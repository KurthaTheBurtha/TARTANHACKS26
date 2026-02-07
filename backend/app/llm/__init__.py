"""Provider-agnostic LLM client (OpenAI, Gemini)."""
from app.llm.client import (
    LLMProvider,
    generate_text,
    generate_text_stream,
    summarize_document,
)

__all__ = [
    "LLMProvider",
    "generate_text",
    "generate_text_stream",
    "summarize_document",
]
