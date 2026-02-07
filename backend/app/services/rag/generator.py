"""
RAG response generator with LLM or stub fallback.
"""
from typing import List, AsyncIterator
from app.services.rag.retriever import ChunkResult
from app.core.config import settings
from app.core.logging import safe_log_info, safe_log_error


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


def generate_response(
    query: str,
    retrieved_chunks: List[ChunkResult]
) -> GeneratedResponse:
    """
    Generate assistant response from query and retrieved chunks.
    Uses LLM if available, otherwise returns stub response.
    """
    if settings.openai_api_key and retrieved_chunks:
        try:
            return _generate_with_llm(query, retrieved_chunks)
        except Exception as e:
            safe_log_error("LLM generation failed, using stub", e)
            return _generate_stub(query, retrieved_chunks)
    else:
        safe_log_info("OpenAI key not configured or no chunks, using stub response")
        return _generate_stub(query, retrieved_chunks)


def _generate_with_llm(query: str, chunks: List[ChunkResult]) -> GeneratedResponse:
    """Generate response using OpenAI LLM."""
    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.openai_api_key)
        
        # Build context from chunks
        context = "\n\n".join([
            f"[Chunk {i+1}]: {chunk.text[:500]}"
            for i, chunk in enumerate(chunks[:3])  # Use top 3 chunks
        ])
        
        prompt = f"""You are a helpful assistant that explains health insurance benefits based on policy documents.

User question: {query}

Relevant policy excerpts:
{context}

Provide a clear, concise answer based on the policy excerpts above. If the excerpts don't contain relevant information, say so. Always cite which excerpt you're referencing.

Keep your response under 200 words."""

        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Use cheaper model for MVP
            messages=[
                {"role": "system", "content": "You are a helpful health insurance assistant. Always cite your sources."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=300,
            temperature=0.3
        )
        
        text = response.choices[0].message.content
        
        # Build citations
        citations = [
            {
                "doc_id": chunk.doc_id,
                "chunk_id": chunk.chunk_id,
                "label": chunk.metadata.get("label", f"Policy excerpt {i+1}")
            }
            for i, chunk in enumerate(chunks[:3])
        ]
        
        return GeneratedResponse(
            text=text,
            citations=citations,
            confidence=0.75,  # LLM responses get higher confidence
            disclaimer="I'm not a lawyer or your insurer; verify with your plan documents or insurer."
        )
    except ImportError:
        safe_log_error("OpenAI library not installed")
        return _generate_stub(query, chunks)
    except Exception as e:
        safe_log_error("LLM API call failed", e)
        return _generate_stub(query, chunks)


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


async def _generate_with_llm_stream(query: str, chunks: List[ChunkResult]) -> AsyncIterator[str]:
    """Generate streaming response using OpenAI LLM."""
    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.openai_api_key)
        
        # Build context from chunks
        context = "\n\n".join([
            f"[Chunk {i+1}]: {chunk.text[:500]}"
            for i, chunk in enumerate(chunks[:3])  # Use top 3 chunks
        ])
        
        prompt = f"""You are a helpful assistant that explains health insurance benefits based on policy documents.

User question: {query}

Relevant policy excerpts:
{context}

Provide a clear, concise answer based on the policy excerpts above. If the excerpts don't contain relevant information, say so. Always cite which excerpt you're referencing.

Keep your response under 200 words."""

        stream = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful health insurance assistant. Always cite your sources."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=300,
            temperature=0.3,
            stream=True
        )
        
        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
    except ImportError:
        safe_log_error("OpenAI library not installed")
        # Fallback: yield stub text in chunks
        stub = _generate_stub(query, chunks)
        for word in stub.text.split():
            yield word + " "
    except Exception as e:
        safe_log_error("LLM streaming failed", e)
        # Fallback: yield stub text in chunks
        stub = _generate_stub(query, chunks)
        for word in stub.text.split():
            yield word + " "
