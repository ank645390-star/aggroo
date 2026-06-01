"""Admin users router — customers base with order summary."""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from .models import UserSummaryItem, UserSummaryListResponse
from .security import build_admin_dep
from .utils import coerce_iso


async def _user_orders_summary(db: AsyncIOMotorDatabase, user: dict) -> dict:
    """Aggregate orders summary for a single user.

    Matching strategy:
      1) by user_id == user.id
      2) by session_id in user.session_ids
      3) by phone if non-empty
    """
    or_clauses = []
    if user.get("id"):
        or_clauses.append({"user_id": user["id"]})
    sessions = user.get("session_ids") or []
    if sessions:
        or_clauses.append({"session_id": {"$in": sessions}})
    phone = (user.get("phone") or "").strip()
    if phone:
        or_clauses.append({"phone": phone})
    if not or_clauses:
        return {
            "orders_count": 0,
            "paid_orders_count": 0,
            "lifetime_value": 0,
            "last_order_at": None,
        }
    q = {"$or": or_clauses}
    cursor = db.orders.find(q, {"_id": 0, "total": 1, "payment_status": 1, "created_at": 1})
    orders_count = 0
    paid_count = 0
    ltv = 0.0
    last_iso: Optional[str] = None
    async for d in cursor:
        orders_count += 1
        if d.get("payment_status") == "paid":
            paid_count += 1
            ltv += float(d.get("total") or 0)
        c_iso = coerce_iso(d.get("created_at"))
        if c_iso and (last_iso is None or c_iso > last_iso):
            last_iso = c_iso
    return {
        "orders_count": orders_count,
        "paid_orders_count": paid_count,
        "lifetime_value": round(ltv, 2),
        "last_order_at": last_iso,
    }


def build_users_admin_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(prefix="/admin/sales/users", tags=["sales-admin-users"])
    admin_user = build_admin_dep(db)

    @router.get("", response_model=UserSummaryListResponse)
    async def list_users(
        q: Optional[str] = None,
        role: Optional[str] = None,
        limit: int = Query(default=50, ge=1, le=200),
        skip: int = Query(default=0, ge=0),
        _u=Depends(admin_user),
    ):
        mongo_q: dict = {}
        if role:
            mongo_q["role"] = role
        if q:
            mongo_q["$or"] = [
                {"email":     {"$regex": q, "$options": "i"}},
                {"firstName": {"$regex": q, "$options": "i"}},
                {"lastName":  {"$regex": q, "$options": "i"}},
                {"phone":     {"$regex": q, "$options": "i"}},
            ]
        total = await db.users.count_documents(mongo_q)
        cursor = (
            db.users.find(mongo_q, {"_id": 0, "password_hash": 0})
            .sort([("created_at", -1)])
            .skip(skip)
            .limit(limit)
        )
        out: list = []
        async for user in cursor:
            summary = await _user_orders_summary(db, user)
            out.append(UserSummaryItem(
                id=user.get("id", ""),
                email=user.get("email", ""),
                firstName=user.get("firstName", ""),
                lastName=user.get("lastName", ""),
                phone=user.get("phone", ""),
                role=user.get("role", "user"),
                created_at=coerce_iso(user.get("created_at")),
                **summary,
            ))
        return UserSummaryListResponse(items=out, total=total, limit=limit, skip=skip)

    @router.get("/{user_id}", response_model=UserSummaryItem)
    async def get_user(user_id: str, _u=Depends(admin_user)):
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=404, detail="Користувача не знайдено")
        summary = await _user_orders_summary(db, user)
        return UserSummaryItem(
            id=user.get("id", ""),
            email=user.get("email", ""),
            firstName=user.get("firstName", ""),
            lastName=user.get("lastName", ""),
            phone=user.get("phone", ""),
            role=user.get("role", "user"),
            created_at=coerce_iso(user.get("created_at")),
            **summary,
        )

    return router
