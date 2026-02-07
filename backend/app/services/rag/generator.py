"""
RAG response generator with LLM or stub fallback.
Uses shared LLM client (OpenAI/Gemini) when configured.
"""
from typing import List, AsyncIterator, Optional
from app.services.rag.retriever import ChunkResult
from app.core.config import settings
from app.core.logging import safe_log_info, safe_log_error
from app.llm import LLMProvider, generate_text, generate_text_stream


class GeneratedResponse:
    """Generated assistant response with citations."""
    def __init__(
        self,
        text: str,
        citations: List[dict],
        confidence: float,
        disclaimer: str
    ):
        self.text = text
        self.citations = citations
        self.confidence = confidence
        self.disclaimer = disclaimer


async def generate_response(
    query: str,
    retrieved_chunks: List[ChunkResult],
    provider: Optional[LLMProvider] = None,
    user_notes: Optional[List[dict]] = None,
) -> GeneratedResponse:
    """
    Generate assistant response from query and retrieved chunks.
    Uses shared LLM client (OpenAI or Gemini per LLM_PROVIDER) if key is set; uses LLM even when no chunks (general Q&A).
    """
    has_llm = (
        (settings.openai_api_key and settings.openai_api_key.strip())
        or (settings.gemini_api_key and settings.gemini_api_key.strip())
    )
    if has_llm:
        try:
            return await _generate_with_llm(query, retrieved_chunks, provider=provider, user_notes=user_notes)
        except Exception as e:
            safe_log_error("LLM generation failed, using stub", e)
            return _generate_stub(query, retrieved_chunks)
    else:
        safe_log_info("No LLM key configured, using stub response")
        return _generate_stub(query, retrieved_chunks)


def _format_notes_for_prompt(notes: Optional[List[dict]]) -> str:
    """Format user notes for inclusion in prompt."""
    if not notes or len(notes) == 0:
        return ""
    parts = []
    for i, n in enumerate(notes[:10], 1):
        subj = n.get("subject") or "Note"
        desc = n.get("description") or ""
        created = n.get("createdAt", "")[:10] if n.get("createdAt") else ""
        if desc:
            parts.append(f"[Note {i}] {subj} ({created}): {desc[:300]}")
        else:
            parts.append(f"[Note {i}] {subj} ({created})")
    return "\n".join(parts)


async def _generate_with_llm(
    query: str,
    chunks: List[ChunkResult],
    provider: Optional[LLMProvider] = None,
    user_notes: Optional[List[dict]] = None,
) -> GeneratedResponse:
    """Generate response using shared LLM client (OpenAI or Gemini)."""
    notes_context = _format_notes_for_prompt(user_notes)
    if chunks:
        context = "\n\n".join([
            f"[Chunk {i+1}]: {chunk.text[:500]}"
            for i, chunk in enumerate(chunks[:3])
        ])
        system = "You are a helpful health insurance assistant. Always cite your sources."
        prompt_parts = [f"User question: {query}\n\nRelevant policy excerpts:\n{context}"]
        if notes_context:
            prompt_parts.append(f"\n\nUser's saved notes (reference when relevant):\n{notes_context}")
        prompt_parts.append(
            "\n\nProvide a clear, concise answer based on the policy excerpts above. If the excerpts don't contain relevant information, say so. Always cite which excerpt you're referencing.\nKeep your response under 200 words."
        )
        prompt = "".join(prompt_parts)
    else:
        system = (
            "You are a helpful health insurance assistant. Answer questions about deductibles, "
            "coverage, medical bills, finding providers, and general health insurance topics. "
            "Be concise and practical. Add a brief disclaimer that you're not a lawyer or insurer. "
            "When the user shares symptoms, health concerns, or medical information they might want "
            "to track, offer to save it as a note by ending your response with exactly: "
            "Would you like me to save this as a note on your dashboard?"
        )
        prompt_parts = [f"User question: {query}"]
        if notes_context:
            prompt_parts.append(
                f"\nThe user has saved the following notes (refer to these when relevant):\n{notes_context}\n"
            )
        prompt_parts.append(
            "\nProvide a helpful, concise answer (under 150 words). If you don't know something specific, say so and suggest they check their plan documents or contact their insurer.\n"
            "If the user is sharing symptoms or health concerns, end your response by asking: Would you like me to save this as a note on your dashboard?"
        )
        prompt = "".join(prompt_parts)
    text = await generate_text(
        prompt=prompt,
        system=system,
        provider=provider,
        model=None,
        temperature=0.3,
    )
    citations = [
        {
            "doc_id": chunk.doc_id,
            "chunk_id": chunk.chunk_id,
            "label": chunk.metadata.get("label", f"Policy excerpt {i+1}"),
        }
        for i, chunk in enumerate(chunks[:3])
    ] if chunks else []
    return GeneratedResponse(
        text=text,
        citations=citations,
        confidence=0.75,
        disclaimer="I'm not a lawyer or your insurer; verify with your plan documents or insurer.",
    )


def _generate_stub(query: str, chunks: List[ChunkResult]) -> GeneratedResponse:
    """Generate stub response when LLM not available."""
    if not chunks:
        text = "I don't have access to your policy documents yet. Please upload your Summary of Benefits or policy document first."
        citations = []
        confidence = 0.3
    else:
        # Use first chunk to generate a simple response
        first_chunk = chunks[0]
        text = f"Based on your plan summary, {first_chunk.text[:200]}... For more details, please refer to your full policy document."
        citations = [
            {
                "doc_id": first_chunk.doc_id,
                "chunk_id": first_chunk.chunk_id,
                "label": first_chunk.metadata.get("label", "Policy excerpt")
            }
        ]
        confidence = 0.65
    
    return GeneratedResponse(
        text=text,
        citations=citations,
        confidence=confidence,
        disclaimer="I'm not a lawyer or your insurer; verify with your plan documents or insurer."
    )


async def _generate_with_llm_stream(
    query: str,
    chunks: List[ChunkResult],
    provider: Optional[LLMProvider] = None,
) -> AsyncIterator[str]:
    """Generate streaming response using shared LLM client (OpenAI or Gemini)."""
    try:
        context = "\n\n".join([
            f"[Chunk {i+1}]: {chunk.text[:500]}"
            for i, chunk in enumerate(chunks[:3])
        ])
        system = "You are a helpful health insurance assistant. Always cite your sources."
        prompt = f"""User question: {query}

Relevant policy excerpts:
{context}

Provide a clear, concise answer based on the policy excerpts above. If the excerpts don't contain relevant information, say so. Always cite which excerpt you're referencing.

Keep your response under 200 words."""
        async for token in generate_text_stream(
            prompt=prompt,
            system=system,
            provider=provider,
            model=None,
            temperature=0.3,
        ):
            yield token
    except Exception as e:
        safe_log_error("LLM streaming failed", e)
        stub = _generate_stub(query, chunks)
        for word in stub.text.split():
            yield word + " "
