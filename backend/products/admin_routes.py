"""
Admin product endpoints — full CRUD + image upload (JWT bearer, role=admin).

  GET    /api/admin/products                         — list (incl. drafts)
  GET    /api/admin/products/{id}                    — single by id
  POST   /api/admin/products                         — create
  PATCH  /api/admin/products/{id}                    — partial update
  DELETE /api/admin/products/{id}                    — delete
  POST   /api/admin/products/upload-image            — upload image (multipart)
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorDatabase

from .models import (
    ProductOut,
    ProductCreate,
    ProductPatch,
)
from .security import build_admin_dep
from .upload import save_image
from .utils import to_product_out, unique_slug, text_to_slug, sanitize_tab, sanitize_description


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_admin_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(prefix="/admin/products", tags=["products-admin"])
    admin_user = build_admin_dep(db)

    @router.get("", response_model=dict)
    async def list_all(_u=Depends(admin_user)):
        cursor = db.products.find({}, {"_id": 0}).sort([("sort_order", 1), ("created_at", -1)])
        items = [to_product_out(d).model_dump() async for d in cursor]
        return {"items": items, "total": len(items)}

    @router.get("/{pid}", response_model=ProductOut)
    async def get_one(pid: str, _u=Depends(admin_user)):
        doc = await db.products.find_one({"id": pid}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Товар не знайдено")
        return to_product_out(doc)

    @router.post("", response_model=ProductOut)
    async def create(payload: ProductCreate, _u=Depends(admin_user)):
        data = payload.model_dump()
        # slug resolution
        base = data.get("slug") or data.get("name") or "product"
        data["slug"] = await unique_slug(db, base)

        # sanitize tab blocks
        for tab_key in ("dosage", "composition", "compatibility", "specs"):
            data[tab_key] = sanitize_tab(data.get(tab_key))
        # sanitize description block
        data["description"] = sanitize_description(data.get("description"))

        # photos[] cleanup
        photos = [p for p in (data.get("photos") or []) if isinstance(p, str) and p.strip()]
        data["photos"] = photos
        if not data.get("photo") and photos:
            data["photo"] = photos[0]

        # base fields
        data["id"] = str(uuid.uuid4())
        data["created_at"] = _now_iso()
        data["updated_at"] = data["created_at"]

        await db.products.insert_one(dict(data))
        return to_product_out(data)

    @router.patch("/{pid}", response_model=ProductOut)
    async def update(pid: str, payload: ProductPatch, _u=Depends(admin_user)):
        doc = await db.products.find_one({"id": pid}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Товар не знайдено")

        update = payload.model_dump(exclude_none=True)

        if "slug" in update and update["slug"] and update["slug"] != doc.get("slug"):
            update["slug"] = await unique_slug(db, update["slug"], exclude_id=pid)
        elif "name" in update and not doc.get("slug"):
            update["slug"] = await unique_slug(db, update["name"], exclude_id=pid)

        for tab_key in ("dosage", "composition", "compatibility", "specs"):
            if tab_key in update:
                update[tab_key] = sanitize_tab(update[tab_key])
        if "description" in update:
            update["description"] = sanitize_description(update["description"])

        if "photos" in update:
            cleaned = [p for p in (update["photos"] or []) if isinstance(p, str) and p.strip()]
            update["photos"] = cleaned
            if not update.get("photo") and cleaned and not doc.get("photo"):
                update["photo"] = cleaned[0]

        update["updated_at"] = _now_iso()
        await db.products.update_one({"id": pid}, {"$set": update})
        doc2 = await db.products.find_one({"id": pid}, {"_id": 0})
        return to_product_out(doc2)

    @router.delete("/{pid}")
    async def delete(pid: str, _u=Depends(admin_user)):
        r = await db.products.delete_one({"id": pid})
        return {"deleted": r.deleted_count > 0}

    @router.post("/upload-image")
    async def upload_image(file: UploadFile = File(...), _u=Depends(admin_user)):
        return await save_image(file)

    return router
