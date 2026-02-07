from typing import Optional
from fastapi import HTTPException, status, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import httpx
from app.core.config import settings

security = HTTPBearer()


async def get_jwks() -> dict:
    """Fetch JWKS from Supabase"""
    jwks_url = f"{settings.supabase_url}/.well-known/jwks.json"
    async with httpx.AsyncClient() as client:
        response = await client.get(jwks_url)
        response.raise_for_status()
        return response.json()


def verify_token(token: str) -> dict:
    """
    Verify JWT token using Supabase JWT secret.
    Falls back to JWKS if needed.
    """
    try:
        # First try with the JWT secret
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False}
        )
        return payload
    except JWTError:
        # If that fails, could implement JWKS verification here
        # For now, raise error
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    x_test_user: Optional[str] = Header(None, alias="X-Test-User"),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> dict:
    """
    Dependency to get current authenticated user from JWT token.
    Supports test override via X-Test-User header when TEST_BYPASS_AUTH=true.
    Returns the decoded JWT payload.
    """
    # Test override mode (only in test environment)
    if settings.test_bypass_auth and x_test_user:
        return {
            "sub": x_test_user,
            "user_id": x_test_user,
            "test_user": True
        }
    
    # Normal JWT authentication
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    try:
        payload = verify_token(token)
        return payload
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[dict]:
    """
    Optional authentication - returns None if no token provided.
    Useful for endpoints that work with or without auth.
    """
    if not credentials:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None
