"""
Cart API — server-side persistence for the shopping cart.

Storage: MongoDB collection `carts` keyed by `session_id` (a UUID stored on the
client in localStorage). Each cart document contains an array of items with
quantity / volume / pricing snapshots so the cart survives across browser
sessions on the same device — and gives us a single source of truth.

Routes (all mounted under /api/cart):
    GET    /api/cart/{session_id}                  → CartResponse
    POST   /api/cart/{session_id}/items            → CartResponse  (add or merge)
    PATCH  /api/cart/{session_id}/items/{item_id}  → CartResponse  (set qty)
    DELETE /api/cart/{session_id}/items/{item_id}  → CartResponse  (remove)
    DELETE /api/cart/{session_id}                  → CartResponse  (clear all)
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from motor.motor_asyncio import AsyncIOMotorDatabase


# --------------------------------------------------------------------------- #
# Pydantic models
# --------------------------------------------------------------------------- #
class CartItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str                              # stable composite key, e.g. "flores-5 Л"
    product_id: str = Field(alias="productId")
    name: str
    category: Optional[str] = None
    volume: Optional[str] = None         # human-readable, e.g. "5 Л"
    price: float                         # per-unit price (UAH)
    quantity: int = Field(ge=1)
    image: str

    model_config = ConfigDict(populate_by_name=True, extra="ignore")


class CartItemCreate(BaseModel):
    """Body for POST /items (quantity defaults to 1 when omitted)."""

    id: str
    productId: str
    name: str
    category: Optional[str] = None
    volume: Optional[str] = None
    price: float
    quantity: int = 1
    image: str


class CartQuantityUpdate(BaseModel):
    quantity: int = Field(ge=0)


class CartResponse(BaseModel):
    session_id: str
    items: List[CartItem]
    count: int                           # sum of all item quantities
    total: float                         # sum of price * quantity
    updated_at: datetime


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _serialize(doc: dict) -> CartResponse:
    """Convert a Mongo document into the public CartResponse shape."""
    items_raw = doc.get("items", []) or []
    items: List[CartItem] = []
    for it in items_raw:
        # support both snake_case (DB) and camelCase (legacy)
        items.append(
            CartItem(
                id=it["id"],
                productId=it.get("product_id") or it.get("productId", ""),
                name=it["name"],
                category=it.get("category"),
                volume=it.get("volume"),
                price=float(it.get("price", 0)),
                quantity=int(it.get("quantity", 1)),
                image=it.get("image", ""),
            )
        )

    count = sum(i.quantity for i in items)
    total = round(sum(i.price * i.quantity for i in items), 2)

    updated_at = doc.get("updated_at")
    if isinstance(updated_at, str):
        try:
            updated_at = datetime.fromisoformat(updated_at)
        except ValueError:
            updated_at = datetime.now(timezone.utc)
    elif updated_at is None:
        updated_at = datetime.now(timezone.utc)

    return CartResponse(
        session_id=doc["session_id"],
        items=items,
        count=count,
        total=total,
        updated_at=updated_at,
    )


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _item_to_mongo(item: CartItem) -> dict:
    return {
        "id": item.id,
        "product_id": item.product_id,
        "name": item.name,
        "category": item.category,
        "volume": item.volume,
        "price": item.price,
        "quantity": item.quantity,
        "image": item.image,
    }


async def _get_or_create(db: AsyncIOMotorDatabase, session_id: str) -> dict:
    doc = await db.carts.find_one({"session_id": session_id}, {"_id": 0})
    if doc is not None:
        return doc
    fresh = {
        "session_id": session_id,
        "items": [],
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    await db.carts.insert_one(dict(fresh))
    return fresh


async def _persist(db: AsyncIOMotorDatabase, session_id: str, items: List[CartItem]):
    await db.carts.update_one(
        {"session_id": session_id},
        {
            "$set": {
                "items": [_item_to_mongo(i) for i in items],
                "updated_at": _now_iso(),
            },
            "$setOnInsert": {"created_at": _now_iso(), "session_id": session_id},
        },
        upsert=True,
    )


# --------------------------------------------------------------------------- #
# Router factory
# --------------------------------------------------------------------------- #
def build_cart_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(prefix="/cart", tags=["cart"])

    @router.get("/{session_id}", response_model=CartResponse)
    async def get_cart(session_id: str):
        if not session_id:
            raise HTTPException(status_code=400, detail="session_id is required")
        doc = await _get_or_create(db, session_id)
        return _serialize(doc)

    @router.post(
        "/{session_id}/items",
        response_model=CartResponse,
        status_code=status.HTTP_200_OK,
    )
    async def add_item(session_id: str, payload: CartItemCreate):
        if payload.quantity <= 0:
            raise HTTPException(status_code=400, detail="quantity must be >= 1")

        doc = await _get_or_create(db, session_id)
        items = [CartItem(**i) if isinstance(i, dict) else i for i in
                 (_serialize(doc).items)]

        # Merge by stable id
        merged = False
        for idx, it in enumerate(items):
            if it.id == payload.id:
                items[idx] = it.model_copy(
                    update={"quantity": it.quantity + payload.quantity}
                )
                merged = True
                break

        if not merged:
            items.append(
                CartItem(
                    id=payload.id,
                    productId=payload.productId,
                    name=payload.name,
                    category=payload.category,
                    volume=payload.volume,
                    price=float(payload.price),
                    quantity=int(payload.quantity),
                    image=payload.image,
                )
            )

        await _persist(db, session_id, items)
        return _serialize(
            {"session_id": session_id, "items": [_item_to_mongo(i) for i in items],
             "updated_at": _now_iso()}
        )

    @router.patch("/{session_id}/items/{item_id}", response_model=CartResponse)
    async def update_quantity(
        session_id: str, item_id: str, payload: CartQuantityUpdate
    ):
        doc = await _get_or_create(db, session_id)
        items = _serialize(doc).items

        new_items: List[CartItem] = []
        found = False
        for it in items:
            if it.id == item_id:
                found = True
                if payload.quantity > 0:
                    new_items.append(it.model_copy(update={"quantity": payload.quantity}))
                # qty == 0 → drop
                continue
            new_items.append(it)

        if not found:
            raise HTTPException(status_code=404, detail="item not found")

        await _persist(db, session_id, new_items)
        return _serialize(
            {"session_id": session_id, "items": [_item_to_mongo(i) for i in new_items],
             "updated_at": _now_iso()}
        )

    @router.delete("/{session_id}/items/{item_id}", response_model=CartResponse)
    async def remove_item(session_id: str, item_id: str):
        doc = await _get_or_create(db, session_id)
        items = [i for i in _serialize(doc).items if i.id != item_id]
        await _persist(db, session_id, items)
        return _serialize(
            {"session_id": session_id, "items": [_item_to_mongo(i) for i in items],
             "updated_at": _now_iso()}
        )

    @router.delete("/{session_id}", response_model=CartResponse)
    async def clear_cart(session_id: str):
        await _persist(db, session_id, [])
        return _serialize(
            {"session_id": session_id, "items": [], "updated_at": _now_iso()}
        )

    return router
