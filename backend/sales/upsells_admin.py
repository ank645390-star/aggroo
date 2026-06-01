"""Admin + public upsell rules router.

Admin (CRUD): /admin/sales/upsells
Public (recs): /upsells?product_slug=...
"""
from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from .models import UpsellRuleCreate, UpsellRulePatch, UpsellRuleOut
from .security import build_admin_dep
from .utils import now_iso


def build_upsells_admin_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(prefix="/admin/sales/upsells", tags=["sales-admin-upsells"])
    admin_user = build_admin_dep(db)

    @router.get("", response_model=dict)
    async def list_rules(_u=Depends(admin_user)):
        cursor = db.upsell_rules.find({}, {"_id": 0}).sort([("priority", -1), ("created_at", -1)])
        items = [UpsellRuleOut(**d).model_dump() async for d in cursor]
        return {"items": items, "total": len(items)}

    @router.post("", response_model=UpsellRuleOut)
    async def create_rule(payload: UpsellRuleCreate, _u=Depends(admin_user)):
        ts = now_iso()
        doc = payload.model_dump()
        doc["id"] = str(uuid.uuid4())
        doc["created_at"] = ts
        doc["updated_at"] = ts
        await db.upsell_rules.insert_one(dict(doc))
        return UpsellRuleOut(**doc)

    @router.patch("/{rid}", response_model=UpsellRuleOut)
    async def patch_rule(rid: str, payload: UpsellRulePatch, _u=Depends(admin_user)):
        update = payload.model_dump(exclude_none=True)
        if not update:
            raise HTTPException(status_code=400, detail="Нічого оновлювати")
        update["updated_at"] = now_iso()
        r = await db.upsell_rules.update_one({"id": rid}, {"$set": update})
        if r.matched_count == 0:
            raise HTTPException(status_code=404, detail="Правило не знайдено")
        doc = await db.upsell_rules.find_one({"id": rid}, {"_id": 0})
        return UpsellRuleOut(**doc)

    @router.delete("/{rid}")
    async def delete_rule(rid: str, _u=Depends(admin_user)):
        r = await db.upsell_rules.delete_one({"id": rid})
        if r.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Правило не знайдено")
        return {"deleted": r.deleted_count}

    return router


def build_upsells_public_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(prefix="/upsells", tags=["sales-upsells-public"])

    @router.get("", response_model=dict)
    async def get_upsells(
        product_slug: Optional[str] = Query(default=None),
        limit: int = Query(default=6, ge=1, le=24),
    ):
        if not product_slug:
            return {"items": []}
        # find active rules where this product is a source
        cursor = db.upsell_rules.find(
            {"active": True, "source_product_slugs": product_slug},
            {"_id": 0},
        ).sort([("priority", -1)])
        target_slugs: list = []
        async for rule in cursor:
            for s in rule.get("target_product_slugs", []):
                if s and s != product_slug and s not in target_slugs:
                    target_slugs.append(s)
            if len(target_slugs) >= limit:
                break
        target_slugs = target_slugs[:limit]
        if not target_slugs:
            return {"items": []}
        cursor = db.products.find(
            {"slug": {"$in": target_slugs}, "status": "published"},
            {"_id": 0},
        )
        items_by_slug = {}
        async for prod in cursor:
            items_by_slug[prod["slug"]] = prod
        # preserve ordering
        items = [items_by_slug[s] for s in target_slugs if s in items_by_slug]
        return {"items": items}

    return router
