import logging
from typing import Any, Dict, Optional
import httpx
import jwt
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.user import Profile

logger = logging.getLogger(__name__)
settings = get_settings()


class AuthService:
    def __init__(self):
        self.settings = get_settings()

    async def verify_token(self, token: str) -> Dict[str, Any]:
        """
        Validates Supabase-issued JWT token server-side.
        Attempts local secret verification first; falls back to Supabase auth verification endpoint.
        """
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token is missing",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # 1. Test Mode Support (for fast automated test suites)
        if self.settings.ENVIRONMENT == "test" or getattr(self.settings, "TEST_MODE", False):
            try:
                # In test mode, support decoding with a standard test secret or unverified claims if test payload
                secret = self.settings.SUPABASE_JWT_SECRET or "test-secret-key-at-least-32-chars-long"
                payload = jwt.decode(
                    token,
                    secret,
                    algorithms=["HS256"],
                    options={"verify_aud": False},
                )
                return payload
            except jwt.PyJWTError:
                # If test secret fails, attempt unverified decode for mock payloads in unit tests
                try:
                    payload = jwt.decode(token, options={"verify_signature": False})
                    if "sub" in payload:
                        return payload
                except Exception:
                    pass

        # 2. Local JWT Secret Verification (if SUPABASE_JWT_SECRET is configured)
        if self.settings.SUPABASE_JWT_SECRET and self.settings.SUPABASE_JWT_SECRET != "your-supabase-jwt-secret":
            try:
                payload = jwt.decode(
                    token,
                    self.settings.SUPABASE_JWT_SECRET,
                    algorithms=["HS256"],
                    options={"verify_aud": False},  # Supabase aud can be 'authenticated'
                )
                return payload
            except jwt.ExpiredSignatureError:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token has expired. Please sign in again.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            except jwt.InvalidTokenError as e:
                logger.warning(f"Local JWT verification failed: {e}")
                # Fall through to Supabase auth API verification if available

        # 3. Supabase Auth API Endpoint Verification
        if self.settings.is_supabase_configured and self.settings.SUPABASE_URL != "https://your-project-id.supabase.co":
            try:
                headers = {
                    "Authorization": f"Bearer {token}",
                    "apikey": self.settings.SUPABASE_ANON_KEY or self.settings.SUPABASE_SERVICE_ROLE_KEY,
                }
                async with httpx.AsyncClient(timeout=5.0) as client:
                    resp = await client.get(f"{self.settings.SUPABASE_URL}/auth/v1/user", headers=headers)
                    if resp.status_code == 200:
                        user_data = resp.json()
                        return {
                            "sub": user_data.get("id"),
                            "email": user_data.get("email"),
                            "user_metadata": user_data.get("user_metadata", {}),
                            "app_metadata": user_data.get("app_metadata", {}),
                        }
                    else:
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Invalid or revoked authentication token",
                            headers={"WWW-Authenticate": "Bearer"},
                        )
            except httpx.RequestError as e:
                logger.error(f"Failed to communicate with Supabase Auth: {e}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Authentication service temporarily unavailable",
                )

        # 4. Fallback for Local Development Mode (unconfigured demo environment)
        if self.settings.ENVIRONMENT == "development":
            try:
                # In development mode without remote Supabase connected, accept token if valid JWT structure
                payload = jwt.decode(token, options={"verify_signature": False})
                if "sub" in payload:
                    return payload
            except Exception:
                pass

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    async def get_or_create_profile(
        self,
        db: AsyncSession,
        user_id: str,
        email: str,
        full_name: Optional[str] = None,
    ) -> Profile:
        """
        Retrieves the profile for the given user ID. If not found in the database,
        creates one (simulating the database trigger for environments where triggers haven't fired).
        """
        result = await db.execute(select(Profile).where(Profile.id == user_id))
        profile = result.scalar_one_or_none()

        if not profile:
            profile = Profile(
                id=user_id,
                email=email,
                full_name=full_name or email.split("@")[0],
                is_platform_admin=False,
            )
            db.add(profile)
            await db.commit()
            await db.refresh(profile)

        return profile


auth_service = AuthService()
