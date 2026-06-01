"""Composes all sales sub-routers into one mountable APIRouter."""
from __future__ import annotations

from fastapi import APIRouter
from motor.motor_asyncio import AsyncIOMotorDatabase

from .orders_admin import build_orders_admin_router, build_orders_customer_router
from .carts_admin import build_abandoned_carts_router
from .users_admin import build_users_admin_router
from .upsells_admin import build_upsells_admin_router, build_upsells_public_router
from .dashboard import build_sales_dashboard_router


def build_sales_router(db: AsyncIOMotorDatabase) -> APIRouter:
    """Builder consumed by server.py."""
    root = APIRouter()
    root.include_router(build_orders_admin_router(db))
    root.include_router(build_orders_customer_router(db))
    root.include_router(build_abandoned_carts_router(db))
    root.include_router(build_users_admin_router(db))
    root.include_router(build_upsells_admin_router(db))
    root.include_router(build_upsells_public_router(db))
    root.include_router(build_sales_dashboard_router(db))
    return root
