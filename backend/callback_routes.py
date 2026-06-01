"""
Callback API — «Замовити дзвінок».

Клієнт залишає заявку з форми на сайті. Обов'язкові поля: name, phone, consent.
Заявка зберігається в MongoDB (callback_requests) і паралельно надсилається менеджеру
по канальних налаштувань з колекції admin_settings (єдиний документ з _id="main").

Сповіщення:
  • telegram: bot_token + chat_id (менеджер вказує в адмінці)
  • email: SMTP host/port/user/password + from + to
  • channel: 'telegram' | 'email' | 'both' | 'none'
Помилки надсилання логуються, але не ламають основний флоу — заявка все одно зберігається.
"""
from __future__ import annotations

import logging
import smtplib
import ssl
import uuid
from datetime import datetime, timezone
from email.message import EmailMessage
from typing import Optional, Literal

import httpx
from fastapi import APIRouter, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field, ConfigDict

logger = logging.getLogger(__name__)

ADMIN_SETTINGS_ID = "main"


class CallbackIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str = Field(min_length=5, max_length=40)
    comment: Optional[str] = Field(default=None, max_length=500)
    consent: bool = Field(default=False)


class CallbackOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    phone: str
    comment: str = ""
    status: str = "new"
    notified_telegram: bool = False
    notified_email: bool = False
    created_at: str


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _send_telegram(bot_token: str, chat_id: str, text: str) -> bool:
    if not bot_token or not chat_id:
        return False
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {"chat_id": chat_id, "text": text, "parse_mode": "HTML", "disable_web_page_preview": True}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(url, json=payload)
        if r.status_code == 200 and r.json().get("ok"):
            return True
        logger.warning(f"[callback] telegram send failed status={r.status_code} body={r.text[:200]}")
        return False
    except Exception as e:
        logger.warning(f"[callback] telegram send exception: {e}")
        return False


def _send_email_sync(cfg: dict, subject: str, body: str) -> bool:
    host = cfg.get("smtp_host")
    port = int(cfg.get("smtp_port") or 465)
    user = cfg.get("smtp_user")
    password = cfg.get("smtp_password")
    from_email = cfg.get("from_email") or user
    to_email = cfg.get("to_email")
    use_tls = bool(cfg.get("smtp_use_tls", True))
    if not host or not to_email or not from_email:
        return False
    try:
        msg = EmailMessage()
        msg["From"] = from_email
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.set_content(body)

        if port == 465:
            ctx = ssl.create_default_context()
            with smtplib.SMTP_SSL(host, port, context=ctx, timeout=15) as server:
                if user and password:
                    server.login(user, password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(host, port, timeout=15) as server:
                server.ehlo()
                if use_tls:
                    server.starttls(context=ssl.create_default_context())
                    server.ehlo()
                if user and password:
                    server.login(user, password)
                server.send_message(msg)
        return True
    except Exception as e:
        logger.warning(f"[callback] email send exception: {e}")
        return False


async def _send_email(cfg: dict, subject: str, body: str) -> bool:
    import asyncio
    return await asyncio.to_thread(_send_email_sync, cfg, subject, body)


def _format_lead_text(lead: dict) -> str:
    return (
        "\U0001F4DE <b>Нова заявка на дзвінок</b>\n"
        f"\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\n"
        f"<b>Ім'я:</b> {lead.get('name','')}\n"
        f"<b>Телефон:</b> {lead.get('phone','')}\n"
        + (f"<b>Коментар:</b> {lead.get('comment','')}\n" if lead.get('comment') else "")
        + f"<b>Час:</b> {lead.get('created_at','')}\n"
    )


def _format_lead_text_plain(lead: dict) -> str:
    return (
        "Нова заявка на дзвінок (TAMIS АГРО)\n"
        "-------------------------------\n"
        f"Ім'я: {lead.get('name','')}\n"
        f"Телефон: {lead.get('phone','')}\n"
        + (f"Коментар: {lead.get('comment','')}\n" if lead.get('comment') else "")
        + f"Час: {lead.get('created_at','')}\n"
    )


def build_callback_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(prefix="/callbacks", tags=["callbacks"])

    @router.post("", response_model=CallbackOut, status_code=status.HTTP_201_CREATED)
    async def create_callback(payload: CallbackIn):
        if not payload.consent:
            raise HTTPException(status_code=400, detail="Потрібна згода на обробку перс. даних")
        lead = {
            "id": str(uuid.uuid4()),
            "name": payload.name.strip(),
            "phone": payload.phone.strip(),
            "comment": (payload.comment or "").strip(),
            "consent": True,
            "status": "new",
            "notified_telegram": False,
            "notified_email": False,
            "created_at": _now_iso(),
        }

        # Try to notify per admin_settings (best-effort)
        try:
            cfg = await db.admin_settings.find_one({"_id": ADMIN_SETTINGS_ID}) or {}
            channel = (cfg.get("channel") or "none").lower()
            if channel in ("telegram", "both"):
                ok = await _send_telegram(
                    bot_token=cfg.get("telegram_bot_token") or "",
                    chat_id=cfg.get("telegram_chat_id") or "",
                    text=_format_lead_text(lead),
                )
                lead["notified_telegram"] = ok
            if channel in ("email", "both"):
                ok = await _send_email(
                    cfg,
                    subject="Нова заявка на дзвінок — TAMIS АГРО",
                    body=_format_lead_text_plain(lead),
                )
                lead["notified_email"] = ok
        except Exception as e:
            logger.warning(f"[callback] notification phase failed: {e}")

        await db.callback_requests.insert_one(dict(lead))
        lead.pop("_id", None)
        return CallbackOut(**lead)

    return router
