"""
Orders API — історія замовлень користувача.

Зберігання: MongoDB collection `orders`. Кожен запис — окреме замовлення,
прив'язане до session_id (так само як у кошику й профілі).

Routes:
    GET    /api/orders/{session_id}           — список замовлень користувача
    GET    /api/orders/{session_id}/{order_id} — отримати конкретне
    POST   /api/orders/{session_id}            — створити нове (з checkout)
    PATCH  /api/orders/{session_id}/{order_id} — оновити статус (адмін-флоу)

Особливості:
    • Для перевізника `novaposhta` сервер автоматично генерує ТТН (14 цифр).
    • Для перевізника `ukrposhta` ТТН відсутня (поле = None).
    • Якщо колекція порожня для session_id — повертаємо 3 демо-замовлення,
      які зберігаються у БД, щоб історія виглядала живою з першого разу.
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

import random
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from motor.motor_asyncio import AsyncIOMotorDatabase


Carrier = Literal["novaposhta", "ukrposhta"]
OrderStatus = Literal["in_progress", "delivered", "cancelled"]


class OrderItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    product_id: str
    name: str
    desc: Optional[str] = None
    photo: Optional[str] = None
    volume: Optional[str] = None       # e.g. "5 Л"
    quantity: int = Field(ge=1)
    unit_price: float
    total: float


class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    number: str                        # видимий номер виду "#10024"
    session_id: str
    items: List[OrderItem]
    items_count: int
    subtotal: float
    discount_total: float = 0          # сума знижки (накладається на subtotal)
    applied_discounts: List[dict] = Field(default_factory=list)  # snapshot правил
    delivery_cost: float = 0
    total: float
    status: OrderStatus = "in_progress"
    carrier: Carrier
    ttn: Optional[str] = None
    delivery_mode: Optional[str] = None  # "branch" | "courier" | None (для УП)
    city: str = ""
    address: str = ""                   # № відділення / вулиця
    zip: Optional[str] = None
    recipient_first_name: str = ""
    recipient_last_name: str = ""
    phone: str = ""
    comment: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class OrderItemCreate(BaseModel):
    product_id: str
    name: str
    desc: Optional[str] = None
    photo: Optional[str] = None
    volume: Optional[str] = None
    quantity: int = Field(ge=1)
    unit_price: float


class OrderCreate(BaseModel):
    carrier: Carrier
    delivery_mode: Optional[str] = None
    city: str = Field(min_length=1)
    address: str = Field(min_length=1)
    zip: Optional[str] = None
    recipient_first_name: str = Field(min_length=1)
    recipient_last_name: str = Field(min_length=1)
    phone: str = Field(min_length=8)
    comment: Optional[str] = None
    items: List[OrderItemCreate] = Field(min_length=1)
    delivery_cost: float = 0


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


# ---------------------------- helpers ----------------------------

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _gen_ttn() -> str:
    """Згенерувати «псевдо»-ТТН Нової Пошти у вигляді 14 цифр (XXXX XXXX XXXX XX)."""
    return "".join(str(random.randint(0, 9)) for _ in range(14))


def _gen_order_number() -> str:
    """Видимий номер замовлення."""
    return f"#{random.randint(10000, 99999)}"


def _strip_id(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


def _isoize(value):
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def _to_order_dict(o: Order) -> dict:
    """Pydantic → BSON-friendly dict (datetime → ISO string)."""
    raw = o.model_dump()
    raw["created_at"] = _isoize(raw["created_at"])
    raw["updated_at"] = _isoize(raw["updated_at"])
    return raw


def _from_bson(doc: dict) -> Order:
    """BSON → Order (parse iso strings).""" 
    for k in ("created_at", "updated_at"):
        v = doc.get(k)
        if isinstance(v, str):
            try:
                doc[k] = datetime.fromisoformat(v)
            except ValueError:
                doc[k] = _now()
        elif v is None:
            doc[k] = _now()
    return Order(**doc)


# ---------------------------- demo seed ----------------------------

DEMO_PRODUCTS = [
    {
        "product_id": "gladiator",
        "name": "Гладіатор",
        "desc": "Потужний біоінсектицид широкого спектру",
        "photo": "/Photo3@2x.png",
        "volume": "5 Л",
        "unit_price": 510,
    },
    {
        "product_id": "flores",
        "name": "Флорес",
        "desc": "Комплексний інокулянт для бобових культур",
        "photo": "/Photo1@2x.png",
        "volume": "5 Л",
        "unit_price": 380,
    },
    {
        "product_id": "agrostim",
        "name": "Агростим",
        "desc": "Макро та мікро елементи для зернобобових",
        "photo": "/Photo2@2x.png",
        "volume": "5 Л",
        "unit_price": 290,
    },
    {
        "product_id": "biogumin",
        "name": "Біогумін",
        "desc": "Органічне добриво на основі вермикомпосту",
        "photo": "/Photo5@2x.png",
        "volume": "5 Л",
        "unit_price": 220,
    },
    {
        "product_id": "mineral10",
        "name": "Мінерал-10",
        "desc": "Макро та мікро елементи для всіх типів культур",
        "photo": "/Photo8@2x.png",
        "volume": "5 Л",
        "unit_price": 310,
    },
]


def _build_items(specs: list[tuple[int, int]]) -> tuple[List[OrderItem], int, float]:
    items: List[OrderItem] = []
    count = 0
    subtotal = 0.0
    for prod_idx, qty in specs:
        p = DEMO_PRODUCTS[prod_idx % len(DEMO_PRODUCTS)]
        total = round(p["unit_price"] * qty, 2)
        items.append(OrderItem(
            product_id=p["product_id"],
            name=p["name"],
            desc=p["desc"],
            photo=p["photo"],
            volume=p["volume"],
            quantity=qty,
            unit_price=p["unit_price"],
            total=total,
        ))
        count += qty
        subtotal += total
    return items, count, subtotal


def _build_demo_orders(session_id: str) -> List[Order]:
    """Створити 3 показові замовлення з різними статусами/перевізниками."""
    now = _now()

    items_a, count_a, sub_a = _build_items([(0, 5), (4, 2)])
    items_b, count_b, sub_b = _build_items([(1, 3)])
    items_c, count_c, sub_c = _build_items([(2, 4), (3, 2), (0, 1)])

    o1 = Order(
        id=f"ord-{uuid.uuid4().hex[:10]}",
        number=_gen_order_number(),
        session_id=session_id,
        items=items_a,
        items_count=count_a,
        subtotal=sub_a,
        delivery_cost=80,
        total=sub_a + 80,
        status="delivered",
        carrier="novaposhta",
        ttn=_gen_ttn(),
        delivery_mode="branch",
        city="Київ",
        address="Відділення №5, вул. Шевченка 12",
        recipient_first_name="Іван",
        recipient_last_name="Петренко",
        phone="+380 (50) 937 56 54",
        created_at=now - timedelta(days=14),
        updated_at=now - timedelta(days=11),
    )

    o2 = Order(
        id=f"ord-{uuid.uuid4().hex[:10]}",
        number=_gen_order_number(),
        session_id=session_id,
        items=items_b,
        items_count=count_b,
        subtotal=sub_b,
        delivery_cost=0,
        total=sub_b,
        status="in_progress",
        carrier="novaposhta",
        ttn=_gen_ttn(),
        delivery_mode="courier",
        city="Львів",
        address="вул. Степана Бандери 8, кв. 12",
        recipient_first_name="Іван",
        recipient_last_name="Петренко",
        phone="+380 (50) 937 56 54",
        created_at=now - timedelta(days=2),
        updated_at=now - timedelta(days=2),
    )

    o3 = Order(
        id=f"ord-{uuid.uuid4().hex[:10]}",
        number=_gen_order_number(),
        session_id=session_id,
        items=items_c,
        items_count=count_c,
        subtotal=sub_c,
        delivery_cost=65,
        total=sub_c + 65,
        status="cancelled",
        carrier="ukrposhta",
        ttn=None,
        delivery_mode=None,
        city="Канів",
        address="вул. Шевченка 1",
        zip="19000",
        recipient_first_name="Іван",
        recipient_last_name="Петренко",
        phone="+380 (50) 937 56 54",
        created_at=now - timedelta(days=23),
        updated_at=now - timedelta(days=22),
    )

    return [o1, o2, o3]


# ---------------------------- router ----------------------------

def build_orders_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(prefix="/orders", tags=["orders"])

    async def _ensure_seed(session_id: str) -> None:
        exists = await db.orders.count_documents({"session_id": session_id})
        if exists > 0:
            return
        demo = _build_demo_orders(session_id)
        if demo:
            await db.orders.insert_many([_to_order_dict(o) for o in demo])

    @router.get("/{session_id}")
    async def list_orders(session_id: str):
        if not session_id:
            raise HTTPException(status_code=400, detail="session_id is required")
        await _ensure_seed(session_id)
        cursor = db.orders.find({"session_id": session_id})
        items: List[dict] = []
        async for doc in cursor:
            _strip_id(doc)
            items.append(_from_bson(doc).model_dump(mode="json"))
        # newest first
        items.sort(key=lambda x: x.get("created_at") or "", reverse=True)
        return {"session_id": session_id, "items": items}

    @router.get("/{session_id}/{order_id}")
    async def get_order(session_id: str, order_id: str):
        doc = await db.orders.find_one({"session_id": session_id, "id": order_id})
        if not doc:
            raise HTTPException(status_code=404, detail="order not found")
        _strip_id(doc)
        return _from_bson(doc).model_dump(mode="json")

    @router.post("/{session_id}")
    async def create_order(session_id: str, payload: OrderCreate):
        if not session_id:
            raise HTTPException(status_code=400, detail="session_id is required")
        if payload.carrier == "ukrposhta" and not payload.zip:
            raise HTTPException(status_code=422, detail="Для Укрпошти потрібен індекс")

        items: List[OrderItem] = []
        items_count = 0
        subtotal = 0.0
        for it in payload.items:
            total = round(it.unit_price * it.quantity, 2)
            items.append(OrderItem(
                product_id=it.product_id,
                name=it.name,
                desc=it.desc,
                photo=it.photo,
                volume=it.volume,
                quantity=it.quantity,
                unit_price=it.unit_price,
                total=total,
            ))
            items_count += it.quantity
            subtotal += total

        # Apply discount rules (server-side, source of truth) — використовуємо
        # ту саму логіку, що й /api/discounts/preview, щоб клієнт і сервер
        # завжди давали однаковий результат.
        discount_total = 0.0
        applied_snapshot: List[dict] = []
        try:
            from discounts_routes import calculate_cart_discount, CartItemForPreview
            preview_items = [
                CartItemForPreview(
                    product_id=it.product_id,
                    name=it.name,
                    volume=it.volume,
                    price=it.unit_price,
                    quantity=it.quantity,
                )
                for it in payload.items
            ]
            preview = await calculate_cart_discount(db, preview_items)
            discount_total = float(preview.discount_total or 0)
            applied_snapshot = [r.model_dump() for r in preview.applied_rules]
        except Exception as ex:
            logger.warning(f"[orders.create] discount preview skipped: {ex}")

        now = _now()
        order = Order(
            id=f"ord-{uuid.uuid4().hex[:10]}",
            number=_gen_order_number(),
            session_id=session_id,
            items=items,
            items_count=items_count,
            subtotal=round(subtotal, 2),
            discount_total=round(discount_total, 2),
            applied_discounts=applied_snapshot,
            delivery_cost=payload.delivery_cost,
            total=round(subtotal - discount_total + payload.delivery_cost, 2),
            status="in_progress",
            carrier=payload.carrier,
            ttn=_gen_ttn() if payload.carrier == "novaposhta" else None,
            delivery_mode=payload.delivery_mode,
            city=payload.city.strip(),
            address=payload.address.strip(),
            zip=payload.zip.strip() if payload.zip else None,
            recipient_first_name=payload.recipient_first_name.strip(),
            recipient_last_name=payload.recipient_last_name.strip(),
            phone=payload.phone.strip(),
            comment=(payload.comment or "").strip() or None,
            created_at=now,
            updated_at=now,
        )
        await db.orders.insert_one(_to_order_dict(order))
        return order.model_dump(mode="json")

    @router.patch("/{session_id}/{order_id}")
    async def update_status(session_id: str, order_id: str, payload: OrderStatusUpdate):
        doc = await db.orders.find_one({"session_id": session_id, "id": order_id})
        if not doc:
            raise HTTPException(status_code=404, detail="order not found")
        await db.orders.update_one(
            {"session_id": session_id, "id": order_id},
            {"$set": {"status": payload.status, "updated_at": _isoize(_now())}},
        )
        doc["status"] = payload.status
        _strip_id(doc)
        return _from_bson(doc).model_dump(mode="json")

    return router
