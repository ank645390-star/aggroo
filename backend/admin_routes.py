"""
Admin API.

Охороняється JWT (хедер Authorization: Bearer) і роллю "admin" в полі user.role.
Якщо роль не адмін — 403.

Endpoints:
  GET    /api/admin/settings                  — поточні налаштування
  PUT    /api/admin/settings                  — оновити налаштування
  POST   /api/admin/settings/test-telegram    — тестове повідомлення в telegram
  POST   /api/admin/settings/test-email       — тестовий лист по SMTP
  GET    /api/admin/callbacks                 — список заявок
  PATCH  /api/admin/callbacks/{id}            — оновити статус / нотатку
  DELETE /api/admin/callbacks/{id}            — видалити
  GET    /api/admin/stats                     — дашборд-показники
"""
from __future__ import annotations

import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Literal

import jwt
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from motor.motor_asyncio import AsyncIOMotorDatabase

from callback_routes import (
    ADMIN_SETTINGS_ID,
    _send_telegram,
    _send_email,
)

logger = logging.getLogger(__name__)

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret")
JWT_ALG = os.environ.get("JWT_ALG", "HS256")


# ===== Models =====
class AdminSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    channel: Literal["telegram", "email", "both", "none"] = "none"

    # Telegram
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""

    # Email / SMTP
    smtp_host: str = ""
    smtp_port: int = 465
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_use_tls: bool = True
    from_email: str = ""
    to_email: str = ""

    # Common
    site_name: str = "TAMIS АГРО"

    # Google OAuth
    google_client_id: str = ""
    google_enabled: bool = False

    # Site-wide contact info (used on contacts, welcome, footer, catalog)
    contact_phone_primary: str = "+380 (50) 937-56-57"
    contact_phone_secondary: str = "+380 (67) 510-13-07"
    contact_email: str = "tamisagro@gmail.com"
    contact_address: str = "55200, м. Первомайськ, вул. Київська 135, Миколаївська область"

    updated_at: Optional[str] = None


class AdminSettingsPatch(BaseModel):
    channel: Optional[Literal["telegram", "email", "both", "none"]] = None
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_use_tls: Optional[bool] = None
    from_email: Optional[str] = None
    to_email: Optional[str] = None
    site_name: Optional[str] = None
    google_client_id: Optional[str] = None
    google_enabled: Optional[bool] = None
    contact_phone_primary: Optional[str] = None
    contact_phone_secondary: Optional[str] = None
    contact_email: Optional[str] = None
    contact_address: Optional[str] = None


class CallbackStatusPatch(BaseModel):
    status: Optional[Literal["new", "in_progress", "done", "archived"]] = None
    note: Optional[str] = None


class CallbackItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    phone: str
    comment: str = ""
    status: str = "new"
    note: str = ""
    notified_telegram: bool = False
    notified_email: bool = False
    created_at: str
    updated_at: Optional[str] = None


class DashboardStats(BaseModel):
    total: int
    new: int
    in_progress: int
    done: int
    today: int
    week: int


# ===== Helpers =====
def _decode(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Невалідний токена")


def _strip_id(d: dict) -> dict:
    if d:
        d.pop("_id", None)
    return d


def _settings_to_out(doc: Optional[dict]) -> AdminSettings:
    if not doc:
        return AdminSettings()
    return AdminSettings(**doc)


def build_admin_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(prefix="/admin", tags=["admin"])

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

    # ===== Settings =====
    @router.get("/settings", response_model=AdminSettings)
    async def get_settings(_user=Depends(admin_user)):
        doc = await db.admin_settings.find_one({"_id": ADMIN_SETTINGS_ID})
        return _settings_to_out(_strip_id(doc) if doc else None)

    @router.put("/settings", response_model=AdminSettings)
    async def update_settings(payload: AdminSettingsPatch, _user=Depends(admin_user)):
        update = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
        update["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.admin_settings.update_one(
            {"_id": ADMIN_SETTINGS_ID},
            {"$set": update, "$setOnInsert": {"_id": ADMIN_SETTINGS_ID}},
            upsert=True,
        )
        doc = await db.admin_settings.find_one({"_id": ADMIN_SETTINGS_ID})
        return _settings_to_out(_strip_id(doc))

    @router.post("/settings/test-telegram")
    async def test_telegram(_user=Depends(admin_user)):
        cfg = await db.admin_settings.find_one({"_id": ADMIN_SETTINGS_ID}) or {}
        ok = await _send_telegram(
            bot_token=cfg.get("telegram_bot_token") or "",
            chat_id=cfg.get("telegram_chat_id") or "",
            text="✅ <b>TAMIS АГРО</b> — тестове повідомлення з адмін-панелі. Якщо ви бачите це — їнтеграція працює.",
        )
        if not ok:
            raise HTTPException(status_code=400, detail="Не вдалося надіслати в Telegram. Перевірте token і chat_id.")
        return {"ok": True}

    @router.post("/settings/test-email")
    async def test_email(_user=Depends(admin_user)):
        cfg = await db.admin_settings.find_one({"_id": ADMIN_SETTINGS_ID}) or {}
        ok = await _send_email(
            cfg,
            subject="TAMIS АГРО — тестовий лист",
            body="Це тестовий лист від адмін-панелі TAMIS АГРО. Якщо ви бачите це повідомлення — SMTP налаштовано вірно.",
        )
        if not ok:
            raise HTTPException(status_code=400, detail="Не вдалося надіслати email. Перевірте SMTP-налаштування.")
        return {"ok": True}

    # ===== Callbacks =====
    @router.get("/callbacks", response_model=list[CallbackItem])
    async def list_callbacks(
        status_f: Optional[str] = None,
        limit: int = 200,
        _user=Depends(admin_user),
    ):
        q: dict = {}
        if status_f and status_f != "all":
            q["status"] = status_f
        cursor = db.callback_requests.find(q, {"_id": 0}).sort("created_at", -1).limit(min(limit, 500))
        items = await cursor.to_list(length=limit)
        return [CallbackItem(**it) for it in items]

    @router.patch("/callbacks/{cid}", response_model=CallbackItem)
    async def patch_callback(cid: str, payload: CallbackStatusPatch, _user=Depends(admin_user)):
        update = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
        if not update:
            raise HTTPException(status_code=400, detail="Нічого оновлювати")
        update["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = await db.callback_requests.update_one({"id": cid}, {"$set": update})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Заявку не знайдено")
        doc = await db.callback_requests.find_one({"id": cid}, {"_id": 0})
        return CallbackItem(**doc)

    @router.delete("/callbacks/{cid}")
    async def delete_callback(cid: str, _user=Depends(admin_user)):
        r = await db.callback_requests.delete_one({"id": cid})
        return {"deleted": r.deleted_count}

    # ===== Dashboard =====
    @router.get("/stats", response_model=DashboardStats)
    async def stats(_user=Depends(admin_user)):
        now = datetime.now(timezone.utc)
        today_iso = (now.replace(hour=0, minute=0, second=0, microsecond=0)).isoformat()
        week_iso = (now - timedelta(days=7)).isoformat()
        total = await db.callback_requests.count_documents({})
        new = await db.callback_requests.count_documents({"status": "new"})
        in_progress = await db.callback_requests.count_documents({"status": "in_progress"})
        done = await db.callback_requests.count_documents({"status": "done"})
        today = await db.callback_requests.count_documents({"created_at": {"$gte": today_iso}})
        week = await db.callback_requests.count_documents({"created_at": {"$gte": week_iso}})
        return DashboardStats(total=total, new=new, in_progress=in_progress, done=done, today=today, week=week)

    return router
