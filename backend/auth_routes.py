"""
Auth API — реєстрація, логін, отримання поточного користувача.

Стек:
  • bcrypt — хеш паролів (passlib[bcrypt])
  • PyJWT  — JWT-токени, ALGO=HS256, експір 30 днів
  • MongoDB колекція `users`

Клієнт зберігає JWT у localStorage ("tamis-agro-auth-token-v1")
і передає в заголовку `Authorization: Bearer <token>` у захищені запити.

Коли користувач робить реєстрацію — його session_id (той самий, що у
кошику/профілі) автоматично прив'язується до created user через поле
`session_ids`, щоб ми могли в майбутньому об'єднати дані гостя з акаунтом.

Endpoints:
  POST  /api/auth/register   { email, password, firstName, lastName, phone? }
  POST  /api/auth/login      { email, password }     → { token, user }
  GET   /api/auth/me         (Bearer)                → { user }
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Optional
import uuid

import jwt
import bcrypt
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from motor.motor_asyncio import AsyncIOMotorDatabase

# REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
# (для id_token flow редіректи не використовуються — лише верифікація токена)
from google.oauth2 import id_token as google_id_token  # type: ignore
from google.auth.transport import requests as google_requests  # type: ignore


JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret")
JWT_ALG = os.environ.get("JWT_ALG", "HS256")
JWT_EXPIRES_DAYS = int(os.environ.get("JWT_EXPIRES_DAYS", "30") or "30")


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=200)
    firstName: str = Field(min_length=1, max_length=80)
    lastName: str = Field(min_length=1, max_length=80)
    phone: Optional[str] = Field(default=None, max_length=40)
    session_id: Optional[str] = Field(default=None, description="session_id гостя — для злиття даних")


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)
    session_id: Optional[str] = None


class GoogleAuthIn(BaseModel):
    credential: str = Field(default="", description="Google id_token (JWT) from GIS")
    session_id: Optional[str] = None


class UserOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    firstName: str
    lastName: str
    phone: str = ""
    role: str = "user"


class AuthOut(BaseModel):
    token: str
    user: UserOut


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def _issue_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "iat": int(_now().timestamp()),
        "exp": int((_now() + timedelta(days=JWT_EXPIRES_DAYS)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Сесія прострочена. Увійдіть повторно.")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Невалідний токен")


def _user_to_out(doc: dict) -> UserOut:
    return UserOut(
        id=doc["id"],
        email=doc.get("email", ""),
        firstName=doc.get("firstName", ""),
        lastName=doc.get("lastName", ""),
        phone=doc.get("phone", "") or "",
        role=doc.get("role", "user") or "user",
    )


def build_auth_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(prefix="/auth", tags=["auth"])

    async def current_user(authorization: Optional[str] = Header(default=None)) -> dict:
        if not authorization or not authorization.lower().startswith("bearer "):
            raise HTTPException(status_code=401, detail="Не авторизовано")
        token = authorization.split(" ", 1)[1].strip()
        payload = _decode_token(token)
        uid = payload.get("sub")
        if not uid:
            raise HTTPException(status_code=401, detail="Невалідний токен")
        doc = await db.users.find_one({"id": uid}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=401, detail="Користувача не знайдено")
        return doc

    @router.post("/register", response_model=AuthOut)
    async def register(payload: RegisterIn):
        email = payload.email.lower().strip()
        existing = await db.users.find_one({"email": email})
        if existing:
            raise HTTPException(status_code=409, detail="Користувач з такою поштою вже існує")
        uid = str(uuid.uuid4())
        doc = {
            "id": uid,
            "email": email,
            "password_hash": _hash_password(payload.password),
            "firstName": payload.firstName.strip(),
            "lastName": payload.lastName.strip(),
            "phone": (payload.phone or "").strip(),
            "session_ids": [payload.session_id] if payload.session_id else [],
            "created_at": _now().isoformat(),
            "updated_at": _now().isoformat(),
        }
        await db.users.insert_one(dict(doc))
        # Зв'язуємо session_id з користувачем — при наступних запитах
        # бачимо, що цей session_id належить конкретному акаунту.
        token = _issue_token(uid)
        return AuthOut(token=token, user=_user_to_out(doc))

    @router.post("/login", response_model=AuthOut)
    async def login(payload: LoginIn):
        email = payload.email.lower().strip()
        doc = await db.users.find_one({"email": email})
        if not doc or not _verify_password(payload.password, doc.get("password_hash", "")):
            raise HTTPException(status_code=401, detail="Невірний email або пароль")
        if payload.session_id and payload.session_id not in (doc.get("session_ids") or []):
            await db.users.update_one(
                {"id": doc["id"]},
                {"$push": {"session_ids": payload.session_id},
                 "$set": {"updated_at": _now().isoformat()}},
            )
        token = _issue_token(doc["id"])
        return AuthOut(token=token, user=_user_to_out(doc))

    @router.get("/me", response_model=UserOut)
    async def me(user=Depends(current_user)):
        return _user_to_out(user)

    # ===== Public Auth config (Google client_id from admin_settings) =====
    @router.get("/config")
    async def auth_config():
        cfg = await db.admin_settings.find_one({"_id": "main"}) or {}
        return {
            "google_client_id": cfg.get("google_client_id", "") or "",
            "google_enabled": bool(cfg.get("google_enabled", False)),
        }

    # ===== Google Sign-In (id_token verification) =====
    @router.post("/google", response_model=AuthOut)
    async def google_login(payload: GoogleAuthIn):
        if not payload.credential or not payload.credential.strip():
            raise HTTPException(status_code=401, detail="Порожній Google credential")

        cfg = await db.admin_settings.find_one({"_id": "main"}) or {}
        client_id = (cfg.get("google_client_id") or "").strip()
        if not client_id:
            raise HTTPException(status_code=400, detail="Google авторизація не налаштована. Зверніться до адміністратора.")

        # Verify the id_token with Google
        try:
            info = google_id_token.verify_oauth2_token(
                payload.credential,
                google_requests.Request(),
                client_id,
                clock_skew_in_seconds=10,
            )
        except ValueError as e:
            raise HTTPException(status_code=401, detail=f"Невалідний Google токен: {e}")

        email = (info.get("email") or "").lower().strip()
        if not email or not info.get("email_verified", False):
            raise HTTPException(status_code=401, detail="Google акаунт без підтвердженого email")

        first_name = (info.get("given_name") or "").strip()
        last_name = (info.get("family_name") or "").strip()
        picture = info.get("picture") or ""
        sub = info.get("sub") or ""

        # Знаходимо або створюємо користувача
        doc = await db.users.find_one({"email": email})
        now_iso = _now().isoformat()
        if not doc:
            uid = str(uuid.uuid4())
            doc = {
                "id": uid,
                "email": email,
                "password_hash": "",  # порожньо — користувач прийшов через Google
                "firstName": first_name or "Користувач",
                "lastName": last_name or "",
                "phone": "",
                "role": "user",
                "google_sub": sub,
                "google_picture": picture,
                "session_ids": [payload.session_id] if payload.session_id else [],
                "created_at": now_iso,
                "updated_at": now_iso,
            }
            await db.users.insert_one(dict(doc))
        else:
            updates = {"updated_at": now_iso}
            if not doc.get("google_sub"):
                updates["google_sub"] = sub
            if picture and not doc.get("google_picture"):
                updates["google_picture"] = picture
            if first_name and not doc.get("firstName"):
                updates["firstName"] = first_name
            if last_name and not doc.get("lastName"):
                updates["lastName"] = last_name
            push_ops = {}
            if payload.session_id and payload.session_id not in (doc.get("session_ids") or []):
                push_ops = {"$push": {"session_ids": payload.session_id}}
            await db.users.update_one({"id": doc["id"]}, {"$set": updates, **push_ops})
            doc = await db.users.find_one({"id": doc["id"]})

        token = _issue_token(doc["id"])
        return AuthOut(token=token, user=_user_to_out(doc))

    return router
