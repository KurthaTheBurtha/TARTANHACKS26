from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import get_current_user
from app.models.schemas import MeResponse

router = APIRouter()


@router.get("", response_model=MeResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Get current authenticated user information.
    """
    user_id = current_user.get("sub") or current_user.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token"
        )
    
    # Extract additional info from token
    auth_source = "supabase_jwt"
    if current_user.get("test_user"):
        auth_source = "test_override"
    
    issued_at = current_user.get("iat")
    if issued_at:
        from datetime import datetime
        issued_at_str = datetime.fromtimestamp(issued_at).isoformat() + "Z"
    else:
        issued_at_str = None
    
    return MeResponse(
        user_id=user_id,
        auth_source=auth_source,
        scopes=current_user.get("scopes", []),
        issued_at=issued_at_str
    )
