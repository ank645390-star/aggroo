"""
Utility helpers used across products submodules.
"""
from __future__ import annotations

import re
from typing import Any, Dict, Optional

from slugify import slugify

from .models import ProductOut, TabBlock


DEFAULT_TABS = {
    "dosage":         {"title": "Дозування",     "intro": "", "items": [], "note": ""},
    "composition":    {"title": "Склад",          "intro": "", "items": [], "note": ""},
    "compatibility":  {"title": "Сумісність",     "intro": "", "items": [], "note": ""},
    "specs":          {"title": "Характеристика", "intro": "", "items": [], "note": ""},
}

DEFAULT_DESCRIPTION = {
    "hero_image": "/tree.webp",
    "title_line1": "Відновлення",
    "title_line2": "після стресу.",
    "title_subline": "Стабільний врожай.",
    "chips": [],
    "problem": {"title": "Проблема", "intro_html": "", "outro_html": ""},
    "solution": {"title": "Рішення", "intro_html": "", "outro_html": ""},
}


def strip_mongo_id(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if doc is None:
        return None
    doc.pop("_id", None)
    return doc


def ensure_tabs(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure all 4 tab blocks + description exist with sensible defaults."""
    for key, default in DEFAULT_TABS.items():
        if not doc.get(key):
            doc[key] = dict(default)
        else:
            block = doc[key]
            for k, v in default.items():
                block.setdefault(k, v)
    # description block (deep defaults)
    desc = doc.get("description")
    if not isinstance(desc, dict):
        desc = {}
    for k, v in DEFAULT_DESCRIPTION.items():
        if k in ("problem", "solution"):
            sub = desc.get(k)
            if not isinstance(sub, dict):
                sub = {}
            for sk, sv in v.items():
                sub.setdefault(sk, sv)
            desc[k] = sub
        elif k == "chips":
            chips = desc.get(k)
            if not isinstance(chips, list):
                chips = []
            desc[k] = chips
        else:
            desc.setdefault(k, v)
    doc["description"] = desc
    return doc


def to_product_out(doc: Dict[str, Any]) -> ProductOut:
    doc = strip_mongo_id(dict(doc)) or {}
    ensure_tabs(doc)
    return ProductOut(**doc)


def text_to_slug(value: str) -> str:
    return slugify(value or "", lowercase=True, max_length=80) or ""


async def unique_slug(db, base: str, exclude_id: Optional[str] = None) -> str:
    """Resolve a slug that is unique within the products collection."""
    base = text_to_slug(base) or "product"
    candidate = base
    n = 1
    while True:
        q: Dict[str, Any] = {"slug": candidate}
        if exclude_id:
            q["id"] = {"$ne": exclude_id}
        exists = await db.products.find_one(q, {"_id": 0, "id": 1})
        if not exists:
            return candidate
        n += 1
        candidate = f"{base}-{n}"


def sanitize_tab(value: Any) -> Dict[str, Any]:
    """Normalize a TabBlock-like dict (also accept Pydantic models)."""
    if value is None:
        return {}
    if hasattr(value, "model_dump"):
        value = value.model_dump()
    if isinstance(value, dict):
        items = value.get("items") or []
        norm_items = []
        for it in items:
            if hasattr(it, "model_dump"):
                it = it.model_dump()
            if isinstance(it, dict):
                norm_items.append({"text": str(it.get("text", ""))})
            elif isinstance(it, str):
                norm_items.append({"text": it})
        return {
            "title": str(value.get("title", "")),
            "intro": str(value.get("intro", "")),
            "items": norm_items,
            "note": str(value.get("note", "")),
        }
    return {}


def sanitize_description(value: Any) -> Dict[str, Any]:
    """Normalize a DescriptionBlock-like dict for storage."""
    if value is None:
        return dict(DEFAULT_DESCRIPTION)
    if hasattr(value, "model_dump"):
        value = value.model_dump()
    if not isinstance(value, dict):
        return dict(DEFAULT_DESCRIPTION)

    def _sub(b: Any, default_title: str) -> Dict[str, str]:
        if b is None:
            return {"title": default_title, "intro_html": "", "outro_html": ""}
        if hasattr(b, "model_dump"):
            b = b.model_dump()
        if not isinstance(b, dict):
            return {"title": default_title, "intro_html": "", "outro_html": ""}
        return {
            "title": str(b.get("title", default_title)),
            "intro_html": str(b.get("intro_html", "")),
            "outro_html": str(b.get("outro_html", "")),
        }

    chips_raw = value.get("chips") or []
    chips: list = []
    if isinstance(chips_raw, list):
        for c in chips_raw[:3]:
            if hasattr(c, "model_dump"):
                c = c.model_dump()
            if isinstance(c, dict):
                chips.append({
                    "icon": str(c.get("icon", "lightning")),
                    "title": str(c.get("title", "")),
                    "body": str(c.get("body", "")),
                    "variant": str(c.get("variant", "green")),
                })

    return {
        "hero_image":   str(value.get("hero_image", DEFAULT_DESCRIPTION["hero_image"])),
        "title_line1":  str(value.get("title_line1", DEFAULT_DESCRIPTION["title_line1"])),
        "title_line2":  str(value.get("title_line2", DEFAULT_DESCRIPTION["title_line2"])),
        "title_subline": str(value.get("title_subline", DEFAULT_DESCRIPTION["title_subline"])),
        "chips": chips,
        "problem":  _sub(value.get("problem"),  "Проблема"),
        "solution": _sub(value.get("solution"), "Рішення"),
    }


WORD_RE = re.compile(r"\w+", re.UNICODE)



# ====== Rating recompute helpers ======
async def recompute_product_rating(db, product_slug: Optional[str] = None,
                                   product_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Перерахувати ефективну `rating` / `reviews` товару на основі:
      • admin-baseline:  `manual_rating` × `manual_reviews` віртуальних голосів
      • реальних відгуків у db.reviews (тільки published).

    Зважене середнє:
        effective_rating = (manual_rating * manual_reviews + Σ real_ratings)
                         / (manual_reviews + count_real)
    Якщо немає ні реальних, ні manual — лишається попереднє значення.

    Викликається після CRUD у /admin/reviews та на startup-міграції.
    Повертає оновлений product-документ або None, якщо товар не знайдено.
    """
    q: Dict[str, Any] = {}
    if product_id:
        q["id"] = product_id
    elif product_slug:
        q["slug"] = product_slug
    else:
        return None
    product = await db.products.find_one(q, {"_id": 0})
    if not product:
        return None
    slug = product.get("slug")

    manual_rating = float(product.get("manual_rating") or product.get("rating") or 0)
    manual_reviews = int(product.get("manual_reviews") or 0)

    # реальні відгуки — тільки опубліковані для цього product_slug
    real_sum = 0.0
    real_count = 0
    if slug:
        cursor = db.reviews.find(
            {"product_slug": slug, "published": True},
            {"_id": 0, "rating": 1},
        )
        async for r in cursor:
            try:
                real_sum += float(r.get("rating", 5))
                real_count += 1
            except (TypeError, ValueError):
                continue

    total_count = manual_reviews + real_count
    if total_count > 0:
        eff_rating = (manual_rating * manual_reviews + real_sum) / total_count
    else:
        eff_rating = manual_rating or float(product.get("rating") or 0)

    eff_rating = max(0.0, min(5.0, round(eff_rating, 1)))

    await db.products.update_one(
        {"id": product["id"]},
        {"$set": {
            "rating": eff_rating,
            "reviews": total_count,
        }},
    )
    product["rating"] = eff_rating
    product["reviews"] = total_count
    return product


async def recompute_all_products_ratings(db) -> int:
    """One-shot migration helper — перерахувати рейтинги всіх товарів."""
    n = 0
    cursor = db.products.find({}, {"_id": 0, "id": 1, "slug": 1})
    async for p in cursor:
        await recompute_product_rating(db, product_id=p.get("id"))
        n += 1
    return n
