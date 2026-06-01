"""
Contact Messages API — «Написати на пошту».

Клієнт пише повідомлення через модалку на сайті — хоче зв'язатися
з менеджером без відкривання власного поштового клієнта.

Повідомлення зберігається в contact_messages і паралельно надсилається
менеджеру по канальних налаштувань в admin_settings (id=main).
Логіка повністю аналогічна callback_routes.py.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, ConfigDict, EmailStr, Field

# —— Перевикористовуємо функції розсилки з callback_routes — вони вже
# справляються з telegram + smtp за тими ж admin_settings.
from callback_routes import _send_email, _send_telegram, ADMIN_SETTINGS_ID

logger = logging.getLogger(__name__)


class ContactMessageIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    subject: Optional[str] = Field(default=None, max_length=160)
    message: str = Field(min_length=1, max_length=4000)
    phone: Optional[str] = Field(default=None, max_length=40)
    consent: bool = Field(default=False)


class ContactMessageOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: str
    subject: str = ""
    message: str
    phone: str = ""
    status: str = "new"
    notified_telegram: bool = False
    notified_email: bool = False
    created_at: str


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _fmt_html(lead: dict) -> str:
    parts = [
        "\U0001F4E7 <b>Нове повідомлення з сайту</b>",
        "—" * 20,
        f"<b>Ім'я:</b> {lead.get('name','')}",
        f"<b>Email:</b> {lead.get('email','')}",
    ]
    if lead.get("phone"):
        parts.append(f"<b>Телефон:</b> {lead['phone']}")
    if lead.get("subject"):
        parts.append(f"<b>Тема:</b> {lead['subject']}")
    parts.append(f"<b>Повідомлення:</b>\n{lead.get('message','')}")
    parts.append(f"<b>Час:</b> {lead.get('created_at','')}")
    return "\n".join(parts)


def _fmt_plain(lead: dict) -> str:
    parts = [
        "Нове повідомлення з сайту TAMIS АГРО",
        "-" * 40,
        f"Ім'я: {lead.get('name','')}",
        f"Email: {lead.get('email','')}",
    ]
    if lead.get("phone"):
        parts.append(f"Телефон: {lead['phone']}")
    if lead.get("subject"):
        parts.append(f"Тема: {lead['subject']}")
    parts.append("")
    parts.append("Повідомлення:")
    parts.append(lead.get("message", ""))
    parts.append("")
    parts.append(f"Час: {lead.get('created_at','')}")
    return "\n".join(parts)


def build_contact_messages_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(prefix="/contact-messages", tags=["contact_messages"])

    @router.post("", response_model=ContactMessageOut, status_code=status.HTTP_201_CREATED)
    async def create_contact_message(payload: ContactMessageIn):
        if not payload.consent:
            raise HTTPException(
                status_code=400, detail="Потрібна згода на обробку перс. даних"
            )
        lead = {
            "id": str(uuid.uuid4()),
            "name": payload.name.strip(),
            "email": str(payload.email).strip(),
            "subject": (payload.subject or "").strip(),
            "message": payload.message.strip(),
            "phone": (payload.phone or "").strip(),
            "consent": True,
            "status": "new",
            "notified_telegram": False,
            "notified_email": False,
            "created_at": _now_iso(),
        }

        try:
            cfg = await db.admin_settings.find_one({"_id": ADMIN_SETTINGS_ID}) or {}
            channel = (cfg.get("channel") or "none").lower()
            if channel in ("telegram", "both"):
                ok = await _send_telegram(
                    bot_token=cfg.get("telegram_bot_token") or "",
                    chat_id=cfg.get("telegram_chat_id") or "",
                    text=_fmt_html(lead),
                )
                lead["notified_telegram"] = ok
            if channel in ("email", "both"):
                subject_line = (
                    f"[TAMIS АГРО] {lead['subject']}"
                    if lead.get("subject")
                    else "[TAMIS АГРО] Нове повідомлення з сайту"
                )
                ok = await _send_email(cfg, subject=subject_line, body=_fmt_plain(lead))
                lead["notified_email"] = ok
        except Exception as e:
            logger.warning(f"[contact_messages] notification phase failed: {e}")

        await db.contact_messages.insert_one(dict(lead))
        lead.pop("_id", None)
        return ContactMessageOut(**lead)

    @router.get("")
    async def list_messages(limit: int = 50):
        """Admin helper — list recent messages (no auth in this MVP)."""
        cursor = db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1).limit(limit)
        items = await cursor.to_list(length=limit)
        return {"items": items, "total": len(items)}

    return router
