import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.database import init_db
from app.routers import (
    clinic_router,
    health_router,
    hospital_router,
    lab_router,
    organizations_router,
    provider_router,
    users_router,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("healthcare_api")
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables are created in local/sqlite instances
    logger.info("Initializing Healthcare Management SaaS Backend...")
    try:
        await init_db()
        logger.info("Database schema initialized successfully.")
    except Exception as e:
        logger.error(f"Error during database startup initialization: {e}")
    yield
    # Shutdown
    logger.info("Healthcare Management SaaS Backend shutting down.")


app = FastAPI(
    title="Healthcare Management SaaS API",
    description="Multi-tenant backend platform for clinics, hospitals, diagnostic centres, and patient portals.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Root"])
async def root():
    return {
        "service": "Healthcare Management SaaS API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "environment": settings.ENVIRONMENT,
    }


# Include Routers
app.include_router(health_router)
app.include_router(users_router)
app.include_router(organizations_router)
app.include_router(provider_router)
app.include_router(clinic_router)
app.include_router(lab_router)
app.include_router(hospital_router)
