"""
Admin auth dependency for sales module.

Reused JWT-bearer check that mirrors products/security.py and
admin_routes.admin_user — keeps a single source of truth for
role-based protection without circular imports.
"""
from __future__ import annotations

import os
from typing import Optional

import jwt
from fastapi import Header, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret")
JWT_ALG = os.environ.get("JWT_ALG", "HS256")


def _decode(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Невалідний токен")


def build_admin_dep(db: AsyncIOMotorDatabase):
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

    return admin_user
