"""
Sales / CRM module — modular admin-side stack for managing orders,
payments, abandoned carts, customer base and upsell rules.

Public surface is intentionally narrow so it can be mounted from server.py
with a single line:

    from sales import build_sales_router
    app.include_router(build_sales_router(db), prefix="/api")

Everything else (models / utils / sub-routers) is implementation detail.
"""
from .router import build_sales_router
from .seed import migrate_orders_payment_fields, seed_demo_upsells_if_empty

__all__ = [
    "build_sales_router",
    "migrate_orders_payment_fields",
    "seed_demo_upsells_if_empty",
]
