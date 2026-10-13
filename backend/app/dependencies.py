import logging
from typing import Annotated, Optional
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import Profile
from app.services.auth_service import auth_service

logger = logging.getLogger(__name__)

# HTTPBearer extracts "Bearer <token>" header
bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Security(bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Profile:
    """
    Validates the Supabase Bearer token and returns the authenticated Profile.
    Rejects missing or invalid tokens with HTTP 401 Unauthorized.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = await auth_service.verify_token(token)

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload: missing subject identifier",
            headers={"WWW-Authenticate": "Bearer"},
        )

    email = payload.get("email") or f"{user_id}@placeholder.app"
    user_metadata = payload.get("user_metadata", {})
    full_name = user_metadata.get("full_name") or user_metadata.get("name")

    profile = await auth_service.get_or_create_profile(
        db=db,
        user_id=user_id,
        email=email,
        full_name=full_name,
    )

    return profile


async def require_platform_admin(
    current_user: Annotated[Profile, Depends(get_current_user)],
) -> Profile:
    """Requires caller to be a global platform admin."""
    if not current_user.is_platform_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform administrator privileges required",
        )
    return current_user
