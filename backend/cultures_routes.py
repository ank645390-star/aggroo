"""
Cultures routes — TAMIS АГРО.

Повністю-керовані з адмінки картки культур для сторінки /cultures.

Public:
  GET    /api/cultures                — список активних карток (sorted by order)
  GET    /api/cultures/{slug}         — одна картка за slug

Admin (Bearer JWT, role=admin):
  GET    /api/admin/cultures          — повний список
  POST   /api/admin/cultures          — створити
  PATCH  /api/admin/cultures/{id}     — оновити
  DELETE /api/admin/cultures/{id}     — видалити
  PUT    /api/admin/cultures/reorder  — масово оновити порядок (ids[])
"""
from __future__ import annotations

import os
import re
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
class CultureItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    slug: str
    title: str
    problem_text: str = ""
    treatment_types: List[str] = []
    effective_for: List[str] = []
    image_url: str = ""
    image_alt: str = ""
    catalog_url: str = "/catalog"
    button_label: str = "Переглянути лінійку"
    is_active: bool = True
    is_default_open: bool = False
    order: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class CultureCreate(BaseModel):
    title: str = Field(min_length=1)
    slug: Optional[str] = None
    problem_text: str = ""
    treatment_types: List[str] = []
    effective_for: List[str] = []
    image_url: str = ""
    image_alt: str = ""
    catalog_url: str = "/catalog"
    button_label: str = "Переглянути лінійку"
    is_active: bool = True
    is_default_open: bool = False
    order: Optional[int] = None


class CulturePatch(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    problem_text: Optional[str] = None
    treatment_types: Optional[List[str]] = None
    effective_for: Optional[List[str]] = None
    image_url: Optional[str] = None
    image_alt: Optional[str] = None
    catalog_url: Optional[str] = None
    button_label: Optional[str] = None
    is_active: Optional[bool] = None
    is_default_open: Optional[bool] = None
    order: Optional[int] = None


class CultureReorder(BaseModel):
    ids: List[str]


# ===== Helpers =====
_SLUG_RE = re.compile(r"[^a-z0-9-]+")

_TRANSLIT = str.maketrans({
    "а": "a", "б": "b", "в": "v", "г": "h", "ґ": "g", "д": "d", "е": "e",
    "є": "ie", "ж": "zh", "з": "z", "и": "y", "і": "i", "ї": "i", "й": "i",
    "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r",
    "с": "s", "т": "t", "у": "u", "ф": "f", "х": "kh", "ц": "ts", "ч": "ch",
    "ш": "sh", "щ": "shch", "ь": "", "ю": "iu", "я": "ia", " ": "-", "_": "-",
})


def _slugify(value: str) -> str:
    base = (value or "").strip().lower().translate(_TRANSLIT)
    base = _SLUG_RE.sub("-", base)
    base = re.sub(r"-+", "-", base).strip("-")
    return base or f"culture-{uuid.uuid4().hex[:6]}"


def _strip_id(d: dict) -> dict:
    if d:
        d.pop("_id", None)
    return d


def _decode(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Невалідний токен")


# ===== Default seed =====
DEFAULT_CULTURES = [
    {
        "slug": "polovi",
        "title": "Польові культури",
        "problem_text": (
            "Совка на соняшнику, фузаріоз пшениці, попелиця на ріпаку — знайомі втрати кожного сезону. "
            "Наші інокулянти фіксують азот і підвищують засвоєння фосфору на 25-30%, а біоінсектициди "
            "знищують шкідників без періоду очікування перед збиранням."
        ),
        "treatment_types": ["інокулянти", "фунгіциди", "мікродобрива", "антистресанти"],
        "effective_for": ["Соняшник", "Пшениця", "Соя", "Кукурудза", "Ріпак", "Ячмінь"],
        "image_url": "/landscape-landscape-1@2x.png",
        "image_alt": "Польові культури",
        "catalog_url": "/catalog?category=polovi",
        "button_label": "Переглянути лінійку",
        "is_active": True,
        "is_default_open": True,
    },
    {
        "slug": "ovochevi",
        "title": "Овочеві культури",
        "problem_text": (
            "Біопрепарати для томатів, огірків, перцю, капусти та інших овочевих культур. "
            "Захист від фітофторозу, борошнистої роси, кореневих гнилей. "
            "Збільшення врожайності та подовження терміну зберігання."
        ),
        "treatment_types": ["біофунгіциди", "стимулятори", "інсектициди", "ґрунтові меліоранти"],
        "effective_for": ["Томати", "Огірки", "Перець", "Капуста", "Цибуля", "Морква"],
        "image_url": "/landscape-landscape-1@2x.png",
        "image_alt": "Овочеві культури",
        "catalog_url": "/catalog?category=ovochevi",
        "button_label": "Переглянути лінійку",
        "is_active": True,
        "is_default_open": False,
    },
    {
        "slug": "sad",
        "title": "Сад та ягоди",
        "problem_text": (
            "Парша яблуні, моніліоз кісточкових, кліщ на ягідниках — типові виклики саду. "
            "Біопрепарати TAMIS забезпечують комплексний захист протягом усього сезону без накопичення "
            "залишків у плодах."
        ),
        "treatment_types": ["біоінсектициди", "біофунгіциди", "регулятори росту", "хелати"],
        "effective_for": ["Яблуня", "Груша", "Слива", "Виноград", "Полуниця", "Малина"],
        "image_url": "/landscape-landscape-1@2x.png",
        "image_alt": "Сад та ягоди",
        "catalog_url": "/catalog?category=sad",
        "button_label": "Переглянути лінійку",
        "is_active": True,
        "is_default_open": False,
    },
]


async def seed_cultures_if_empty(db: AsyncIOMotorDatabase) -> None:
    """Idempotent seed — створює дефолтний набір лише якщо колекція порожня."""
    try:
        count = await db.cultures.count_documents({})
        if count == 0:
            now_iso = datetime.now(timezone.utc).isoformat()
            docs = []
            for i, it in enumerate(DEFAULT_CULTURES):
                docs.append({
                    "id": str(uuid.uuid4()),
                    "slug": it["slug"],
                    "title": it["title"],
                    "problem_text": it["problem_text"],
                    "treatment_types": it["treatment_types"],
                    "effective_for": it["effective_for"],
                    "image_url": it["image_url"],
                    "image_alt": it["image_alt"],
                    "catalog_url": it["catalog_url"],
                    "button_label": it["button_label"],
                    "is_active": it["is_active"],
                    "is_default_open": it["is_default_open"],
                    "order": i,
                    "created_at": now_iso,
                    "updated_at": now_iso,
                })
            await db.cultures.insert_many(docs)
            logger.info(f"[seed] cultures: inserted {len(docs)} default items")
    except Exception as e:
        logger.warning(f"[seed] cultures skipped: {e}")


def build_cultures_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(tags=["cultures"])

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

    async def _unique_slug(base_slug: str, exclude_id: Optional[str] = None) -> str:
        slug = base_slug
        suffix = 2
        while True:
            q = {"slug": slug}
            if exclude_id:
                q["id"] = {"$ne": exclude_id}
            exists = await db.cultures.find_one(q, {"_id": 0, "id": 1})
            if not exists:
                return slug
            slug = f"{base_slug}-{suffix}"
            suffix += 1

    # ===== Public =====
    @router.get("/cultures", response_model=List[CultureItem])
    async def list_public():
        cursor = db.cultures.find(
            {"is_active": True}, {"_id": 0}
        ).sort([("order", 1), ("created_at", 1)])
        items = await cursor.to_list(length=500)
        return [CultureItem(**it) for it in items]

    @router.get("/cultures/{slug}", response_model=CultureItem)
    async def get_one_public(slug: str):
        doc = await db.cultures.find_one(
            {"slug": slug, "is_active": True}, {"_id": 0}
        )
        if not doc:
            raise HTTPException(status_code=404, detail="Культура не знайдена")
        return CultureItem(**doc)

    # ===== Admin =====
    @router.get("/admin/cultures", response_model=List[CultureItem])
    async def list_admin(_user=Depends(admin_user)):
        cursor = db.cultures.find({}, {"_id": 0}).sort(
            [("order", 1), ("created_at", 1)]
        )
        items = await cursor.to_list(length=500)
        return [CultureItem(**it) for it in items]

    @router.post("/admin/cultures", response_model=CultureItem)
    async def create_item(payload: CultureCreate, _user=Depends(admin_user)):
        now_iso = datetime.now(timezone.utc).isoformat()

        # auto-generate slug if not provided / make unique
        slug = payload.slug.strip() if payload.slug else _slugify(payload.title)
        slug = _slugify(slug)
        slug = await _unique_slug(slug)

        # order
        if payload.order is None:
            max_doc = await db.cultures.find_one(
                {}, {"_id": 0, "order": 1}, sort=[("order", -1)]
            )
            next_order = (max_doc or {}).get("order", -1) + 1
        else:
            next_order = payload.order

        doc = {
            "id": str(uuid.uuid4()),
            "slug": slug,
            "title": payload.title.strip(),
            "problem_text": (payload.problem_text or "").strip(),
            "treatment_types": [t.strip() for t in payload.treatment_types if t and t.strip()],
            "effective_for": [t.strip() for t in payload.effective_for if t and t.strip()],
            "image_url": (payload.image_url or "").strip(),
            "image_alt": (payload.image_alt or "").strip(),
            "catalog_url": (payload.catalog_url or "/catalog").strip() or "/catalog",
            "button_label": (payload.button_label or "Переглянути лінійку").strip(),
            "is_active": bool(payload.is_active),
            "is_default_open": bool(payload.is_default_open),
            "order": next_order,
            "created_at": now_iso,
            "updated_at": now_iso,
        }

        # default-open is mutually exclusive — ensure only one is_default_open=True
        if doc["is_default_open"]:
            await db.cultures.update_many(
                {"is_default_open": True},
                {"$set": {"is_default_open": False, "updated_at": now_iso}},
            )

        await db.cultures.insert_one(doc)
        return CultureItem(**_strip_id(doc))

    @router.patch("/admin/cultures/{item_id}", response_model=CultureItem)
    async def patch_item(item_id: str, payload: CulturePatch, _user=Depends(admin_user)):
        data = payload.model_dump(exclude_none=True)
        if not data:
            raise HTTPException(status_code=400, detail="Нічого оновлювати")

        existing = await db.cultures.find_one({"id": item_id}, {"_id": 0})
        if not existing:
            raise HTTPException(status_code=404, detail="Культура не знайдена")

        now_iso = datetime.now(timezone.utc).isoformat()

        if "slug" in data:
            new_slug = _slugify(data["slug"] or existing.get("title", ""))
            new_slug = await _unique_slug(new_slug, exclude_id=item_id)
            data["slug"] = new_slug

        if "title" in data and isinstance(data["title"], str):
            data["title"] = data["title"].strip()
        if "problem_text" in data and isinstance(data["problem_text"], str):
            data["problem_text"] = data["problem_text"].strip()
        if "treatment_types" in data and isinstance(data["treatment_types"], list):
            data["treatment_types"] = [t.strip() for t in data["treatment_types"] if t and t.strip()]
        if "effective_for" in data and isinstance(data["effective_for"], list):
            data["effective_for"] = [t.strip() for t in data["effective_for"] if t and t.strip()]
        if "catalog_url" in data and isinstance(data["catalog_url"], str):
            data["catalog_url"] = data["catalog_url"].strip() or "/catalog"
        if "button_label" in data and isinstance(data["button_label"], str):
            data["button_label"] = data["button_label"].strip() or "Переглянути лінійку"

        data["updated_at"] = now_iso

        if data.get("is_default_open") is True:
            await db.cultures.update_many(
                {"id": {"$ne": item_id}, "is_default_open": True},
                {"$set": {"is_default_open": False, "updated_at": now_iso}},
            )

        await db.cultures.update_one({"id": item_id}, {"$set": data})
        doc = await db.cultures.find_one({"id": item_id}, {"_id": 0})
        return CultureItem(**doc)

    @router.delete("/admin/cultures/{item_id}")
    async def delete_item(item_id: str, _user=Depends(admin_user)):
        r = await db.cultures.delete_one({"id": item_id})
        if r.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Культура не знайдена")
        return {"deleted": r.deleted_count}

    @router.put("/admin/cultures/reorder", response_model=List[CultureItem])
    async def reorder(payload: CultureReorder, _user=Depends(admin_user)):
        now_iso = datetime.now(timezone.utc).isoformat()
        for idx, cid in enumerate(payload.ids):
            await db.cultures.update_one(
                {"id": cid},
                {"$set": {"order": idx, "updated_at": now_iso}},
            )
        cursor = db.cultures.find({}, {"_id": 0}).sort(
            [("order", 1), ("created_at", 1)]
        )
        items = await cursor.to_list(length=500)
        return [CultureItem(**it) for it in items]

    return router
