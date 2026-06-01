"""
Public contact info — for site-wide consumption (Welcome, Catalog, Footer, Contacts).

Reads from admin_settings doc managed by /api/admin/settings.
"""
from __future__ import annotations

import re
from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict
from motor.motor_asyncio import AsyncIOMotorDatabase

from callback_routes import ADMIN_SETTINGS_ID


DEFAULTS = {
    "phone_primary": "+380 (50) 937-56-57",
    "phone_secondary": "+380 (67) 510-13-07",
    "email": "tamisagro@gmail.com",
    "address": "55200, м. Первомайськ, вул. Київська 135, Миколаївська область",
}


class ContactInfo(BaseModel):
    model_config = ConfigDict(extra="ignore")
    phone_primary: str
    phone_secondary: str
    email: str
    address: str
    # Phone variants useful for tel: hrefs (digits only with +)
    phone_primary_tel: str
    phone_secondary_tel: str


def _to_tel(value: str) -> str:
    """Normalize phone string into tel: href format (only `+` and digits)."""
    if not value:
        return ""
    cleaned = re.sub(r"[^\d+]", "", value)
    if cleaned and not cleaned.startswith("+"):
        # Ukrainian numbers default — prepend +
        cleaned = "+" + cleaned
    return cleaned


def build_contact_info_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(tags=["contact-info"])

    @router.get("/contact-info", response_model=ContactInfo)
    async def get_contact_info():
        doc = await db.admin_settings.find_one({"_id": ADMIN_SETTINGS_ID}) or {}
        p1 = doc.get("contact_phone_primary") or DEFAULTS["phone_primary"]
        p2 = doc.get("contact_phone_secondary") or DEFAULTS["phone_secondary"]
        email = doc.get("contact_email") or DEFAULTS["email"]
        address = doc.get("contact_address") or DEFAULTS["address"]
        return ContactInfo(
            phone_primary=p1,
            phone_secondary=p2,
            email=email,
            address=address,
            phone_primary_tel=_to_tel(p1),
            phone_secondary_tel=_to_tel(p2),
        )

    return router
