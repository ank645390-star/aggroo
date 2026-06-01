"""Sales dashboard — aggregated KPIs for the admin homepage."""
from __future__ import annotations

from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from .models import DashboardKpi
from .security import build_admin_dep


def build_sales_dashboard_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(prefix="/admin/sales/dashboard", tags=["sales-admin-dashboard"])
    admin_user = build_admin_dep(db)

    @router.get("", response_model=DashboardKpi)
    async def dashboard(_u=Depends(admin_user)):
        now = datetime.now(timezone.utc)
        today_iso = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        week_iso = (now - timedelta(days=7)).isoformat()
        month_iso = (now - timedelta(days=30)).isoformat()

        orders_total = await db.orders.count_documents({})
        orders_paid = await db.orders.count_documents({"payment_status": "paid"})
        orders_awaiting = await db.orders.count_documents({"payment_status": "awaiting_confirmation"})
        orders_pending = await db.orders.count_documents({"payment_status": "pending"})
        orders_cancelled = await db.orders.count_documents({"internal_status": "cancelled"})

        async def _revenue(since_iso: str | None = None) -> float:
            match = {"payment_status": "paid"}
            if since_iso:
                match["paid_at"] = {"$gte": since_iso}
            pipeline = [
                {"$match": match},
                {"$group": {"_id": None, "sum": {"$sum": "$total"}}},
            ]
            doc = await db.orders.aggregate(pipeline).to_list(length=1)
            return float(doc[0]["sum"]) if doc else 0.0

        revenue_total = await _revenue()
        revenue_today = await _revenue(today_iso)
        revenue_7d = await _revenue(week_iso)
        revenue_30d = await _revenue(month_iso)
        avg_order_value = round(revenue_total / orders_paid, 2) if orders_paid > 0 else 0.0

        # Abandoned carts (lightweight estimate)
        non_empty = 0
        ab_value = 0.0
        async for cart in db.carts.find({}, {"_id": 0, "items": 1, "session_id": 1}):
            items = cart.get("items") or []
            if not items:
                continue
            has_order = await db.orders.count_documents({"session_id": cart.get("session_id")})
            if has_order > 0:
                continue
            non_empty += 1
            for it in items:
                ab_value += float(it.get("price") or 0) * int(it.get("quantity") or 1)

        users_total = await db.users.count_documents({})
        users_new_24h = await db.users.count_documents({"created_at": {"$gte": (now - timedelta(days=1)).isoformat()}})
        users_new_7d = await db.users.count_documents({"created_at": {"$gte": week_iso}})

        # Conversion rate = paid_orders / (paid_orders + abandoned_carts)
        denom = orders_paid + non_empty
        conversion = round(orders_paid / denom * 100, 1) if denom > 0 else 0.0

        # Top products by sold qty (from paid orders)
        pipeline = [
            {"$match": {"payment_status": "paid"}},
            {"$unwind": "$items"},
            {"$group": {
                "_id": "$items.product_id",
                "name": {"$first": "$items.name"},
                "photo": {"$first": "$items.photo"},
                "qty": {"$sum": "$items.quantity"},
                "revenue": {"$sum": "$items.total"},
            }},
            {"$sort": {"qty": -1}},
            {"$limit": 5},
        ]
        top = await db.orders.aggregate(pipeline).to_list(length=5)
        top_products = [
            {
                "product_id": d.get("_id"),
                "name": d.get("name"),
                "photo": d.get("photo"),
                "qty": int(d.get("qty") or 0),
                "revenue": float(d.get("revenue") or 0),
            }
            for d in top
        ]

        return DashboardKpi(
            orders_total=orders_total,
            orders_paid=orders_paid,
            orders_awaiting_confirmation=orders_awaiting,
            orders_pending=orders_pending,
            orders_cancelled=orders_cancelled,
            revenue_total=round(revenue_total, 2),
            revenue_today=round(revenue_today, 2),
            revenue_7d=round(revenue_7d, 2),
            revenue_30d=round(revenue_30d, 2),
            avg_order_value=avg_order_value,
            abandoned_carts=non_empty,
            abandoned_value=round(ab_value, 2),
            users_total=users_total,
            users_new_24h=users_new_24h,
            users_new_7d=users_new_7d,
            conversion_rate=conversion,
            top_products=top_products,
        )

    return router
