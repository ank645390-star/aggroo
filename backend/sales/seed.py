"""Migrations + demo seed for sales module."""
from __future__ import annotations

import logging
import uuid
from motor.motor_asyncio import AsyncIOMotorDatabase

from .utils import now_iso

logger = logging.getLogger(__name__)


async def migrate_orders_payment_fields(db: AsyncIOMotorDatabase) -> int:
    """Backfill new CRM fields onto legacy orders.

    Idempotent: only touches docs missing the `payment_status` key.

    Defaults strategy:
      - existing `status=="delivered"`           → payment_status="paid", paid_at=updated_at, internal_status="delivered"
      - existing `status=="cancelled"`           → payment_status="failed", internal_status="cancelled"
      - else                                     → payment_status="pending", internal_status="new"
      - payment_method default                   → "cod"
    """
    n = 0
    cursor = db.orders.find({"payment_status": {"$exists": False}}, {"_id": 0})
    async for doc in cursor:
        order_id = doc.get("id")
        if not order_id:
            continue
        status = doc.get("status") or "in_progress"
        if status == "delivered":
            payment_status = "paid"
            paid_at = doc.get("updated_at")
            paid_amount = float(doc.get("total") or 0)
            internal_status = "delivered"
        elif status == "cancelled":
            payment_status = "failed"
            paid_at = None
            paid_amount = None
            internal_status = "cancelled"
        else:
            payment_status = "pending"
            paid_at = None
            paid_amount = None
            internal_status = "new"
        update = {
            "payment_status": payment_status,
            "payment_method": "cod",
            "internal_status": internal_status,
            "tags": [],
            "admin_notes": [],
            "events": [{
                "type": "created",
                "actor": "system",
                "detail": "Backfilled from legacy status",
                "created_at": now_iso(),
            }],
        }
        if paid_at:
            update["paid_at"] = paid_at
        if paid_amount is not None:
            update["paid_amount"] = paid_amount
        await db.orders.update_one({"id": order_id}, {"$set": update})
        n += 1
    if n:
        logger.info(f"[migrate] sales: backfilled payment_status on {n} legacy orders")
    return n


async def seed_demo_upsells_if_empty(db: AsyncIOMotorDatabase) -> int:
    """Seed 2 demo cross-sell rules (idempotent)."""
    existing = await db.upsell_rules.count_documents({})
    if existing > 0:
        return 0
    ts = now_iso()
    rules = [
        {
            "id": str(uuid.uuid4()),
            "title": "Підсиль виробництво — візьми разом",
            "source_product_slugs": ["venator"],
            "target_product_slugs": ["flores", "agrostim"],
            "priority": 10,
            "active": True,
            "created_at": ts,
            "updated_at": ts,
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Допоміжні речовини для кращого результату",
            "source_product_slugs": ["flores", "agrostim"],
            "target_product_slugs": ["ph-balance", "surfacto"],
            "priority": 5,
            "active": True,
            "created_at": ts,
            "updated_at": ts,
        },
    ]
    await db.upsell_rules.insert_many(rules)
    logger.info(f"[seed] sales: inserted {len(rules)} demo upsell rules")
    return len(rules)
