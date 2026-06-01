"""
Site Policies — Cookie / Privacy / Terms of Use.

Public:
  GET  /api/policies                        — return all 3 policies (button_label + html_content)
  GET  /api/policies/{policy_type}          — single policy by type

Admin (Bearer JWT, role=admin):
  PUT  /api/admin/policies/{policy_type}    — update policy (button_label, title, html_content)

policy_type ∈ {"cookie", "privacy", "terms"}.

Storage: single document in `site_policies` collection with `_id = "main"`.
Idempotent seed on startup populates default Ukrainian texts if doc missing.
"""
from __future__ import annotations

import os
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any

import jwt
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret")
JWT_ALG = os.environ.get("JWT_ALG", "HS256")

POLICY_DOC_ID = "main"
POLICY_TYPES = ("cookie", "privacy", "terms")


# ===== Default content (Ukrainian) =====
DEFAULT_POLICIES: Dict[str, Dict[str, str]] = {
    "cookie": {
        "button_label": "Cookie Policy",
        "title": "Політика використання cookie",
        "html_content": (
            "<h2>Що таке cookie?</h2>"
            "<p>Cookie — це невеликі текстові файли, які зберігаються у вашому "
            "браузері під час відвідування сайту <strong>TAMIS АГРО</strong>. "
            "Вони допомагають нам забезпечити коректну роботу сайту, "
            "запам'ятати ваші налаштування та зробити ваш досвід зручнішим.</p>"
            "<h2>Які типи cookie ми використовуємо?</h2>"
            "<ul>"
            "<li><strong>Технічні (обов'язкові)</strong> — необхідні для роботи "
            "кошика, авторизації та оформлення замовлення. Без них сайт не функціонуватиме.</li>"
            "<li><strong>Аналітичні</strong> — анонімні дані про відвідування "
            "(сторінки, час, джерела трафіку). Допомагають нам покращувати контент.</li>"
            "<li><strong>Маркетингові</strong> — використовуються для показу релевантної "
            "реклами та оцінки ефективності кампаній.</li>"
            "</ul>"
            "<h2>Як керувати cookie?</h2>"
            "<p>Ви можете в будь-який момент видалити cookie через налаштування "
            "браузера або відмовитися від необов'язкових категорій під час "
            "першого відвідування сайту.</p>"
            "<h2>Зв'язок</h2>"
            "<p>З питань обробки даних звертайтесь: "
            "<a href=\"mailto:tamisagro@gmail.com\">tamisagro@gmail.com</a></p>"
        ),
    },
    "privacy": {
        "button_label": "Privacy Policy",
        "title": "Політика конфіденційності",
        "html_content": (
            "<h2>Загальні положення</h2>"
            "<p>ТОВ <strong>«TAMIS АГРО»</strong> поважає вашу приватність і "
            "зобов'язується захищати персональні дані відповідно до Закону України "
            "«Про захист персональних даних» та GDPR.</p>"
            "<h2>Які дані ми збираємо?</h2>"
            "<ul>"
            "<li>Контактні дані: ім'я, прізвище, телефон, email — для зв'язку та оформлення замовлень.</li>"
            "<li>Адреса доставки — для відправки товару.</li>"
            "<li>Технічні дані: IP, тип браузера, cookie — для аналітики та безпеки.</li>"
            "</ul>"
            "<h2>Як ми використовуємо дані?</h2>"
            "<ol>"
            "<li>Обробка та доставка замовлень.</li>"
            "<li>Зворотний зв'язок із клієнтом (дзвінки, email).</li>"
            "<li>Розсилка новин та акцій (тільки за вашою згодою).</li>"
            "<li>Покращення якості сервісу.</li>"
            "</ol>"
            "<h2>Передача даних третім сторонам</h2>"
            "<p>Ми передаємо ваші дані лише партнерам, необхідним для виконання "
            "замовлення: служби доставки (Нова Пошта, Укрпошта), платіжні провайдери. "
            "Дані не продаються та не передаються в маркетингових цілях.</p>"
            "<h2>Ваші права</h2>"
            "<p>Ви маєте право: запитати копію своїх даних, виправити їх, "
            "видалити обліковий запис, відкликати згоду на обробку. "
            "Звертайтесь: <a href=\"mailto:tamisagro@gmail.com\">tamisagro@gmail.com</a></p>"
        ),
    },
    "terms": {
        "button_label": "Terms of Use",
        "title": "Умови користування сайтом",
        "html_content": (
            "<h2>Прийняття умов</h2>"
            "<p>Використовуючи сайт <strong>TAMIS АГРО</strong>, ви погоджуєтесь "
            "із цими Умовами користування. Якщо ви не згодні — будь ласка, "
            "припиніть використання сайту.</p>"
            "<h2>Опис сервісу</h2>"
            "<p>Сайт надає можливість ознайомитися з каталогом агро-продукції, "
            "оформити замовлення, отримати консультацію та інформацію щодо "
            "сільськогосподарських культур.</p>"
            "<h2>Реєстрація та обліковий запис</h2>"
            "<ul>"
            "<li>Користувач зобов'язаний надавати правдиві дані під час реєстрації.</li>"
            "<li>Збереження пароля — відповідальність користувача.</li>"
            "<li>Адміністрація має право заблокувати акаунт у разі порушення Умов.</li>"
            "</ul>"
            "<h2>Замовлення та оплата</h2>"
            "<ol>"
            "<li>Ціни вказані в гривнях з ПДВ.</li>"
            "<li>Замовлення вважається підтвердженим після зв'язку менеджера.</li>"
            "<li>Доставка здійснюється згідно з тарифами обраного перевізника.</li>"
            "</ol>"
            "<h2>Інтелектуальна власність</h2>"
            "<p>Усі матеріали сайту (тексти, фото, логотипи) є власністю "
            "TAMIS АГРО або використовуються за ліцензією. Копіювання без "
            "дозволу заборонено.</p>"
            "<h2>Обмеження відповідальності</h2>"
            "<p>Сайт надається «як є». Ми не несемо відповідальності за "
            "тимчасову недоступність, помилки в описах товарів чи дії третіх сторін.</p>"
            "<h2>Контакти</h2>"
            "<p>З питань щодо Умов: <a href=\"mailto:tamisagro@gmail.com\">tamisagro@gmail.com</a></p>"
        ),
    },
}


# ===== Pydantic models =====
class PolicyOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    type: str
    button_label: str
    title: str
    html_content: str
    updated_at: Optional[str] = None


class PolicyUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    button_label: Optional[str] = Field(default=None, max_length=120)
    title: Optional[str] = Field(default=None, max_length=300)
    html_content: Optional[str] = None


# ===== JWT util =====
def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail=f"Невалідний токен: {e}") from None


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _build_policy_out(policy_type: str, data: Dict[str, Any]) -> PolicyOut:
    defaults = DEFAULT_POLICIES[policy_type]
    return PolicyOut(
        type=policy_type,
        button_label=data.get("button_label") or defaults["button_label"],
        title=data.get("title") or defaults["title"],
        html_content=data.get("html_content") if data.get("html_content") is not None
        else defaults["html_content"],
        updated_at=data.get("updated_at"),
    )


# ===== Seed =====
async def seed_policies_if_empty(db: AsyncIOMotorDatabase) -> None:
    """Idempotent: insert default policies if doc is missing or any policy is empty."""
    existing = await db.site_policies.find_one({"_id": POLICY_DOC_ID})
    if existing:
        # Backfill any missing policy types (e.g. after schema upgrade).
        updates: Dict[str, Any] = {}
        for ptype in POLICY_TYPES:
            if not isinstance(existing.get(ptype), dict):
                updates[ptype] = {**DEFAULT_POLICIES[ptype], "updated_at": _now_iso()}
        if updates:
            await db.site_policies.update_one(
                {"_id": POLICY_DOC_ID},
                {"$set": updates},
            )
            logger.info(f"[seed] site_policies: backfilled {list(updates.keys())}")
        return

    doc = {"_id": POLICY_DOC_ID}
    for ptype in POLICY_TYPES:
        doc[ptype] = {**DEFAULT_POLICIES[ptype], "updated_at": _now_iso()}
    await db.site_policies.insert_one(doc)
    logger.info("[seed] site_policies: inserted default policies (cookie, privacy, terms)")


# ===== Router =====
def build_policies_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(tags=["policies"])

    async def admin_user(authorization: Optional[str] = Header(default=None)) -> dict:
        if not authorization or not authorization.lower().startswith("bearer "):
            raise HTTPException(status_code=401, detail="Не авторизовано")
        token = authorization.split(" ", 1)[1].strip()
        payload = _decode_token(token)
        uid = payload.get("sub")
        if not uid:
            raise HTTPException(status_code=401, detail="Невалідний токен")
        user = await db.users.find_one({"id": uid}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Користувача не знайдено")
        if user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Доступ лише для адміністраторів")
        return user

    async def _load_doc() -> Dict[str, Any]:
        doc = await db.site_policies.find_one({"_id": POLICY_DOC_ID})
        if not doc:
            await seed_policies_if_empty(db)
            doc = await db.site_policies.find_one({"_id": POLICY_DOC_ID}) or {}
        return doc

    # ============ PUBLIC ============
    @router.get("/policies")
    async def list_policies():
        """Return all 3 policies for site-wide use (footer, modals, cookie banner)."""
        doc = await _load_doc()
        items = []
        for ptype in POLICY_TYPES:
            items.append(_build_policy_out(ptype, doc.get(ptype) or {}).model_dump())
        return {"items": items}

    @router.get("/policies/{policy_type}", response_model=PolicyOut)
    async def get_policy(policy_type: str):
        if policy_type not in POLICY_TYPES:
            raise HTTPException(status_code=404, detail="Невідомий тип політики")
        doc = await _load_doc()
        return _build_policy_out(policy_type, doc.get(policy_type) or {})

    # ============ ADMIN ============
    @router.get("/admin/policies")
    async def list_policies_admin(_user=Depends(admin_user)):
        doc = await _load_doc()
        items = []
        for ptype in POLICY_TYPES:
            items.append(_build_policy_out(ptype, doc.get(ptype) or {}).model_dump())
        return {"items": items}

    @router.put("/admin/policies/{policy_type}", response_model=PolicyOut)
    async def update_policy(
        policy_type: str,
        payload: PolicyUpdate,
        _user=Depends(admin_user),
    ):
        if policy_type not in POLICY_TYPES:
            raise HTTPException(status_code=404, detail="Невідомий тип політики")

        doc = await _load_doc()
        current = doc.get(policy_type) or {}
        defaults = DEFAULT_POLICIES[policy_type]

        button_label = (
            (payload.button_label or "").strip()
            or current.get("button_label")
            or defaults["button_label"]
        )
        title = (
            (payload.title or "").strip()
            or current.get("title")
            or defaults["title"]
        )
        # html_content allow empty string only if explicit
        if payload.html_content is None:
            html_content = current.get("html_content", defaults["html_content"])
        else:
            html_content = payload.html_content

        new_block = {
            "button_label": button_label,
            "title": title,
            "html_content": html_content,
            "updated_at": _now_iso(),
        }
        await db.site_policies.update_one(
            {"_id": POLICY_DOC_ID},
            {"$set": {policy_type: new_block}},
            upsert=True,
        )
        return _build_policy_out(policy_type, new_block)

    return router
