"""
Discounts API — гнучка система знижок з керуванням через адмінку.

Storage: MongoDB collection `discount_rules`.

Правило (DiscountRule) має:
    • id                — uuid
    • name              — назва для адмінки
    • description       — короткий опис (опціонально)
    • type              — один із:
          cart_volume_l       — за сумарним обсягом у літрах усього кошика
          cart_quantity       — за загальною кількістю одиниць у кошику
          cart_subtotal       — за сумою (без знижки) усього кошика, грн
          category_volume_l   — за обсягом товарів конкретної категорії
          category_quantity   — за кількістю товарів конкретної категорії
          category_subtotal   — за сумою товарів конкретної категорії
    • threshold         — числовий поріг (>= для активації)
    • percent           — відсоток знижки 0–100
    • category_slug     — обов'язкове для типів category_*  (опціонально для cart_*)
    • active            — bool, чи правило застосовується
    • priority          — int, вища = пріоритетніша (для tie-break)
    • label             — людино-читана підказка, що показується в UI (наприклад "При купівлі 100 л")
    • created_at / updated_at

Алгоритм preview (apply_rules):
    1) Обчислити агрегати кошика: total_qty, total_volume_l, subtotal.
    2) Серед усіх eligible cart_* правил — взяти ОДНЕ з найбільшим discount.amount.
       Воно застосовується до повного subtotal.
    3) Для кожної категорії — серед eligible category_* правил, що відповідають
       цій категорії, взяти ОДНЕ з найбільшим discount.amount.
       Воно застосовується ЛИШЕ до товарів цієї категорії (sub_subtotal_cat).
    4) Загальна знижка = cart_discount + sum(category_discounts), capped at subtotal.
    5) Повернути applied_rules + всі активні правила з прогресом (для UX-підказок).

Routes:
    Public:
      GET  /api/discounts/active                        — активні правила (для відображення)
      POST /api/discounts/preview                       — preview знижки для кошика

    Admin (JWT admin):
      GET    /api/admin/discounts                       — список усіх (active + draft)
      POST   /api/admin/discounts                       — створити
      GET    /api/admin/discounts/{id}                  — отримати один
      PATCH  /api/admin/discounts/{id}                  — оновити
      DELETE /api/admin/discounts/{id}                  — видалити
"""
from __future__ import annotations

import re
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional, Literal, Dict, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator
from motor.motor_asyncio import AsyncIOMotorDatabase

from sales.security import build_admin_dep

logger = logging.getLogger(__name__)

RuleType = Literal[
    "cart_volume_l",
    "cart_quantity",
    "cart_subtotal",
    "category_volume_l",
    "category_quantity",
    "category_subtotal",
]

CART_TYPES = {"cart_volume_l", "cart_quantity", "cart_subtotal"}
CATEGORY_TYPES = {"category_volume_l", "category_quantity", "category_subtotal"}


# --------------------------------------------------------------------------- #
# Models
# --------------------------------------------------------------------------- #
class DiscountRule(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = ""
    type: RuleType
    threshold: float = Field(ge=0)
    percent: float = Field(ge=0, le=100)
    category_slug: Optional[str] = None
    active: bool = True
    priority: int = 0
    label: Optional[str] = ""
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class DiscountRuleCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    type: RuleType
    threshold: float = Field(ge=0)
    percent: float = Field(ge=0, le=100)
    category_slug: Optional[str] = None
    active: bool = True
    priority: int = 0
    label: Optional[str] = ""

    @field_validator("category_slug")
    @classmethod
    def _validate_slug(cls, v, info):
        t = info.data.get("type")
        if t in CATEGORY_TYPES and not (v or "").strip():
            raise ValueError("category_slug обов'язковий для category_* типів правил")
        return (v or None) if t in CATEGORY_TYPES else None


class DiscountRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[RuleType] = None
    threshold: Optional[float] = Field(default=None, ge=0)
    percent: Optional[float] = Field(default=None, ge=0, le=100)
    category_slug: Optional[str] = None
    active: Optional[bool] = None
    priority: Optional[int] = None
    label: Optional[str] = None


class CartItemForPreview(BaseModel):
    """Один товар у кошику, поданий клієнтом для preview."""
    model_config = ConfigDict(extra="ignore")

    product_id: Optional[str] = Field(default=None, alias="productId")
    slug: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None        # human label, опціонально
    category_slug: Optional[str] = None   # якщо клієнт уже знає slug
    volume: Optional[str] = None          # "5 Л" або "5"
    price: float = 0
    quantity: int = 1

    model_config = ConfigDict(populate_by_name=True, extra="ignore")


class PreviewRequest(BaseModel):
    items: List[CartItemForPreview]


class AppliedRule(BaseModel):
    id: str
    name: str
    label: str
    type: RuleType
    percent: float
    threshold: float
    category_slug: Optional[str] = None
    amount: float


class RuleProgress(BaseModel):
    """Active rule + progress towards activation (для UX-підказок)."""
    id: str
    name: str
    label: str
    type: RuleType
    percent: float
    threshold: float
    category_slug: Optional[str] = None
    current: float
    eligible: bool


class PreviewResponse(BaseModel):
    subtotal: float
    discount_total: float
    grand_total: float
    applied_rules: List[AppliedRule]
    progress: List[RuleProgress]


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_volume_l(volume_str: Optional[str]) -> float:
    """Витягнути число літрів з рядка типу '5 Л', '10л', '1,5 L', '500 мл'."""
    if not volume_str:
        return 0.0
    s = str(volume_str).strip().lower().replace(",", ".")
    # detect ml: convert to liters
    if "мл" in s or "ml" in s:
        m = re.search(r"(\d+(?:\.\d+)?)", s)
        return float(m.group(1)) / 1000.0 if m else 0.0
    m = re.search(r"(\d+(?:\.\d+)?)", s)
    return float(m.group(1)) if m else 0.0


async def _resolve_category_slugs(
    db: AsyncIOMotorDatabase, items: List[CartItemForPreview]
) -> Dict[int, Optional[str]]:
    """
    Resolves each item's category_slug.
    Order of precedence:
      1) item.category_slug (як прийшло від клієнта)
      2) lookup в products by id OR slug
      3) None
    Повертає мапу index->slug.
    """
    out: Dict[int, Optional[str]] = {}
    need_lookup: List[tuple] = []   # (index, lookup_key)

    for i, it in enumerate(items):
        if it.category_slug:
            out[i] = it.category_slug
            continue
        # try by slug field first, then product_id (could itself be a slug in older code)
        key = it.slug or it.product_id
        if key:
            need_lookup.append((i, key))
        else:
            out[i] = None

    if need_lookup:
        keys = list({k for _, k in need_lookup})
        # products may store id or slug — match either
        cursor = db.products.find(
            {"$or": [{"id": {"$in": keys}}, {"slug": {"$in": keys}}]},
            {"_id": 0, "id": 1, "slug": 1, "category": 1, "category_slug": 1},
        )
        by_key: Dict[str, Optional[str]] = {}
        async for p in cursor:
            cs = p.get("category_slug") or p.get("category") or None
            if p.get("id"):
                by_key[p["id"]] = cs
            if p.get("slug"):
                by_key[p["slug"]] = cs
        for idx, k in need_lookup:
            out[idx] = by_key.get(k)

    return out


def _apply_rules(
    items: List[CartItemForPreview],
    category_slug_by_idx: Dict[int, Optional[str]],
    rules: List[dict],
) -> PreviewResponse:
    """Pure-function: підрахувати знижку за списком правил."""
    # 1) cart aggregates
    total_qty = sum(int(i.quantity) for i in items)
    total_volume_l = sum(_parse_volume_l(i.volume) * int(i.quantity) for i in items)
    subtotal = round(sum(float(i.price) * int(i.quantity) for i in items), 2)

    # category aggregates
    cat_qty: Dict[str, int] = {}
    cat_volume_l: Dict[str, float] = {}
    cat_subtotal: Dict[str, float] = {}
    for idx, i in enumerate(items):
        cs = category_slug_by_idx.get(idx)
        if not cs:
            continue
        qty = int(i.quantity)
        cat_qty[cs] = cat_qty.get(cs, 0) + qty
        cat_volume_l[cs] = cat_volume_l.get(cs, 0.0) + _parse_volume_l(i.volume) * qty
        cat_subtotal[cs] = round(cat_subtotal.get(cs, 0.0) + float(i.price) * qty, 2)

    progress_list: List[RuleProgress] = []
    cart_candidates: List[AppliedRule] = []
    cat_candidates_by_slug: Dict[str, List[AppliedRule]] = {}

    for r in rules:
        rtype = r["type"]
        thr = float(r.get("threshold", 0))
        pct = float(r.get("percent", 0))
        cslug = r.get("category_slug")

        # current value depending on type
        if rtype == "cart_volume_l":
            current = total_volume_l
            base_amount = subtotal
        elif rtype == "cart_quantity":
            current = float(total_qty)
            base_amount = subtotal
        elif rtype == "cart_subtotal":
            current = subtotal
            base_amount = subtotal
        elif rtype == "category_volume_l":
            current = float(cat_volume_l.get(cslug or "", 0.0))
            base_amount = float(cat_subtotal.get(cslug or "", 0.0))
        elif rtype == "category_quantity":
            current = float(cat_qty.get(cslug or "", 0))
            base_amount = float(cat_subtotal.get(cslug or "", 0.0))
        elif rtype == "category_subtotal":
            current = float(cat_subtotal.get(cslug or "", 0.0))
            base_amount = float(cat_subtotal.get(cslug or "", 0.0))
        else:
            continue

        eligible = current >= thr and base_amount > 0
        amount = round(base_amount * pct / 100.0, 2) if eligible else 0.0

        progress_list.append(RuleProgress(
            id=r["id"],
            name=r.get("name", ""),
            label=r.get("label") or r.get("name", ""),
            type=rtype,
            percent=pct,
            threshold=thr,
            category_slug=cslug,
            current=round(current, 2),
            eligible=eligible,
        ))

        if not eligible:
            continue

        applied = AppliedRule(
            id=r["id"],
            name=r.get("name", ""),
            label=r.get("label") or r.get("name", ""),
            type=rtype,
            percent=pct,
            threshold=thr,
            category_slug=cslug,
            amount=amount,
        )

        if rtype in CART_TYPES:
            cart_candidates.append(applied)
        else:
            cat_candidates_by_slug.setdefault(cslug or "", []).append(applied)

    applied_rules: List[AppliedRule] = []

    # cart-level: best (highest amount, then highest priority via list order)
    if cart_candidates:
        best = max(cart_candidates, key=lambda a: (a.amount, a.percent))
        applied_rules.append(best)

    # category-level: best per category
    for cs, cands in cat_candidates_by_slug.items():
        best = max(cands, key=lambda a: (a.amount, a.percent))
        applied_rules.append(best)

    discount_total = round(sum(a.amount for a in applied_rules), 2)
    # never exceed subtotal
    if discount_total > subtotal:
        discount_total = subtotal
    grand_total = round(subtotal - discount_total, 2)

    return PreviewResponse(
        subtotal=subtotal,
        discount_total=discount_total,
        grand_total=grand_total,
        applied_rules=applied_rules,
        progress=progress_list,
    )


# --------------------------------------------------------------------------- #
# Public API for cart/order code (use from cart_routes / orders_routes too)
# --------------------------------------------------------------------------- #
async def calculate_cart_discount(
    db: AsyncIOMotorDatabase, items: List[CartItemForPreview]
) -> PreviewResponse:
    """Підрахувати знижку — повторно використовується з orders_routes."""
    rules = await db.discount_rules.find(
        {"active": True}, {"_id": 0}
    ).sort("priority", -1).to_list(500)
    cat_map = await _resolve_category_slugs(db, items)
    return _apply_rules(items, cat_map, rules)


# --------------------------------------------------------------------------- #
# Seed default rule (matches the previous hardcoded "100 L → 5%" mock).
# --------------------------------------------------------------------------- #
async def seed_default_discount_rules(db: AsyncIOMotorDatabase) -> None:
    cnt = await db.discount_rules.count_documents({})
    if cnt > 0:
        return
    now = _now_iso()
    defaults = [
        {
            "id": str(uuid.uuid4()),
            "name": "При купівлі від 100 л",
            "description": "Базова обʼємна знижка для оптових замовлень.",
            "type": "cart_volume_l",
            "threshold": 100,
            "percent": 5,
            "category_slug": None,
            "active": True,
            "priority": 0,
            "label": "При купівлі 100 л",
            "created_at": now,
            "updated_at": now,
        },
    ]
    await db.discount_rules.insert_many(defaults)
    logger.info(f"[seed] discount_rules: inserted {len(defaults)} default rule(s)")


# --------------------------------------------------------------------------- #
# Router factory
# --------------------------------------------------------------------------- #
def build_discounts_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(tags=["discounts"])
    admin_dep = build_admin_dep(db)

    # ====== PUBLIC ======
    @router.get("/discounts/active", response_model=List[DiscountRule])
    async def list_active_rules():
        cursor = db.discount_rules.find(
            {"active": True}, {"_id": 0}
        ).sort("priority", -1)
        items = await cursor.to_list(500)
        return [DiscountRule(**it) for it in items]

    @router.post("/discounts/preview", response_model=PreviewResponse)
    async def preview(payload: PreviewRequest):
        return await calculate_cart_discount(db, payload.items)

    # ====== ADMIN ======
    @router.get("/admin/discounts", response_model=List[DiscountRule])
    async def admin_list(_user: dict = Depends(admin_dep)):
        cursor = db.discount_rules.find({}, {"_id": 0}).sort([
            ("active", -1), ("priority", -1), ("created_at", -1)
        ])
        items = await cursor.to_list(1000)
        return [DiscountRule(**it) for it in items]

    @router.post("/admin/discounts", response_model=DiscountRule)
    async def admin_create(body: DiscountRuleCreate, _user: dict = Depends(admin_dep)):
        rule = DiscountRule(
            **body.model_dump(),
            created_at=_now_iso(),
            updated_at=_now_iso(),
        )
        await db.discount_rules.insert_one(rule.model_dump())
        return rule

    @router.get("/admin/discounts/{rule_id}", response_model=DiscountRule)
    async def admin_get(rule_id: str, _user: dict = Depends(admin_dep)):
        doc = await db.discount_rules.find_one({"id": rule_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Правило не знайдено")
        return DiscountRule(**doc)

    @router.patch("/admin/discounts/{rule_id}", response_model=DiscountRule)
    async def admin_update(
        rule_id: str,
        body: DiscountRuleUpdate,
        _user: dict = Depends(admin_dep),
    ):
        doc = await db.discount_rules.find_one({"id": rule_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Правило не знайдено")
        patch: Dict[str, Any] = {
            k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None
        }
        # validate category_slug requirement when type is category_*
        eff_type = patch.get("type", doc.get("type"))
        if eff_type in CATEGORY_TYPES:
            eff_cs = patch.get("category_slug", doc.get("category_slug"))
            if not (eff_cs and str(eff_cs).strip()):
                raise HTTPException(
                    status_code=400,
                    detail="category_slug обов'язковий для category_* типів",
                )
        elif eff_type in CART_TYPES:
            # not relevant for cart_* rules — clear it
            patch["category_slug"] = None
        patch["updated_at"] = _now_iso()
        await db.discount_rules.update_one({"id": rule_id}, {"$set": patch})
        fresh = await db.discount_rules.find_one({"id": rule_id}, {"_id": 0})
        return DiscountRule(**fresh)

    @router.delete("/admin/discounts/{rule_id}")
    async def admin_delete(rule_id: str, _user: dict = Depends(admin_dep)):
        res = await db.discount_rules.delete_one({"id": rule_id})
        if res.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Правило не знайдено")
        return {"ok": True}

    return router
