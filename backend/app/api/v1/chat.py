from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from datetime import datetime
import uuid
from app.models.schemas import (
    CreateChatSessionRequest,
    CreateChatSessionResponse,
    CreateChatMessageRequest,
    CreateChatMessageResponse,
    CreateChatStreamRequest
)
from app.core.security import get_current_user
from app.services.db.supabase_db import db_service
from app.services.chat.chat_service import chat_service
from app.core.logging import safe_log_error

router = APIRouter()


@router.post("/sessions", response_model=CreateChatSessionResponse)
async def create_chat_session(
    request: CreateChatSessionRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new chat session.
    """
    user_id = current_user.get("sub") or current_user.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token"
        )
    
    # Check if DB is configured
    if not db_service.is_configured():
        session_id = f"chat_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        return CreateChatSessionResponse(
            session_id=session_id,
            created_at=datetime.utcnow().isoformat() + "Z"
        )
    
    try:
        # Create session in database
        session_id = str(uuid.uuid4())
        result = db_service.client.table("chat_sessions").insert({
            "id": session_id,
            "user_id": user_id,
            "title": None
        }).execute()
        
        if result.data and len(result.data) > 0:
            return CreateChatSessionResponse(
                session_id=session_id,
                created_at=result.data[0]["created_at"]
            )
        else:
            return CreateChatSessionResponse(
                session_id=session_id,
                created_at=datetime.utcnow().isoformat() + "Z"
            )
    except Exception as e:
        safe_log_error("Failed to create chat session", e, user_id=user_id)
        # Fallback to simple ID generation
        session_id = f"chat_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        return CreateChatSessionResponse(
            session_id=session_id,
            created_at=datetime.utcnow().isoformat() + "Z"
        )


@router.post("/sessions/{session_id}/messages", response_model=CreateChatMessageResponse)
async def create_chat_message(
    session_id: str,
    request: CreateChatMessageRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Send a message in a chat session and get an assistant response with citations.
    Uses shared chat service for consistency with streaming endpoint.
    """
    user_id = current_user.get("sub") or current_user.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token"
        )
    
    try:
        result = await chat_service.create_message(
            session_id=session_id,
            user_id=user_id,
            content=request.content
        )
        
        from app.models.schemas import AssistantResponse, Citation
        
        return CreateChatMessageResponse(
            message_id=result["message_id"],
            session_id=result["session_id"],
            assistant=AssistantResponse(
                text=result["assistant"]["text"],
                citations=[Citation(**c) for c in result["assistant"]["citations"]],
                confidence=result["assistant"]["confidence"],
                disclaimer=result["assistant"]["disclaimer"]
            )
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        safe_log_error("Failed to create chat message", e, session_id=session_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process chat message"
        )


@router.post("/sessions/{session_id}/messages/stream")
async def create_chat_message_stream(
    session_id: str,
    request: CreateChatStreamRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Send a message and stream assistant response using Server-Sent Events (SSE).
    Returns text/event-stream with meta, delta, and final events.
    """
    user_id = current_user.get("sub") or current_user.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token"
        )
    
    async def generate_stream():
        """Async generator that yields SSE events."""
        try:
            async for event in chat_service.stream_message(
                session_id=session_id,
                user_id=user_id,
                content=request.text,
                policy_doc_id=request.policy_doc_id
            ):
                yield event
        except Exception as e:
            safe_log_error("Streaming error", e, session_id=session_id)
            from app.core.sse import stream_error_event
            yield stream_error_event("Streaming failed")
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
