"""
Trusted Partners routes — TAMIS АГРО.

Керує логотипами секції «Нам довіряють» — використовуються на /welcome ("/")
та /about (/o-nas) одночасно з єдиного джерела.

Public:
  GET    /api/trusted-partners              — список активних (sorted by order)

Admin (Bearer JWT, role=admin):
  GET    /api/admin/trusted-partners        — повний список
  POST   /api/admin/trusted-partners        — створити
  PATCH  /api/admin/trusted-partners/{id}   — оновити
  DELETE /api/admin/trusted-partners/{id}   — видалити
  PUT    /api/admin/trusted-partners/reorder — масово оновити порядок
"""
from __future__ import annotations

import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List

import jwt
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret")
JWT_ALG = os.environ.get("JWT_ALG", "HS256")


# ===== Models =====
class PartnerItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    logo_url: str = ""
    link_url: str = ""     # optional external link
    alt: str = ""
    is_active: bool = True
    order: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class PartnerCreate(BaseModel):
    name: str = Field(min_length=1)
    logo_url: str = ""
    link_url: str = ""
    alt: str = ""
    is_active: bool = True
    order: Optional[int] = None


class PartnerPatch(BaseModel):
    name: Optional[str] = None
    logo_url: Optional[str] = None
    link_url: Optional[str] = None
    alt: Optional[str] = None
    is_active: Optional[bool] = None
    order: Optional[int] = None


class PartnerReorder(BaseModel):
    ids: List[str]


# ===== Default seed =====
DEFAULT_PARTNERS = [
    {"name": "Нібулон", "logo_url": "/Screenshot-2026-02-11-at-12-52-41-1@2x-clean.png", "link_url": "https://www.nibulon.com/"},
    {"name": "Kernel", "logo_url": "/Screenshot-2026-02-11-at-12-52-58-1@2x-clean.png", "link_url": "https://www.kernel.ua/"},
    {"name": "Епіцентр Агро", "logo_url": "/Screenshot-2026-02-11-at-12-52-46-1@2x-clean.png", "link_url": "https://epicentragro.com/"},
    {"name": "ТОВ Бургуджи", "logo_url": "/Screenshot-2026-02-11-at-12-53-29-1@2x-clean.png", "link_url": "https://burgudzhi.com.ua/"},
    {"name": "ТОВ Агро-Південь", "logo_url": "/Screenshot-2026-02-11-at-12-53-09-1@2x-clean.png", "link_url": "https://agro-south.com.ua/"},
    {"name": "МХП", "logo_url": "/Screenshot-2026-02-11-at-12-53-04-1@2x-clean.png", "link_url": "https://mhp.com.ua/"},
    {"name": "Агрофирма Корнацьких", "logo_url": "/Screenshot-2026-02-11-at-12-52-52-1@2x-clean.png", "link_url": "https://kornatskyi.com.ua/"},
]


async def seed_partners_if_empty(db: AsyncIOMotorDatabase) -> None:
    try:
        count = await db.trusted_partners.count_documents({})
        if count == 0:
            now_iso = datetime.now(timezone.utc).isoformat()
            docs = []
            for i, it in enumerate(DEFAULT_PARTNERS):
                docs.append({
                    "id": str(uuid.uuid4()),
                    "name": it["name"],
                    "logo_url": it["logo_url"],
                    "link_url": it.get("link_url", ""),
                    "alt": it["name"],
                    "is_active": True,
                    "order": i,
                    "created_at": now_iso,
                    "updated_at": now_iso,
                })
            await db.trusted_partners.insert_many(docs)
            logger.info(f"[seed] trusted_partners: inserted {len(docs)} default items")
    except Exception as e:
        logger.warning(f"[seed] trusted_partners skipped: {e}")


async def backfill_partner_links(db: AsyncIOMotorDatabase) -> None:
    """
    Idempotent: для існуючих партнерів, у яких link_url порожній,
    проставляє посилання з DEFAULT_PARTNERS за іменем (case-insensitive).
    Безпечно для повторних запусків — не перезаписує існуючі link_url,
    які адмін уже відредагував.
    """
    try:
        # Побудуємо мапу "lowercased name" -> link_url з DEFAULT_PARTNERS
        link_by_name: dict[str, str] = {}
        for it in DEFAULT_PARTNERS:
            link = (it.get("link_url") or "").strip()
            if link:
                link_by_name[it["name"].strip().lower()] = link
        if not link_by_name:
            return

        updated = 0
        now_iso = datetime.now(timezone.utc).isoformat()
        async for doc in db.trusted_partners.find({}, {"_id": 0}):
            current_link = (doc.get("link_url") or "").strip()
            if current_link:
                continue  # адмін уже задав свій лінк — не чіпаємо
            name_key = (doc.get("name") or "").strip().lower()
            new_link = link_by_name.get(name_key)
            if not new_link:
                continue
            await db.trusted_partners.update_one(
                {"id": doc["id"]},
                {"$set": {"link_url": new_link, "updated_at": now_iso}},
            )
            updated += 1
        if updated:
            logger.info(f"[migrate] trusted_partners: backfilled {updated} link_url(s)")
    except Exception as e:
        logger.warning(f"[migrate] trusted_partners backfill skipped: {e}")


def _strip_id(d: dict) -> dict:
    if d:
        d.pop("_id", None)
    return d


def _decode(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Невалідний токен")


def build_trusted_partners_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(tags=["trusted_partners"])

    async def admin_user(authorization: Optional[str] = Header(default=None)) -> dict:
        if not authorization or not authorization.lower().startswith("bearer "):
            raise HTTPException(status_code=401, detail="Не авторизовано")
        token = authorization.split(" ", 1)[1].strip()
        payload = _decode(token)
        uid = payload.get("sub")
        if not uid:
            raise HTTPException(status_code=401, detail="Невалідний токен")
        user = await db.users.find_one({"id": uid}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Користувача не знайдено")
        if user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Доступ лише для адміністраторів")
        return user

    # ===== Public =====
    @router.get("/trusted-partners", response_model=List[PartnerItem])
    async def list_public():
        cursor = db.trusted_partners.find(
            {"is_active": True}, {"_id": 0}
        ).sort([("order", 1), ("created_at", 1)])
        items = await cursor.to_list(length=500)
        return [PartnerItem(**it) for it in items]

    # ===== Admin =====
    @router.get("/admin/trusted-partners", response_model=List[PartnerItem])
    async def list_admin(_user=Depends(admin_user)):
        cursor = db.trusted_partners.find({}, {"_id": 0}).sort(
            [("order", 1), ("created_at", 1)]
        )
        items = await cursor.to_list(length=500)
        return [PartnerItem(**it) for it in items]

    @router.post("/admin/trusted-partners", response_model=PartnerItem)
    async def create_item(payload: PartnerCreate, _user=Depends(admin_user)):
        now_iso = datetime.now(timezone.utc).isoformat()
        if payload.order is None:
            max_doc = await db.trusted_partners.find_one(
                {}, {"_id": 0, "order": 1}, sort=[("order", -1)]
            )
            next_order = (max_doc or {}).get("order", -1) + 1
        else:
            next_order = payload.order
        doc = {
            "id": str(uuid.uuid4()),
            "name": payload.name.strip(),
            "logo_url": (payload.logo_url or "").strip(),
            "link_url": (payload.link_url or "").strip(),
            "alt": (payload.alt or payload.name).strip(),
            "is_active": bool(payload.is_active),
            "order": next_order,
            "created_at": now_iso,
            "updated_at": now_iso,
        }
        await db.trusted_partners.insert_one(doc)
        return PartnerItem(**_strip_id(doc))

    @router.patch("/admin/trusted-partners/{item_id}", response_model=PartnerItem)
    async def patch_item(item_id: str, payload: PartnerPatch, _user=Depends(admin_user)):
        data = payload.model_dump(exclude_none=True)
        if not data:
            raise HTTPException(status_code=400, detail="Нічого оновлювати")
        existing = await db.trusted_partners.find_one({"id": item_id}, {"_id": 0})
        if not existing:
            raise HTTPException(status_code=404, detail="Партнера не знайдено")
        for k in ("name", "logo_url", "link_url", "alt"):
            if k in data and isinstance(data[k], str):
                data[k] = data[k].strip()
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.trusted_partners.update_one({"id": item_id}, {"$set": data})
        doc = await db.trusted_partners.find_one({"id": item_id}, {"_id": 0})
        return PartnerItem(**doc)

    @router.delete("/admin/trusted-partners/{item_id}")
    async def delete_item(item_id: str, _user=Depends(admin_user)):
        r = await db.trusted_partners.delete_one({"id": item_id})
        if r.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Партнера не знайдено")
        return {"deleted": r.deleted_count}

    @router.put("/admin/trusted-partners/reorder", response_model=List[PartnerItem])
    async def reorder(payload: PartnerReorder, _user=Depends(admin_user)):
        now_iso = datetime.now(timezone.utc).isoformat()
        for idx, pid in enumerate(payload.ids):
            await db.trusted_partners.update_one(
                {"id": pid},
                {"$set": {"order": idx, "updated_at": now_iso}},
            )
        cursor = db.trusted_partners.find({}, {"_id": 0}).sort(
            [("order", 1), ("created_at", 1)]
        )
        items = await cursor.to_list(length=500)
        return [PartnerItem(**it) for it in items]

    return router
