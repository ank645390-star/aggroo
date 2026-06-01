"""
Profile API — серверне збереження особистих даних користувача.

Сховище: MongoDB collection `profiles`, ключ = session_id (той же,
що в кошику, зберігається в локальному сховищі браузера).

Routes:
    GET    /api/profile/{session_id}
    PUT    /api/profile/{session_id}                       — оновити поля
    POST   /api/profile/{session_id}/password              — зміна пароля
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field, EmailStr
from motor.motor_asyncio import AsyncIOMotorDatabase


DEFAULT_PROFILE = {
    "firstName": "Іван",
    "lastName": "Петренко",
    "email": "i.petrenko@gmail.com",
    "phone": "+380 (50) 937 56 54",
    "password": "12345678",
}


class ProfileOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    session_id: str
    firstName: str
    lastName: str
    email: str
    phone: str


class ProfileUpdate(BaseModel):
    firstName: Optional[str] = Field(default=None, min_length=1, max_length=80)
    lastName: Optional[str] = Field(default=None, min_length=1, max_length=80)
    # Email — опціональне поле; приймаємо як звичайний str і дозволяємо
    # порожній рядок, щоб користувач міг зберегти профіль без e-mail.
    # Валідація формату виконується на фронті.
    email: Optional[str] = Field(default=None, max_length=120)
    phone: Optional[str] = Field(default=None, min_length=10, max_length=40)


class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=200)
    new_password: str = Field(min_length=6, max_length=200)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _get_or_create(db: AsyncIOMotorDatabase, sid: str) -> dict:
    doc = await db.profiles.find_one({"session_id": sid}, {"_id": 0})
    if doc is not None:
        # бекворд для старих записів без пароля
        if "password" not in doc:
            doc["password"] = DEFAULT_PROFILE["password"]
            await db.profiles.update_one(
                {"session_id": sid}, {"$set": {"password": doc["password"]}}
            )
        return doc
    fresh = {
        "session_id": sid,
        **DEFAULT_PROFILE,
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    await db.profiles.insert_one(dict(fresh))
    return fresh


def _public(doc: dict) -> ProfileOut:
    return ProfileOut(
        session_id=doc["session_id"],
        firstName=doc.get("firstName", ""),
        lastName=doc.get("lastName", ""),
        email=doc.get("email", ""),
        phone=doc.get("phone", ""),
    )


def build_profile_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(prefix="/profile", tags=["profile"])

    @router.get("/{session_id}", response_model=ProfileOut)
    async def get_profile(session_id: str):
        if not session_id:
            raise HTTPException(status_code=400, detail="session_id is required")
        doc = await _get_or_create(db, session_id)
        return _public(doc)

    @router.put("/{session_id}", response_model=ProfileOut)
    async def update_profile(session_id: str, payload: ProfileUpdate):
        if not session_id:
            raise HTTPException(status_code=400, detail="session_id is required")
        doc = await _get_or_create(db, session_id)
        # exclude_unset=True зберігає семантику PATCH — оновлюються лише
        # явно надіслані поля. Для email допускаємо порожній рядок (опціональне поле).
        raw = payload.model_dump(exclude_unset=True)
        updates = {}
        for k, v in raw.items():
            if k == "email":
                # дозволяємо очистити email (передається як "" або None)
                updates[k] = v or ""
            elif v is not None:
                updates[k] = v
        if not updates:
            return _public(doc)
        updates["updated_at"] = _now_iso()
        await db.profiles.update_one({"session_id": session_id}, {"$set": updates})
        doc.update(updates)
        return _public(doc)

    @router.post("/{session_id}/password", response_model=ProfileOut)
    async def change_password(session_id: str, payload: PasswordChange):
        doc = await _get_or_create(db, session_id)
        if payload.current_password != doc.get("password", ""):
            raise HTTPException(status_code=400, detail="Поточний пароль введено невірно")
        if payload.new_password == payload.current_password:
            raise HTTPException(status_code=400, detail="Новий пароль повинен відрізнятися від поточного")
        await db.profiles.update_one(
            {"session_id": session_id},
            {"$set": {"password": payload.new_password, "updated_at": _now_iso()}},
        )
        return _public(doc)

    return router
