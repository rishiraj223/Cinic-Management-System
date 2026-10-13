import logging
from typing import Any, Dict, Optional
import httpx
import jwt
from fastapi import HTTPException, status
from sqlalchemy import select, update
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
                secret = self.settings.SUPABASE_JWT_SECRET or "test-secret-key-at-least-32-chars-long"
                payload = jwt.decode(
                    token,
                    secret,
                    algorithms=["HS256"],
                    options={"verify_aud": False},
                )
                return payload
            except jwt.PyJWTError:
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
                    options={"verify_aud": False},
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
        Retrieves the profile for the given user ID.
        If a profile with this ID is not found, checks if an invited placeholder profile
        was created for this email address and links it to this authenticated user ID.
        """
        normalized_email = email.strip().lower()
        result = await db.execute(select(Profile).where(Profile.id == user_id))
        profile = result.scalar_one_or_none()

        if profile:
            return profile

        # Check if an invited placeholder profile exists for this email
        res_email = await db.execute(select(Profile).where(Profile.email == normalized_email))
        placeholder = res_email.scalar_one_or_none()

        if placeholder:
            old_id = placeholder.id
            placeholder.id = user_id
            if full_name:
                placeholder.full_name = full_name

            # Relink memberships & doctor profiles from old placeholder ID to the real auth user ID
            from app.models.organization import OrganizationMember
            from app.models.provider import DoctorProfile

            await db.execute(
                update(OrganizationMember)
                .where(OrganizationMember.user_id == old_id)
                .values(user_id=user_id)
            )
            await db.execute(
                update(DoctorProfile)
                .where(DoctorProfile.user_id == old_id)
                .values(user_id=user_id)
            )
            await db.commit()
            await db.refresh(placeholder)
            return placeholder

        # If no profile or placeholder exists, create a new one
        profile = Profile(
            id=user_id,
            email=normalized_email,
            full_name=full_name or normalized_email.split("@")[0].title(),
            is_platform_admin=False,
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)

        return profile


auth_service = AuthService()
