from app.routers.health import router as health_router
from app.routers.users import router as users_router
from app.routers.organizations import router as organizations_router
from app.routers.provider import router as provider_router
from app.routers.clinic import router as clinic_router
from app.routers.lab import router as lab_router
from app.routers.hospital import router as hospital_router
from app.routers.patient_portal import router as patient_portal_router
from app.routers.ambulance import router as ambulance_router
from app.routers.auth import router as auth_router

__all__ = [
    "health_router",
    "users_router",
    "organizations_router",
    "provider_router",
    "clinic_router",
    "lab_router",
    "hospital_router",
    "patient_portal_router",
    "ambulance_router",
    "auth_router",
]

