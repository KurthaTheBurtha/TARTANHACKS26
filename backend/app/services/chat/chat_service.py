"""
Chat service orchestrating message persistence, retrieval, and generation.
"""
from typing import Dict, Any, Optional, Iterator, AsyncIterator
import uuid
from datetime import datetime
from app.services.db.supabase_db import db_service
from app.services.rag.retriever import search_chunks
from app.core.config import settings
from app.services.rag.generator import generate_response, GeneratedResponse, _generate_stub
from app.core.logging import safe_log_info, safe_log_error


class ChatService:
    """Service for chat operations."""
    
    async def create_message(
        self,
        session_id: str,
        user_id: str,
        content: str,
        policy_doc_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a chat message and generate response.
        Returns complete response (non-streaming). Uses shared LLM client (OpenAI/Gemini).
        """
        if not db_service.is_configured():
            # Return mock response
            return self._get_mock_response(session_id)
        
        try:
            # Verify session ownership
            session = db_service.client.table("chat_sessions").select("*").eq("id", session_id).eq("user_id", user_id).execute()
            if not session.data or len(session.data) == 0:
                raise ValueError("Chat session not found")
            
            # Generate message IDs
            user_message_id = str(uuid.uuid4())
            assistant_message_id = str(uuid.uuid4())
            
            # Persist user message
            try:
                db_service.client.table("chat_messages").insert({
                    "id": user_message_id,
                    "session_id": session_id,
                    "role": "user",
                    "content": content
                }).execute()
            except Exception as e:
                safe_log_error("Failed to persist user message", e, session_id=session_id)
            
            # Retrieve relevant chunks
            safe_log_info("Retrieving policy chunks", session_id=session_id)
            retrieved_chunks = search_chunks(
                query=content,
                user_id=user_id,
                top_k=5,
                doc_id=policy_doc_id
            )
            
            # Generate response (async; uses LLM client)
            safe_log_info("Generating assistant response", session_id=session_id, chunks_count=len(retrieved_chunks))
            generated = await generate_response(content, retrieved_chunks)
            
            # Convert citations
            citations = [
                {
                    "doc_id": c["doc_id"],
                    "chunk_id": c["chunk_id"],
                    "label": c.get("label", "Policy excerpt")
                }
                for c in generated.citations
            ]
            
            # Persist assistant message
            try:
                db_service.client.table("chat_messages").insert({
                    "id": assistant_message_id,
                    "session_id": session_id,
                    "role": "assistant",
                    "content": generated.text,
                    "assistant_response": {
                        "citations": generated.citations,
                        "confidence": generated.confidence,
                        "disclaimer": generated.disclaimer
                    }
                }).execute()
            except Exception as e:
                safe_log_error("Failed to persist assistant message", e, session_id=session_id)
            
            return {
                "session_id": session_id,
                "message_id": assistant_message_id,
                "assistant": {
                    "text": generated.text,
                    "citations": citations,
                    "confidence": generated.confidence,
                    "disclaimer": generated.disclaimer
                }
            }
        except Exception as e:
            safe_log_error("Failed to create chat message", e, session_id=session_id)
            return self._get_mock_response(session_id)
    
    async def stream_message(
        self,
        session_id: str,
        user_id: str,
        content: str,
        policy_doc_id: Optional[str] = None
    ) -> AsyncIterator[str]:
        """
        Create a chat message and stream response.
        Yields SSE events.
        """
        from app.core.sse import (
            stream_meta_event, stream_delta_event, stream_final_event,
            stream_error_event, chunk_text_for_streaming
        )
        from app.services.rag.generator import _generate_with_llm_stream, _generate_stub
        
        if not db_service.is_configured():
            # Stream mock response (sync generator → yield each in async)
            for event in self._stream_mock_response(session_id):
                yield event
            return
        
        user_message_id = None
        assistant_message_id = str(uuid.uuid4())
        citations = []
        
        try:
            # Verify session ownership
            session = db_service.client.table("chat_sessions").select("*").eq("id", session_id).eq("user_id", user_id).execute()
            if not session.data or len(session.data) == 0:
                yield stream_error_event("Chat session not found")
                return
            
            # Generate user message ID
            user_message_id = str(uuid.uuid4())
            
            # Persist user message immediately
            try:
                db_service.client.table("chat_messages").insert({
                    "id": user_message_id,
                    "session_id": session_id,
                    "role": "user",
                    "content": content
                }).execute()
            except Exception as e:
                safe_log_error("Failed to persist user message", e, session_id=session_id)
            
            # Retrieve relevant chunks
            safe_log_info("Retrieving policy chunks", session_id=session_id)
            retrieved_chunks = search_chunks(
                query=content,
                user_id=user_id,
                top_k=5,
                doc_id=policy_doc_id
            )
            
            # Build citations early (for meta event)
            citations = [
                {
                    "doc_id": chunk.doc_id,
                    "chunk_id": chunk.chunk_id,
                    "label": chunk.metadata.get("label", "Policy excerpt")
                }
                for chunk in retrieved_chunks[:3]
            ]
            
            # Send meta event
            yield stream_meta_event(session_id, assistant_message_id, citations)
            
            # Generate and stream response (shared LLM client: OpenAI or Gemini)
            from app.services.rag.generator import _generate_with_llm_stream
            has_llm = (
                (settings.openai_api_key and settings.openai_api_key.strip())
                or (settings.gemini_api_key and settings.gemini_api_key.strip())
            )
            if has_llm and retrieved_chunks:
                # Stream from LLM
                try:
                    full_text = ""
                    async for chunk in _generate_with_llm_stream(content, retrieved_chunks):
                        if chunk:
                            full_text += chunk
                            yield stream_delta_event(chunk)
                    
                    # Get final response metadata (reuse stub shape for citations/disclaimer)
                    final_response = _generate_stub(content, retrieved_chunks)
                    yield stream_final_event(
                        full_text,
                        final_response.confidence,
                        citations,
                        final_response.disclaimer
                    )
                    
                    # Persist assistant message
                    try:
                        db_service.client.table("chat_messages").insert({
                            "id": assistant_message_id,
                            "session_id": session_id,
                            "role": "assistant",
                            "content": full_text,
                            "assistant_response": {
                                "citations": citations,
                                "confidence": final_response.confidence,
                                "disclaimer": final_response.disclaimer
                            }
                        }).execute()
                    except Exception as e:
                        safe_log_error("Failed to persist assistant message", e, session_id=session_id)
                except Exception as e:
                    safe_log_error("LLM streaming failed, falling back to stub", e)
                    for event in self._stream_stub_response(content, retrieved_chunks, session_id, assistant_message_id, citations):
                        yield event
            else:
                # Stream stub response (sync generator → yield each in async)
                for event in self._stream_stub_response(content, retrieved_chunks, session_id, assistant_message_id, citations):
                    yield event
        
        except Exception as e:
            safe_log_error("Failed to stream chat message", e, session_id=session_id)
            yield stream_error_event("Failed to process message")
    
    def _stream_stub_response(
        self,
        content: str,
        retrieved_chunks: list,
        session_id: str,
        message_id: str,
        citations: list
    ) -> Iterator[str]:
        """Stream a stub response in chunks."""
        from app.core.sse import stream_delta_event, stream_final_event, chunk_text_for_streaming
        from app.services.rag.generator import _generate_stub
        
        # Generate stub response
        stub_response = _generate_stub(content, retrieved_chunks)
        
        # Stream text in chunks
        for chunk in chunk_text_for_streaming(stub_response.text, chunk_size=15):
            yield stream_delta_event(chunk)
        
        # Send final event
        yield stream_final_event(
            stub_response.text,
            stub_response.confidence,
            citations,
            stub_response.disclaimer
        )
        
        # Persist assistant message
        if db_service.is_configured():
            try:
                db_service.client.table("chat_messages").insert({
                    "id": message_id,
                    "session_id": session_id,
                    "role": "assistant",
                    "content": stub_response.text,
                    "assistant_response": {
                        "citations": citations,
                        "confidence": stub_response.confidence,
                        "disclaimer": stub_response.disclaimer
                    }
                }).execute()
            except Exception as e:
                safe_log_error("Failed to persist assistant message", e, session_id=session_id)
    
    def _get_mock_response(self, session_id: str) -> Dict[str, Any]:
        """Get mock response for non-streaming."""
        return {
            "session_id": session_id,
            "message_id": "msg_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "assistant": {
                "text": "Based on your plan summary, in-network office visits apply to the deductible first. If your deductible is not met, you may owe the allowed amount.",
                "citations": [
                    {
                        "doc_id": "policy_001",
                        "chunk_id": "chunk_12",
                        "label": "Summary of Benefits — Deductible section"
                    }
                ],
                "confidence": 0.72,
                "disclaimer": "I'm not a lawyer or your insurer; verify with your plan documents or insurer."
            }
        }
    
    def _stream_mock_response(self, session_id: str) -> Iterator[str]:
        """Stream mock response."""
        from app.core.sse import stream_meta_event, stream_delta_event, stream_final_event, chunk_text_for_streaming
        from datetime import datetime
        
        message_id = f"msg_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        citations = [
            {
                "doc_id": "policy_001",
                "chunk_id": "chunk_12",
                "label": "Summary of Benefits — Deductible section"
            }
        ]
        text = "Based on your plan summary, in-network office visits apply to the deductible first. If your deductible is not met, you may owe the allowed amount."
        
        yield stream_meta_event(session_id, message_id, citations)
        
        for chunk in chunk_text_for_streaming(text, chunk_size=15):
            yield stream_delta_event(chunk)
        
        yield stream_final_event(text, 0.72, citations, "I'm not a lawyer or your insurer; verify with your plan documents or insurer.")


# Singleton instance
chat_service = ChatService()
