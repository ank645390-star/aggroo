"""
FAQ routes — TAMIS АГРО.

Public:
  GET    /api/faq                     — список питань (упорядкований за `order`)

Admin (потребує Bearer JWT з роллю admin):
  GET    /api/admin/faq               — повний список
  POST   /api/admin/faq               — створити елемент
  PATCH  /api/admin/faq/{id}          — оновити (q/a/order)
  DELETE /api/admin/faq/{id}          — видалити
  PUT    /api/admin/faq/reorder       — масово оновити порядок (ids[])
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
class FaqItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    q: str
    a: str
    order: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class FaqCreate(BaseModel):
    q: str = Field(min_length=1)
    a: str = Field(min_length=1)
    order: Optional[int] = None


class FaqPatch(BaseModel):
    q: Optional[str] = None
    a: Optional[str] = None
    order: Optional[int] = None


class FaqReorder(BaseModel):
    ids: List[str]


# ===== Default seed (used once) =====
DEFAULT_FAQ = [
    {
        "q": "Що таке біопрепарати в аграрній сфері та як вони працюють?",
        "a": "Біопрепарати — це натуральні засоби на основі корисних мікроорганізмів, бактерій або органічних компонентів, які допомагають покращити ріст рослин, підвищити врожайність та відновити родючість ґрунту без агресивної хімії.",
    },
    {
        "q": "Які переваги використання біопрепаратів для сільського господарства?",
        "a": "Підвищують урожайність, покращують структуру ґрунту, безпечні для людини, тварин і навколишнього середовища, дозволяють отримати екологічно чисту продукцію.",
    },
    {
        "q": "Чи можна поєднувати біопрепарати з хімічними добривами та ЗЗР?",
        "a": "Так, у більшості випадків біопрепарати сумісні з мінеральними добривами та засобами захисту рослин. Однак рекомендуємо консультацію зі спеціалістом.",
    },
    {
        "q": "Для яких культур підходять біопрепарати?",
        "a": "Лінійка TAMIS підходить для зернових, олійних, овочевих та плодово-ягідних культур.",
    },
    {
        "q": "Коли найкраще вносити біопрепарати для максимального ефекту?",
        "a": "Залежно від типу: на стадії передпосівної обробки насіння, при основних обробках вегетації або під час збору врожаю.",
    },
    {
        "q": "Чи є сертифікат якості?",
        "a": "Так, усі наші препарати мають сертифікати якості та офіційну реєстрацію в Україні.",
    },
]


async def seed_faq_if_empty(db: AsyncIOMotorDatabase) -> None:
    """Idempotent seed — створює дефолтний набір лише якщо колекція порожня."""
    try:
        count = await db.faq.count_documents({})
        if count == 0:
            now_iso = datetime.now(timezone.utc).isoformat()
            await db.faq.insert_many([
                {
                    "id": str(uuid.uuid4()),
                    "q": it["q"],
                    "a": it["a"],
                    "order": i,
                    "created_at": now_iso,
                    "updated_at": now_iso,
                }
                for i, it in enumerate(DEFAULT_FAQ)
            ])
            logger.info(f"[seed] faq: inserted {len(DEFAULT_FAQ)} default items")
    except Exception as e:
        logger.warning(f"[seed] faq skipped: {e}")


def _strip_id(d: dict) -> dict:
    if d:
        d.pop("_id", None)
    return d


def _decode(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Невалідний токен")


def build_faq_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(tags=["faq"])

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
    @router.get("/faq", response_model=List[FaqItem])
    async def list_public():
        cursor = db.faq.find({}, {"_id": 0}).sort([("order", 1), ("created_at", 1)])
        items = await cursor.to_list(length=500)
        return [FaqItem(**it) for it in items]

    # ===== Admin =====
    @router.get("/admin/faq", response_model=List[FaqItem])
    async def list_admin(_user=Depends(admin_user)):
        cursor = db.faq.find({}, {"_id": 0}).sort([("order", 1), ("created_at", 1)])
        items = await cursor.to_list(length=500)
        return [FaqItem(**it) for it in items]

    @router.post("/admin/faq", response_model=FaqItem)
    async def create_item(payload: FaqCreate, _user=Depends(admin_user)):
        now_iso = datetime.now(timezone.utc).isoformat()
        # Якщо порядок не передали — додаємо в кінець
        if payload.order is None:
            max_doc = await db.faq.find_one({}, {"_id": 0, "order": 1}, sort=[("order", -1)])
            next_order = (max_doc or {}).get("order", -1) + 1
        else:
            next_order = payload.order
        doc = {
            "id": str(uuid.uuid4()),
            "q": payload.q.strip(),
            "a": payload.a.strip(),
            "order": next_order,
            "created_at": now_iso,
            "updated_at": now_iso,
        }
        await db.faq.insert_one(doc)
        return FaqItem(**_strip_id(doc))

    @router.patch("/admin/faq/{item_id}", response_model=FaqItem)
    async def patch_item(item_id: str, payload: FaqPatch, _user=Depends(admin_user)):
        update = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
        if not update:
            raise HTTPException(status_code=400, detail="Нічого оновлювати")
        update["updated_at"] = datetime.now(timezone.utc).isoformat()
        if "q" in update and isinstance(update["q"], str):
            update["q"] = update["q"].strip()
        if "a" in update and isinstance(update["a"], str):
            update["a"] = update["a"].strip()
        r = await db.faq.update_one({"id": item_id}, {"$set": update})
        if r.matched_count == 0:
            raise HTTPException(status_code=404, detail="Елемент не знайдено")
        doc = await db.faq.find_one({"id": item_id}, {"_id": 0})
        return FaqItem(**doc)

    @router.delete("/admin/faq/{item_id}")
    async def delete_item(item_id: str, _user=Depends(admin_user)):
        r = await db.faq.delete_one({"id": item_id})
        if r.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Елемент не знайдено")
        return {"deleted": r.deleted_count}

    @router.put("/admin/faq/reorder", response_model=List[FaqItem])
    async def reorder(payload: FaqReorder, _user=Depends(admin_user)):
        now_iso = datetime.now(timezone.utc).isoformat()
        for idx, fid in enumerate(payload.ids):
            await db.faq.update_one(
                {"id": fid},
                {"$set": {"order": idx, "updated_at": now_iso}},
            )
        cursor = db.faq.find({}, {"_id": 0}).sort([("order", 1), ("created_at", 1)])
        items = await cursor.to_list(length=500)
        return [FaqItem(**it) for it in items]

    return router
