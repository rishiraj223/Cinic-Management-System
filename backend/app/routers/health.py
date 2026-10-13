from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import APIRouter, Depends, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db

router = APIRouter(tags=["Health"])
settings = get_settings()


@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """
    Health check endpoint returning system status, environment, and database connectivity.
    """
    db_status = "healthy"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "healthy" if "unhealthy" not in db_status else "degraded",
        "service": "Healthcare Management SaaS API",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "supabase_configured": settings.is_supabase_configured,
        "database": db_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
