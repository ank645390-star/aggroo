"""Pydantic schema for the sales / CRM module.

These models extend the existing Order (orders_routes.py) with optional
payment / CRM metadata. We never mutate the legacy public flow; the new
fields are all-optional with safe defaults so old documents read fine.
"""
from __future__ import annotations

from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

# ---------- Enums ----------
PaymentStatus = Literal[
    "pending",                # очікує оплати (cash on delivery — де фолт)
    "awaiting_confirmation",  # юзер підтвердив, що переказав — очікує перевірки адміном
    "paid",                   # оплачено
    "refunded",               # повернуто
    "failed",                 # невдала оплата
]

PaymentMethod = Literal[
    "cod",            # накладений платіж (оплата при отриманні на НП/УП)
    "bank_transfer", # переказ на рахунок
    "card",          # карткою online (резерв на майбутнє)
]

InternalStatus = Literal[
    "new",          # нове замовлення, не опрацьоване
    "confirmed",    # підтверджене менеджером
    "packed",       # запаковане
    "shipped",      # відправлено
    "delivered",    # доставлено
    "cancelled",    # відмінено
]

# ---------- Sub-blocks ----------
class AdminNote(BaseModel):
    model_config = ConfigDict(extra="ignore")
    text: str
    author_email: Optional[str] = None
    created_at: Optional[str] = None


class PaymentEvent(BaseModel):
    """Audit-trail entry for payment-related actions."""
    model_config = ConfigDict(extra="ignore")
    type: Literal[
        "created",
        "customer_marked_transferred",
        "proof_uploaded",
        "admin_confirmed",
        "admin_refunded",
        "admin_marked_failed",
        "status_changed",
        "note_added",
    ]
    actor: Literal["system", "customer", "admin"] = "system"
    actor_email: Optional[str] = None
    detail: Optional[str] = None
    created_at: Optional[str] = None


# ---------- Order admin payloads ----------
class AdminOrderListItem(BaseModel):
    """Compact representation for admin list."""
    model_config = ConfigDict(extra="ignore")
    id: str
    number: str
    session_id: str
    items_count: int
    subtotal: float
    delivery_cost: float = 0
    total: float
    status: str = "in_progress"
    internal_status: InternalStatus = "new"
    payment_status: PaymentStatus = "pending"
    payment_method: PaymentMethod = "cod"
    paid_at: Optional[str] = None
    paid_amount: Optional[float] = None
    carrier: str = ""
    ttn: Optional[str] = None
    city: str = ""
    address: str = ""
    recipient_first_name: str = ""
    recipient_last_name: str = ""
    phone: str = ""
    customer_email: Optional[str] = None
    user_id: Optional[str] = None
    tags: List[str] = []
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class AdminOrderListResponse(BaseModel):
    items: List[AdminOrderListItem]
    total: int
    limit: int
    skip: int


class AdminOrderDetail(AdminOrderListItem):
    """Full order representation incl. items + timeline."""
    items: List[dict] = []
    comment: Optional[str] = None
    payment_proof_url: Optional[str] = None
    admin_notes: List[AdminNote] = []
    events: List[PaymentEvent] = []


class OrderAdminPatch(BaseModel):
    """Free-form admin update of a sales order."""
    model_config = ConfigDict(extra="ignore")
    internal_status: Optional[InternalStatus] = None
    payment_status: Optional[PaymentStatus] = None
    payment_method: Optional[PaymentMethod] = None
    ttn: Optional[str] = None
    customer_email: Optional[str] = None
    tags: Optional[List[str]] = None
    comment: Optional[str] = None


class PaymentConfirmPayload(BaseModel):
    paid_amount: Optional[float] = None       # default: order.total
    note: Optional[str] = None


class NotePayload(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class MarkTransferredPayload(BaseModel):
    """Customer-side action: “Я переказав на рахунок”."""
    note: Optional[str] = None
    paid_amount: Optional[float] = None


# ---------- Abandoned carts ----------
class AbandonedCartItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    session_id: str
    items_count: int = 0
    estimated_total: float = 0
    last_updated_at: Optional[str] = None
    minutes_since_update: int = 0
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    contact_name: Optional[str] = None
    user_id: Optional[str] = None
    contacted_at: Optional[str] = None
    contacted_by: Optional[str] = None
    contacted_note: Optional[str] = None
    items_preview: List[dict] = []


class AbandonedCartListResponse(BaseModel):
    items: List[AbandonedCartItem]
    total: int
    limit: int
    skip: int


class MarkContactedPayload(BaseModel):
    note: Optional[str] = None


# ---------- Users summary ----------
class UserSummaryItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str = ""
    firstName: str = ""
    lastName: str = ""
    phone: str = ""
    role: str = "user"
    orders_count: int = 0
    paid_orders_count: int = 0
    lifetime_value: float = 0
    last_order_at: Optional[str] = None
    created_at: Optional[str] = None


class UserSummaryListResponse(BaseModel):
    items: List[UserSummaryItem]
    total: int
    limit: int
    skip: int


# ---------- Upsell rules ----------
class UpsellRuleBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    title: str = "Часто разом беруть"
    source_product_slugs: List[str] = []
    target_product_slugs: List[str] = []
    priority: int = 0
    active: bool = True


class UpsellRuleCreate(UpsellRuleBase):
    pass


class UpsellRulePatch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    title: Optional[str] = None
    source_product_slugs: Optional[List[str]] = None
    target_product_slugs: Optional[List[str]] = None
    priority: Optional[int] = None
    active: Optional[bool] = None


class UpsellRuleOut(UpsellRuleBase):
    id: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


# ---------- Dashboard ----------
class DashboardKpi(BaseModel):
    orders_total: int = 0
    orders_paid: int = 0
    orders_awaiting_confirmation: int = 0
    orders_pending: int = 0
    orders_cancelled: int = 0
    revenue_total: float = 0
    revenue_today: float = 0
    revenue_7d: float = 0
    revenue_30d: float = 0
    avg_order_value: float = 0
    abandoned_carts: int = 0
    abandoned_value: float = 0
    users_total: int = 0
    users_new_24h: int = 0
    users_new_7d: int = 0
    conversion_rate: float = 0   # paid_orders / carts_with_items
    top_products: List[dict] = []
