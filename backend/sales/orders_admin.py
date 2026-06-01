"""Admin orders router — CRM-grade order management.

Endpoints (all behind admin JWT):
    GET    /admin/sales/orders                          — paginated + filtered list
    GET    /admin/sales/orders/{id}                     — detail incl. timeline
    PATCH  /admin/sales/orders/{id}                     — update flags / notes / tags / customer_email / TTN
    POST   /admin/sales/orders/{id}/payment/confirm     — mark as paid (admin action)
    POST   /admin/sales/orders/{id}/payment/refund      — mark as refunded
    POST   /admin/sales/orders/{id}/payment/fail        — mark as failed
    POST   /admin/sales/orders/{id}/payment/upload-proof— multipart, returns public URL
    POST   /admin/sales/orders/{id}/notes               — append admin note

Public (customer-facing):
    POST   /sales/orders/{session_id}/{order_id}/mark-transferred — Я переказав на рахунок
    POST   /sales/orders/{session_id}/{order_id}/upload-proof     — customer uploads proof
"""
from __future__ import annotations

import os
import uuid
import aiofiles
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorDatabase

from .models import (
    AdminOrderListResponse,
    AdminOrderListItem,
    AdminOrderDetail,
    OrderAdminPatch,
    PaymentConfirmPayload,
    NotePayload,
    MarkTransferredPayload,
)
from .security import build_admin_dep
from .utils import now_iso, order_to_admin_dict

# ===== Upload config =====
PROOF_DIR = Path(os.environ.get("PAYMENT_PROOF_DIR", "/app/backend/uploads/payment_proofs"))
PROOF_DIR.mkdir(parents=True, exist_ok=True)
PROOF_PUBLIC_BASE = "/api/uploads/payment_proofs"
MAX_PROOF_BYTES = 15 * 1024 * 1024
ALLOWED_PROOF_MIMES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "application/pdf": ".pdf",
}


async def _save_proof(file: UploadFile) -> str:
    ctype = (file.content_type or "").lower()
    ext = ALLOWED_PROOF_MIMES.get(ctype)
    if not ext:
        raise HTTPException(
            status_code=400,
            detail=f"Непідтримуваний тип файлу: {ctype}. Дозволено: JPG/PNG/WEBP/GIF/PDF.",
        )
    contents = await file.read()
    if len(contents) > MAX_PROOF_BYTES:
        raise HTTPException(status_code=413, detail="Файл завеликий (ліміт 15 МБ).")
    name = f"{uuid.uuid4().hex}{ext}"
    dest = PROOF_DIR / name
    async with aiofiles.open(dest, "wb") as f:
        await f.write(contents)
    return f"{PROOF_PUBLIC_BASE}/{name}"


def _filter_query(
    payment_status: Optional[str] = None,
    internal_status: Optional[str] = None,
    payment_method: Optional[str] = None,
    q: Optional[str] = None,
) -> dict:
    mongo_q: dict = {}
    if payment_status:
        mongo_q["payment_status"] = payment_status
    if internal_status:
        mongo_q["internal_status"] = internal_status
    if payment_method:
        mongo_q["payment_method"] = payment_method
    if q:
        mongo_q["$or"] = [
            {"number": {"$regex": q, "$options": "i"}},
            {"phone": {"$regex": q, "$options": "i"}},
            {"recipient_first_name": {"$regex": q, "$options": "i"}},
            {"recipient_last_name": {"$regex": q, "$options": "i"}},
            {"city": {"$regex": q, "$options": "i"}},
            {"customer_email": {"$regex": q, "$options": "i"}},
        ]
    return mongo_q


def build_orders_admin_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(prefix="/admin/sales/orders", tags=["sales-admin-orders"])
    admin_user = build_admin_dep(db)

    @router.get("", response_model=AdminOrderListResponse)
    async def list_orders(
        payment_status: Optional[str] = None,
        internal_status: Optional[str] = None,
        payment_method: Optional[str] = None,
        q: Optional[str] = None,
        limit: int = Query(default=50, ge=1, le=200),
        skip: int = Query(default=0, ge=0),
        _u=Depends(admin_user),
    ):
        mongo_q = _filter_query(payment_status, internal_status, payment_method, q)
        total = await db.orders.count_documents(mongo_q)
        cursor = (
            db.orders.find(mongo_q, {"_id": 0})
            .sort([("created_at", -1)])
            .skip(skip)
            .limit(limit)
        )
        items = []
        async for doc in cursor:
            items.append(AdminOrderListItem(**order_to_admin_dict(doc)))
        return AdminOrderListResponse(items=items, total=total, limit=limit, skip=skip)

    @router.get("/{order_id}", response_model=AdminOrderDetail)
    async def get_order(order_id: str, _u=Depends(admin_user)):
        doc = await db.orders.find_one({"id": order_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Замовлення не знайдено")
        return AdminOrderDetail(**order_to_admin_dict(doc))

    @router.patch("/{order_id}", response_model=AdminOrderDetail)
    async def patch_order(order_id: str, payload: OrderAdminPatch, user=Depends(admin_user)):
        doc = await db.orders.find_one({"id": order_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Замовлення не знайдено")

        update = payload.model_dump(exclude_none=True)
        prev_payment = doc.get("payment_status", "pending")
        prev_internal = doc.get("internal_status", "new")
        update["updated_at"] = now_iso()

        events: list = list(doc.get("events") or [])
        if "payment_status" in update and update["payment_status"] != prev_payment:
            events.append({
                "type": "status_changed",
                "actor": "admin", "actor_email": user.get("email"),
                "detail": f"payment_status: {prev_payment} → {update['payment_status']}",
                "created_at": now_iso(),
            })
        if "internal_status" in update and update["internal_status"] != prev_internal:
            events.append({
                "type": "status_changed",
                "actor": "admin", "actor_email": user.get("email"),
                "detail": f"internal_status: {prev_internal} → {update['internal_status']}",
                "created_at": now_iso(),
            })
        if events != (doc.get("events") or []):
            update["events"] = events

        await db.orders.update_one({"id": order_id}, {"$set": update})
        doc = await db.orders.find_one({"id": order_id}, {"_id": 0})
        return AdminOrderDetail(**order_to_admin_dict(doc))

    @router.post("/{order_id}/payment/confirm", response_model=AdminOrderDetail)
    async def confirm_payment(
        order_id: str,
        payload: PaymentConfirmPayload,
        user=Depends(admin_user),
    ):
        doc = await db.orders.find_one({"id": order_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Замовлення не знайдено")
        if doc.get("payment_status") == "paid":
            raise HTTPException(status_code=409, detail="Замовлення вже оплачено")
        amount = payload.paid_amount if payload.paid_amount is not None else float(doc.get("total", 0))
        ts = now_iso()
        events = list(doc.get("events") or [])
        events.append({
            "type": "admin_confirmed",
            "actor": "admin", "actor_email": user.get("email"),
            "detail": payload.note or f"Оплату підтверджено ({amount} ₴)",
            "created_at": ts,
        })
        await db.orders.update_one(
            {"id": order_id},
            {"$set": {
                "payment_status": "paid",
                "paid_at": ts,
                "paid_amount": amount,
                "updated_at": ts,
                "events": events,
            }},
        )
        doc = await db.orders.find_one({"id": order_id}, {"_id": 0})
        return AdminOrderDetail(**order_to_admin_dict(doc))

    @router.post("/{order_id}/payment/refund", response_model=AdminOrderDetail)
    async def refund_payment(order_id: str, payload: NotePayload, user=Depends(admin_user)):
        doc = await db.orders.find_one({"id": order_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Замовлення не знайдено")
        ts = now_iso()
        events = list(doc.get("events") or [])
        events.append({
            "type": "admin_refunded",
            "actor": "admin", "actor_email": user.get("email"),
            "detail": payload.text,
            "created_at": ts,
        })
        await db.orders.update_one(
            {"id": order_id},
            {"$set": {"payment_status": "refunded", "updated_at": ts, "events": events}},
        )
        doc = await db.orders.find_one({"id": order_id}, {"_id": 0})
        return AdminOrderDetail(**order_to_admin_dict(doc))

    @router.post("/{order_id}/payment/fail", response_model=AdminOrderDetail)
    async def fail_payment(order_id: str, payload: NotePayload, user=Depends(admin_user)):
        doc = await db.orders.find_one({"id": order_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Замовлення не знайдено")
        ts = now_iso()
        events = list(doc.get("events") or [])
        events.append({
            "type": "admin_marked_failed",
            "actor": "admin", "actor_email": user.get("email"),
            "detail": payload.text,
            "created_at": ts,
        })
        await db.orders.update_one(
            {"id": order_id},
            {"$set": {"payment_status": "failed", "updated_at": ts, "events": events}},
        )
        doc = await db.orders.find_one({"id": order_id}, {"_id": 0})
        return AdminOrderDetail(**order_to_admin_dict(doc))

    @router.post("/{order_id}/payment/upload-proof", response_model=AdminOrderDetail)
    async def admin_upload_proof(
        order_id: str,
        file: UploadFile = File(...),
        user=Depends(admin_user),
    ):
        doc = await db.orders.find_one({"id": order_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Замовлення не знайдено")
        url = await _save_proof(file)
        ts = now_iso()
        events = list(doc.get("events") or [])
        events.append({
            "type": "proof_uploaded",
            "actor": "admin", "actor_email": user.get("email"),
            "detail": url,
            "created_at": ts,
        })
        await db.orders.update_one(
            {"id": order_id},
            {"$set": {"payment_proof_url": url, "updated_at": ts, "events": events}},
        )
        doc = await db.orders.find_one({"id": order_id}, {"_id": 0})
        return AdminOrderDetail(**order_to_admin_dict(doc))

    @router.post("/{order_id}/notes", response_model=AdminOrderDetail)
    async def add_note(order_id: str, payload: NotePayload, user=Depends(admin_user)):
        doc = await db.orders.find_one({"id": order_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Замовлення не знайдено")
        ts = now_iso()
        notes = list(doc.get("admin_notes") or [])
        notes.append({
            "text": payload.text,
            "author_email": user.get("email"),
            "created_at": ts,
        })
        events = list(doc.get("events") or [])
        events.append({
            "type": "note_added",
            "actor": "admin", "actor_email": user.get("email"),
            "detail": payload.text[:160],
            "created_at": ts,
        })
        await db.orders.update_one(
            {"id": order_id},
            {"$set": {"admin_notes": notes, "events": events, "updated_at": ts}},
        )
        doc = await db.orders.find_one({"id": order_id}, {"_id": 0})
        return AdminOrderDetail(**order_to_admin_dict(doc))

    return router


def build_orders_customer_router(db: AsyncIOMotorDatabase) -> APIRouter:
    """Customer-facing endpoints for payment confirmation / proof upload."""
    router = APIRouter(prefix="/sales/orders", tags=["sales-customer-orders"])

    @router.post("/{session_id}/{order_id}/mark-transferred", response_model=AdminOrderDetail)
    async def mark_transferred(session_id: str, order_id: str, payload: MarkTransferredPayload):
        doc = await db.orders.find_one({"id": order_id, "session_id": session_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Замовлення не знайдено")
        if doc.get("payment_status") == "paid":
            return AdminOrderDetail(**order_to_admin_dict(doc))
        ts = now_iso()
        events = list(doc.get("events") or [])
        events.append({
            "type": "customer_marked_transferred",
            "actor": "customer",
            "detail": payload.note,
            "created_at": ts,
        })
        update = {
            "payment_status": "awaiting_confirmation",
            "updated_at": ts,
            "events": events,
        }
        if payload.paid_amount is not None:
            update["paid_amount"] = float(payload.paid_amount)
        await db.orders.update_one({"id": order_id, "session_id": session_id}, {"$set": update})
        doc = await db.orders.find_one({"id": order_id, "session_id": session_id}, {"_id": 0})
        return AdminOrderDetail(**order_to_admin_dict(doc))

    @router.post("/{session_id}/{order_id}/upload-proof", response_model=AdminOrderDetail)
    async def customer_upload_proof(
        session_id: str,
        order_id: str,
        file: UploadFile = File(...),
    ):
        doc = await db.orders.find_one({"id": order_id, "session_id": session_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Замовлення не знайдено")
        url = await _save_proof(file)
        ts = now_iso()
        events = list(doc.get("events") or [])
        events.append({
            "type": "proof_uploaded",
            "actor": "customer",
            "detail": url,
            "created_at": ts,
        })
        await db.orders.update_one(
            {"id": order_id, "session_id": session_id},
            {"$set": {
                "payment_proof_url": url,
                "payment_status": "awaiting_confirmation",
                "updated_at": ts,
                "events": events,
            }},
        )
        doc = await db.orders.find_one({"id": order_id, "session_id": session_id}, {"_id": 0})
        return AdminOrderDetail(**order_to_admin_dict(doc))

    return router
