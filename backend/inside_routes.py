"""
Inside Tabs routes — TAMIS АГРО.

Повністю-керована з адмінки секція «Зазирни всередину» на сторінці
/cultures (та потенційно інших). Кожен пункт (Bacillus thuringiensis,
Trichoderma, тощо) — це окремий запис у колекції `inside_tabs`.
Кількість пунктів необмежена.

Public:
  GET    /api/inside-tabs                    — список активних (sorted by order)
  GET    /api/inside-tabs/meta               — заголовок секції (title1, title2)

Admin (Bearer JWT, role=admin):
  GET    /api/admin/inside-tabs              — повний список
  POST   /api/admin/inside-tabs              — створити
  PATCH  /api/admin/inside-tabs/{id}         — оновити
  DELETE /api/admin/inside-tabs/{id}         — видалити
  PUT    /api/admin/inside-tabs/reorder      — масовий reorder (ids[])
  GET    /api/admin/inside-tabs/meta         — meta-документ секції
  PUT    /api/admin/inside-tabs/meta         — оновити meta
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
class InsideTab(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    slug: str
    label: str                       # текст на кнопці табу
    title: str = ""                  # заголовок під вкладкою (h3)
    description: str = ""            # параграф опису (підтримує \n)
    image_url: str = ""              # картинка, що показується справа
    image_alt: str = ""
    accent_color: str = ""           # опц. колір активної таб-кнопки (HEX). Якщо порожній — дефолт
    is_active: bool = True
    order: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class InsideTabCreate(BaseModel):
    label: str = Field(min_length=1)
    slug: Optional[str] = None
    title: str = ""
    description: str = ""
    image_url: str = ""
    image_alt: str = ""
    accent_color: str = ""
    is_active: bool = True
    order: Optional[int] = None


class InsideTabPatch(BaseModel):
    label: Optional[str] = None
    slug: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    image_alt: Optional[str] = None
    accent_color: Optional[str] = None
    is_active: Optional[bool] = None
    order: Optional[int] = None


class InsideTabReorder(BaseModel):
    ids: List[str]


class InsideMeta(BaseModel):
    model_config = ConfigDict(extra="ignore")
    title1: str = "Зазирни"
    title2: str = "всередину"
    updated_at: Optional[str] = None


class InsideMetaUpdate(BaseModel):
    title1: Optional[str] = None
    title2: Optional[str] = None


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
    return base or f"tab-{uuid.uuid4().hex[:6]}"


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
DEFAULT_TABS = [
    {
        "slug": "bacillus-thuringiensis",
        "label": "Bacillus thuringiensis",
        "title": "Біологічний інсектицид №1 у світі",
        "description": (
            "Природна бактерія, яка знищує шкідників зсередини – личинки совки, "
            "молі та листокрутки перестають живитися протягом кількох годин "
            "після контакту. Діє точково: вражає тільки цільових шкідників, "
            "не чіпає бджіл, сонечок та інших корисних комах.\n"
            "Повністю розкладається в ґрунті без токсичних залишків."
        ),
        "image_url": "/inside-bacillus.webp",
        "image_alt": "Bacillus thuringiensis",
        "accent_color": "",
    },
    {
        "slug": "trichoderma",
        "label": "Trichoderma",
        "title": "Гриб-антагоніст для захисту ґрунту",
        "description": (
            "Trichoderma пригнічує патогенні гриби (фузаріум, пітіум, ризоктонію) "
            "й одночасно стимулює ріст коренів. Виділяє ферменти, що розкладають "
            "органіку та підвищують доступність елементів живлення."
        ),
        "image_url": "/inside-bacillus.webp",
        "image_alt": "Trichoderma",
        "accent_color": "",
    },
    {
        "slug": "azotfiksuyuchi-bakterii",
        "label": "Азотфіксуючі бактерії",
        "title": "Азот без витрат на хімію",
        "description": (
            "Бульбочкові й вільноживучі бактерії перетворюють атмосферний азот "
            "на доступну для рослин форму. Економить до 30% дози мінеральних "
            "добрив без втрати врожайності."
        ),
        "image_url": "/inside-bacillus.webp",
        "image_alt": "Азотфіксуючі бактерії",
        "accent_color": "",
    },
    {
        "slug": "humaty",
        "label": "Гумати",
        "title": "Активатор ґрунту та антистресант",
        "description": (
            "Гумати посилюють кореневу систему, поліпшують структуру ґрунту, "
            "зв'язують важкі метали. Працюють як «активатор» для решти "
            "біопрепаратів у баковій суміші."
        ),
        "image_url": "/inside-bacillus.webp",
        "image_alt": "Гумати",
        "accent_color": "",
    },
]


async def seed_inside_tabs_if_empty(db: AsyncIOMotorDatabase) -> None:
    """Idempotent seed — створює дефолтні таби та meta-документ якщо порожньо."""
    try:
        count = await db.inside_tabs.count_documents({})
        if count == 0:
            now_iso = datetime.now(timezone.utc).isoformat()
            docs = []
            for i, it in enumerate(DEFAULT_TABS):
                docs.append({
                    "id": str(uuid.uuid4()),
                    "slug": it["slug"],
                    "label": it["label"],
                    "title": it["title"],
                    "description": it["description"],
                    "image_url": it["image_url"],
                    "image_alt": it["image_alt"],
                    "accent_color": it.get("accent_color", ""),
                    "is_active": True,
                    "order": i,
                    "created_at": now_iso,
                    "updated_at": now_iso,
                })
            await db.inside_tabs.insert_many(docs)
            logger.info(f"[seed] inside_tabs: inserted {len(docs)} default tabs")

        # meta singleton
        meta = await db.inside_meta.find_one({"_id": "main"})
        if not meta:
            now_iso = datetime.now(timezone.utc).isoformat()
            await db.inside_meta.insert_one({
                "_id": "main",
                "title1": "Зазирни",
                "title2": "всередину",
                "updated_at": now_iso,
            })
            logger.info("[seed] inside_meta: created default")
    except Exception as e:
        logger.warning(f"[seed] inside_tabs skipped: {e}")


def build_inside_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(tags=["inside-tabs"])

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
            exists = await db.inside_tabs.find_one(q, {"_id": 0, "id": 1})
            if not exists:
                return slug
            slug = f"{base_slug}-{suffix}"
            suffix += 1

    async def _read_meta_doc() -> dict:
        doc = await db.inside_meta.find_one({"_id": "main"})
        if not doc:
            return {"title1": "Зазирни", "title2": "всередину", "updated_at": None}
        doc.pop("_id", None)
        return doc

    # ===== Public =====
    @router.get("/inside-tabs", response_model=List[InsideTab])
    async def list_public():
        cursor = db.inside_tabs.find(
            {"is_active": True}, {"_id": 0}
        ).sort([("order", 1), ("created_at", 1)])
        items = await cursor.to_list(length=500)
        return [InsideTab(**it) for it in items]

    @router.get("/inside-tabs/meta", response_model=InsideMeta)
    async def get_meta_public():
        return InsideMeta(**await _read_meta_doc())

    # ===== Admin =====
    @router.get("/admin/inside-tabs", response_model=List[InsideTab])
    async def list_admin(_user=Depends(admin_user)):
        cursor = db.inside_tabs.find({}, {"_id": 0}).sort(
            [("order", 1), ("created_at", 1)]
        )
        items = await cursor.to_list(length=500)
        return [InsideTab(**it) for it in items]

    @router.post("/admin/inside-tabs", response_model=InsideTab)
    async def create_item(payload: InsideTabCreate, _user=Depends(admin_user)):
        now_iso = datetime.now(timezone.utc).isoformat()

        slug = payload.slug.strip() if payload.slug else _slugify(payload.label)
        slug = _slugify(slug)
        slug = await _unique_slug(slug)

        if payload.order is None:
            max_doc = await db.inside_tabs.find_one(
                {}, {"_id": 0, "order": 1}, sort=[("order", -1)]
            )
            next_order = (max_doc or {}).get("order", -1) + 1
        else:
            next_order = payload.order

        doc = {
            "id": str(uuid.uuid4()),
            "slug": slug,
            "label": payload.label.strip(),
            "title": (payload.title or "").strip(),
            "description": (payload.description or "").strip(),
            "image_url": (payload.image_url or "").strip(),
            "image_alt": (payload.image_alt or "").strip(),
            "accent_color": (payload.accent_color or "").strip(),
            "is_active": bool(payload.is_active),
            "order": next_order,
            "created_at": now_iso,
            "updated_at": now_iso,
        }
        await db.inside_tabs.insert_one(doc)
        return InsideTab(**_strip_id(doc))

    @router.patch("/admin/inside-tabs/{item_id}", response_model=InsideTab)
    async def patch_item(item_id: str, payload: InsideTabPatch, _user=Depends(admin_user)):
        data = payload.model_dump(exclude_none=True)
        if not data:
            raise HTTPException(status_code=400, detail="Нічого оновлювати")

        existing = await db.inside_tabs.find_one({"id": item_id}, {"_id": 0})
        if not existing:
            raise HTTPException(status_code=404, detail="Пункт не знайдено")

        now_iso = datetime.now(timezone.utc).isoformat()

        if "slug" in data:
            new_slug = _slugify(data["slug"] or existing.get("label", ""))
            new_slug = await _unique_slug(new_slug, exclude_id=item_id)
            data["slug"] = new_slug
        if "label" in data and isinstance(data["label"], str):
            data["label"] = data["label"].strip()
        if "title" in data and isinstance(data["title"], str):
            data["title"] = data["title"].strip()
        if "description" in data and isinstance(data["description"], str):
            data["description"] = data["description"].strip()
        if "image_url" in data and isinstance(data["image_url"], str):
            data["image_url"] = data["image_url"].strip()
        if "image_alt" in data and isinstance(data["image_alt"], str):
            data["image_alt"] = data["image_alt"].strip()
        if "accent_color" in data and isinstance(data["accent_color"], str):
            data["accent_color"] = data["accent_color"].strip()

        data["updated_at"] = now_iso
        await db.inside_tabs.update_one({"id": item_id}, {"$set": data})
        doc = await db.inside_tabs.find_one({"id": item_id}, {"_id": 0})
        return InsideTab(**doc)

    @router.delete("/admin/inside-tabs/{item_id}")
    async def delete_item(item_id: str, _user=Depends(admin_user)):
        r = await db.inside_tabs.delete_one({"id": item_id})
        if r.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Пункт не знайдено")
        return {"deleted": r.deleted_count}

    @router.put("/admin/inside-tabs/reorder", response_model=List[InsideTab])
    async def reorder(payload: InsideTabReorder, _user=Depends(admin_user)):
        now_iso = datetime.now(timezone.utc).isoformat()
        for idx, cid in enumerate(payload.ids):
            await db.inside_tabs.update_one(
                {"id": cid},
                {"$set": {"order": idx, "updated_at": now_iso}},
            )
        cursor = db.inside_tabs.find({}, {"_id": 0}).sort(
            [("order", 1), ("created_at", 1)]
        )
        items = await cursor.to_list(length=500)
        return [InsideTab(**it) for it in items]

    @router.get("/admin/inside-tabs/meta", response_model=InsideMeta)
    async def get_meta_admin(_user=Depends(admin_user)):
        return InsideMeta(**await _read_meta_doc())

    @router.put("/admin/inside-tabs/meta", response_model=InsideMeta)
    async def update_meta(payload: InsideMetaUpdate, _user=Depends(admin_user)):
        data = payload.model_dump(exclude_none=True)
        if not data:
            raise HTTPException(status_code=400, detail="Нічого оновлювати")
        now_iso = datetime.now(timezone.utc).isoformat()
        if "title1" in data and isinstance(data["title1"], str):
            data["title1"] = data["title1"].strip()
        if "title2" in data and isinstance(data["title2"], str):
            data["title2"] = data["title2"].strip()
        data["updated_at"] = now_iso
        await db.inside_meta.update_one(
            {"_id": "main"}, {"$set": data}, upsert=True
        )
        return InsideMeta(**await _read_meta_doc())

    return router
