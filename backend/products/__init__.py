"""
Products module — modular package for catalog/products backend.

Exports:
  build_products_router(db) — composite APIRouter, mount under /api
  seed_products_if_empty(db) — idempotent seed
  seed_product_categories_if_empty(db) — idempotent seed for filter categories
  UPLOAD_DIR — path for image uploads (mount via StaticFiles)

Architecture: each concern is split into its own submodule:
  models.py         — Pydantic schemas
  security.py       — JWT/admin dependency
  upload.py         — image upload utility
  public_routes.py  — public GET endpoints
  admin_routes.py   — admin CRUD endpoints
  categories_routes.py — admin/public for filter-categories taxonomy
  seed.py           — default seed data
"""
from .router import build_products_router, UPLOAD_DIR
from .seed import (
    seed_products_if_empty,
    seed_product_categories_if_empty,
    backfill_product_descriptions,
    ensure_adjuvant_products,
)

__all__ = [
    "build_products_router",
    "seed_products_if_empty",
    "seed_product_categories_if_empty",
    "backfill_product_descriptions",
    "ensure_adjuvant_products",
    "UPLOAD_DIR",
]
