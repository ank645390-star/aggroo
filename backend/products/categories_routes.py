"""
Admin & public endpoints for product categories (filter taxonomy).

  Public:
    — already exposed at /api/products/categories (in public_routes)

  Admin:
    GET    /api/admin/product-categories
    POST   /api/admin/product-categories
    PATCH  /api/admin/product-categories/{id}
    DELETE /api/admin/product-categories/{id}
    POST   /api/admin/product-categories/reorder         body: { ids: ["…"] }
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Body
from motor.motor_asyncio import AsyncIOMotorDatabase

from .models import (
    ProductCategoryOut,
    ProductCategoryCreate,
    ProductCategoryPatch,
)
from .security import build_admin_dep


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_categories_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(prefix="/admin/product-categories", tags=["products-admin"])
    admin_user = build_admin_dep(db)

    async def _to_out(doc: dict) -> ProductCategoryOut:
        doc.pop("_id", None)
        count = await db.products.count_documents({"category": doc.get("slug")})
        return ProductCategoryOut(**{**doc, "count": count})

    @router.get("", response_model=dict)
    async def list_all(_u=Depends(admin_user)):
        cursor = db.product_categories.find({}, {"_id": 0}).sort("sort_order", 1)
        cats = await cursor.to_list(length=500)
        items = []
        for c in cats:
            items.append((await _to_out(c)).model_dump())
        return {"items": items, "total": len(items)}

    @router.post("", response_model=ProductCategoryOut)
    async def create(payload: ProductCategoryCreate, _u=Depends(admin_user)):
        data = payload.model_dump()
        # uniqueness check
        exists = await db.product_categories.find_one({"slug": data["slug"]}, {"_id": 0, "id": 1})
        if exists:
            raise HTTPException(status_code=400, detail="Категорія з таким slug вже існує")
        data["id"] = str(uuid.uuid4())
        data["created_at"] = _now_iso()
        data["updated_at"] = data["created_at"]
        await db.product_categories.insert_one(dict(data))
        return await _to_out(data)

    @router.patch("/{cid}", response_model=ProductCategoryOut)
    async def update(cid: str, payload: ProductCategoryPatch, _u=Depends(admin_user)):
        doc = await db.product_categories.find_one({"id": cid}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Категорію не знайдено")
        update = payload.model_dump(exclude_none=True)

        if "slug" in update and update["slug"] != doc.get("slug"):
            exists = await db.product_categories.find_one(
                {"slug": update["slug"], "id": {"$ne": cid}}, {"_id": 0, "id": 1}
            )
            if exists:
                raise HTTPException(status_code=400, detail="Слаг вже використовується")
            # cascade rename on products
            await db.products.update_many(
                {"category": doc["slug"]},
                {"$set": {"category": update["slug"]}},
            )
        update["updated_at"] = _now_iso()
        await db.product_categories.update_one({"id": cid}, {"$set": update})
        doc2 = await db.product_categories.find_one({"id": cid}, {"_id": 0})
        return await _to_out(doc2)

    @router.delete("/{cid}")
    async def delete(cid: str, _u=Depends(admin_user)):
        doc = await db.product_categories.find_one({"id": cid}, {"_id": 0})
        if not doc:
            return {"deleted": False}
        in_use = await db.products.count_documents({"category": doc["slug"]})
        if in_use > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Категорія використовується у {in_use} товарах. Спочатку перенесіть або видаліть їх.",
            )
        r = await db.product_categories.delete_one({"id": cid})
        return {"deleted": r.deleted_count > 0}

    @router.post("/reorder")
    async def reorder(ids: List[str] = Body(..., embed=True), _u=Depends(admin_user)):
        for idx, cid in enumerate(ids):
            await db.product_categories.update_one({"id": cid}, {"$set": {"sort_order": idx, "updated_at": _now_iso()}})
        return {"ok": True, "count": len(ids)}

    return router
