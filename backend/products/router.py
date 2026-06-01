"""
Composite products router — assembles public + admin + categories subrouters.

Mount in server.py via `app.include_router(build_products_router(db), prefix="/api")`.
"""
from __future__ import annotations

from fastapi import APIRouter
from motor.motor_asyncio import AsyncIOMotorDatabase

from .public_routes import build_public_router
from .admin_routes import build_admin_router
from .categories_routes import build_categories_router
from .upload import UPLOAD_DIR


def build_products_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter()
    router.include_router(build_public_router(db))
    router.include_router(build_admin_router(db))
    router.include_router(build_categories_router(db))
    return router


__all__ = ["build_products_router", "UPLOAD_DIR"]
