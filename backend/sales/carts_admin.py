"""Admin abandoned carts router.

A cart counts as “abandoned” if:
  - cart.items is non-empty
  - no order has been created for the same session_id
  - the cart hasn't been touched for at least N minutes (default 30)

Contacts are pulled from profiles / users / addresses collections best-effort.
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from .models import AbandonedCartListResponse, AbandonedCartItem, MarkContactedPayload
from .security import build_admin_dep
from .utils import now_iso, coerce_iso


def build_abandoned_carts_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(prefix="/admin/sales/abandoned-carts", tags=["sales-admin-carts"])
    admin_user = build_admin_dep(db)

    async def _resolve_contacts(session_id: str, items: list) -> dict:
        contact = {
            "contact_phone": None,
            "contact_email": None,
            "contact_name": None,
            "user_id": None,
        }
        # 1) Try users via session_ids
        user = await db.users.find_one({"session_ids": session_id}, {"_id": 0})
        if user:
            contact["user_id"] = user.get("id")
            contact["contact_email"] = user.get("email")
            contact["contact_phone"] = user.get("phone") or contact["contact_phone"]
            fn = (user.get("firstName") or "").strip()
            ln = (user.get("lastName") or "").strip()
            full = (fn + " " + ln).strip()
            if full:
                contact["contact_name"] = full
        # 2) Fallback — profiles collection (session-based)
        if not contact["contact_phone"] or not contact["contact_name"]:
            prof = await db.profiles.find_one({"session_id": session_id}, {"_id": 0})
            if prof:
                contact["contact_phone"] = contact["contact_phone"] or prof.get("phone")
                contact["contact_email"] = contact["contact_email"] or prof.get("email")
                fn = (prof.get("firstName") or "").strip()
                ln = (prof.get("lastName") or "").strip()
                full = (fn + " " + ln).strip()
                if full and not contact["contact_name"]:
                    contact["contact_name"] = full
        # 3) Fallback — saved addresses primary item
        if not contact["contact_phone"]:
            addr_doc = await db.addresses.find_one({"session_id": session_id}, {"_id": 0})
            if addr_doc:
                arr = addr_doc.get("items") or []
                primary = next((x for x in arr if x.get("isPrimary")), arr[0] if arr else None)
                if primary:
                    contact["contact_phone"] = contact["contact_phone"] or primary.get("phone")
                    fn = (primary.get("firstName") or "").strip()
                    ln = (primary.get("lastName") or "").strip()
                    full = (fn + " " + ln).strip()
                    if full and not contact["contact_name"]:
                        contact["contact_name"] = full
        return contact

    @router.get("", response_model=AbandonedCartListResponse)
    async def list_abandoned(
        threshold_minutes: int = Query(default=30, ge=1, le=60 * 24 * 14),
        contacted: Optional[bool] = None,
        limit: int = Query(default=50, ge=1, le=200),
        skip: int = Query(default=0, ge=0),
        _u=Depends(admin_user),
    ):
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=threshold_minutes)
        cutoff_iso = cutoff.isoformat()

        # All non-empty carts
        all_carts_cursor = db.carts.find({}, {"_id": 0}).sort("updated_at", -1)
        candidates: list = []
        async for cart in all_carts_cursor:
            items = cart.get("items") or []
            if not items:
                continue
            updated = cart.get("updated_at")
            updated_str = coerce_iso(updated) or ""
            if updated_str and updated_str > cutoff_iso:
                continue  # too recent
            session_id = cart.get("session_id")
            if not session_id:
                continue
            # Skip if any order exists for this session
            has_order = await db.orders.count_documents({"session_id": session_id})
            if has_order > 0:
                continue
            # Compute estimated total + items_count
            items_count = 0
            est_total = 0.0
            items_preview: list = []
            for it in items:
                q = int(it.get("quantity") or 1)
                p = float(it.get("price") or 0)
                items_count += q
                est_total += q * p
                items_preview.append({
                    "name": it.get("name"),
                    "quantity": q,
                    "price": p,
                    "image": it.get("image"),
                })
            contact_meta = await _resolve_contacts(session_id, items)
            # determine minutes since update
            mins = 0
            try:
                if updated:
                    if isinstance(updated, datetime):
                        dt = updated if updated.tzinfo else updated.replace(tzinfo=timezone.utc)
                    else:
                        dt = datetime.fromisoformat(str(updated).replace("Z", "+00:00"))
                    mins = int((datetime.now(timezone.utc) - dt).total_seconds() // 60)
            except Exception:
                mins = 0

            contacted_at = (cart.get("contacted_at") if isinstance(cart, dict) else None)
            if contacted is not None:
                is_contacted = contacted_at is not None
                if contacted and not is_contacted:
                    continue
                if not contacted and is_contacted:
                    continue
            candidates.append(AbandonedCartItem(
                session_id=session_id,
                items_count=items_count,
                estimated_total=round(est_total, 2),
                last_updated_at=coerce_iso(updated),
                minutes_since_update=mins,
                items_preview=items_preview[:5],
                contacted_at=coerce_iso(contacted_at),
                contacted_by=cart.get("contacted_by"),
                contacted_note=cart.get("contacted_note"),
                **contact_meta,
            ))

        total = len(candidates)
        sliced = candidates[skip: skip + limit]
        return AbandonedCartListResponse(items=sliced, total=total, limit=limit, skip=skip)

    @router.post("/{session_id}/mark-contacted", response_model=AbandonedCartItem)
    async def mark_contacted(session_id: str, payload: MarkContactedPayload, user=Depends(admin_user)):
        cart = await db.carts.find_one({"session_id": session_id}, {"_id": 0})
        if not cart:
            raise HTTPException(status_code=404, detail="Кошик не знайдено")
        ts = now_iso()
        await db.carts.update_one(
            {"session_id": session_id},
            {"$set": {
                "contacted_at": ts,
                "contacted_by": user.get("email"),
                "contacted_note": (payload.note or "").strip() or None,
            }},
        )
        contact_meta = await _resolve_contacts(session_id, cart.get("items") or [])
        items = cart.get("items") or []
        items_count = sum(int(it.get("quantity") or 1) for it in items)
        est_total = sum(int(it.get("quantity") or 1) * float(it.get("price") or 0) for it in items)
        return AbandonedCartItem(
            session_id=session_id,
            items_count=items_count,
            estimated_total=round(est_total, 2),
            last_updated_at=coerce_iso(cart.get("updated_at")),
            minutes_since_update=0,
            items_preview=[{"name": it.get("name"), "quantity": int(it.get("quantity") or 1), "price": float(it.get("price") or 0), "image": it.get("image")} for it in items[:5]],
            contacted_at=ts,
            contacted_by=user.get("email"),
            contacted_note=(payload.note or "").strip() or None,
            **contact_meta,
        )

    return router
