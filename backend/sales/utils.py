"""Small helpers shared across the sales sub-routers."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def strip_id(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if doc is None:
        return None
    doc.pop("_id", None)
    return doc


def coerce_iso(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()
    if isinstance(value, str):
        return value
    return None


def paginate_slice(items: list, limit: int, skip: int) -> list:
    return items[skip: skip + limit]


def order_to_admin_dict(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize a stored order document for admin endpoints.

    Adds defaults for new CRM fields if missing (back-compat with old docs).
    Coerces datetime objects to ISO strings.
    """
    out = dict(doc or {})
    out.pop("_id", None)
    # back-compat defaults
    out.setdefault("payment_status", "pending")
    out.setdefault("payment_method", "cod")
    out.setdefault("internal_status", "new")
    out.setdefault("tags", [])
    out.setdefault("admin_notes", [])
    out.setdefault("events", [])
    # iso coerce
    for k in ("created_at", "updated_at", "paid_at"):
        if k in out:
            out[k] = coerce_iso(out.get(k))
    return out
