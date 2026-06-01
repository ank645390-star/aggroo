"""
Addresses API — серверний CRUD адрес доставки.

Сховище: MongoDB collection `addresses`, документ на session_id з масивом items.
Each address may be NovaPoshta or Ukrposhta, with carrier-specific fields.

Routes:
    GET    /api/addresses/{session_id}
    POST   /api/addresses/{session_id}                       — додати
    PUT    /api/addresses/{session_id}/{address_id}          — оновити
    DELETE /api/addresses/{session_id}/{address_id}          — видалити
    POST   /api/addresses/{session_id}/{address_id}/primary  — зробити основною
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Literal, Optional, Union

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from motor.motor_asyncio import AsyncIOMotorDatabase


Carrier = Literal["novaposhta", "ukrposhta"]
DeliveryMode = Literal["branch", "courier"]


class AddressBase(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    carrier: Carrier
    title: str
    firstName: str
    lastName: str
    phone: str
    city: str
    isPrimary: bool = False


class NovaPoshtaAddress(AddressBase):
    carrier: Literal["novaposhta"] = "novaposhta"
    deliveryMode: DeliveryMode = "branch"  # branch | courier
    branch: Optional[str] = None           # НП branch number/address (when branch mode)
    street: Optional[str] = None           # actual street for courier mode


class UkrposhtaAddress(AddressBase):
    carrier: Literal["ukrposhta"] = "ukrposhta"
    street: str
    zip: str = Field(pattern=r"^\d{5}$")


Address = Union[NovaPoshtaAddress, UkrposhtaAddress]


class AddressCreate(BaseModel):
    """Body для POST. id генерується сервером, але можна передати."""

    carrier: Carrier
    title: str = Field(min_length=1, max_length=80)
    firstName: str = Field(min_length=1, max_length=80)
    lastName: str = Field(min_length=1, max_length=80)
    phone: str = Field(min_length=8, max_length=40)
    city: str = Field(min_length=1, max_length=120)
    isPrimary: bool = False

    # Nova Poshta
    deliveryMode: Optional[DeliveryMode] = "branch"
    branch: Optional[str] = None

    # Ukrposhta + courier NP
    street: Optional[str] = None
    zip: Optional[str] = None


class AddressUpdate(AddressCreate):
    pass


class AddressesResponse(BaseModel):
    session_id: str
    items: List[Address]
    updated_at: datetime


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _get_or_create(db: AsyncIOMotorDatabase, sid: str) -> dict:
    doc = await db.addresses.find_one({"session_id": sid}, {"_id": 0})
    if doc is not None:
        return doc
    fresh = {"session_id": sid, "items": [], "created_at": _now_iso(), "updated_at": _now_iso()}
    await db.addresses.insert_one(dict(fresh))
    return fresh


def _validate_carrier_payload(payload: AddressCreate) -> dict:
    """Валідує бізнес-рівень (поля за перевізником)."""
    if payload.carrier == "novaposhta":
        if payload.deliveryMode == "branch":
            if not payload.branch or not payload.branch.strip():
                raise HTTPException(status_code=422, detail="Для Нової Пошти (відділення) вкажіть номер відділення")
        else:  # courier
            if not payload.street or not payload.street.strip():
                raise HTTPException(status_code=422, detail="Для кур'єрської доставки вкажіть вулицю та будинок")
        out = {
            "carrier": "novaposhta",
            "deliveryMode": payload.deliveryMode or "branch",
            "branch": (payload.branch or "").strip() if payload.deliveryMode == "branch" else None,
            "street": (payload.street or "").strip() if payload.deliveryMode == "courier" else None,
        }
        return out
    else:
        if not payload.street or not payload.street.strip():
            raise HTTPException(status_code=422, detail="Для Укрпошти вкажіть вулицю та будинок")
        if not payload.zip or len(payload.zip.strip()) != 5 or not payload.zip.strip().isdigit():
            raise HTTPException(status_code=422, detail="Індекс має містити рівно 5 цифр")
        return {
            "carrier": "ukrposhta",
            "street": payload.street.strip(),
            "zip": payload.zip.strip(),
        }


def _serialize(doc: dict) -> AddressesResponse:
    items_raw = doc.get("items", []) or []
    items: List[Address] = []
    for it in items_raw:
        if it.get("carrier") == "novaposhta":
            items.append(NovaPoshtaAddress(**it))
        else:
            items.append(UkrposhtaAddress(**it))
    updated = doc.get("updated_at")
    if isinstance(updated, str):
        try:
            updated = datetime.fromisoformat(updated)
        except ValueError:
            updated = datetime.now(timezone.utc)
    elif updated is None:
        updated = datetime.now(timezone.utc)
    return AddressesResponse(session_id=doc["session_id"], items=items, updated_at=updated)


async def _save(db: AsyncIOMotorDatabase, sid: str, items: List[dict]):
    await db.addresses.update_one(
        {"session_id": sid},
        {
            "$set": {"items": items, "updated_at": _now_iso()},
            "$setOnInsert": {"created_at": _now_iso(), "session_id": sid},
        },
        upsert=True,
    )


def build_addresses_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(prefix="/addresses", tags=["addresses"])

    @router.get("/{session_id}", response_model=AddressesResponse)
    async def list_addresses(session_id: str):
        doc = await _get_or_create(db, session_id)
        return _serialize(doc)

    @router.post("/{session_id}", response_model=AddressesResponse)
    async def add_address(session_id: str, payload: AddressCreate):
        carrier_fields = _validate_carrier_payload(payload)
        doc = await _get_or_create(db, session_id)
        items: List[dict] = list(doc.get("items", []))
        fresh = {
            "id": f"addr-{uuid.uuid4().hex[:10]}",
            "title": payload.title.strip(),
            "firstName": payload.firstName.strip(),
            "lastName": payload.lastName.strip(),
            "phone": payload.phone.strip(),
            "city": payload.city.strip(),
            "isPrimary": payload.isPrimary,
            **carrier_fields,
        }
        if fresh["isPrimary"]:
            for it in items:
                it["isPrimary"] = False
        items.append(fresh)
        if not any(it.get("isPrimary") for it in items):
            items[-1]["isPrimary"] = True
        await _save(db, session_id, items)
        return _serialize({"session_id": session_id, "items": items, "updated_at": _now_iso()})

    @router.put("/{session_id}/{address_id}", response_model=AddressesResponse)
    async def update_address(session_id: str, address_id: str, payload: AddressUpdate):
        carrier_fields = _validate_carrier_payload(payload)
        doc = await _get_or_create(db, session_id)
        items: List[dict] = list(doc.get("items", []))
        idx = next((i for i, it in enumerate(items) if it.get("id") == address_id), -1)
        if idx == -1:
            raise HTTPException(status_code=404, detail="address not found")
        new_item = {
            "id": address_id,
            "title": payload.title.strip(),
            "firstName": payload.firstName.strip(),
            "lastName": payload.lastName.strip(),
            "phone": payload.phone.strip(),
            "city": payload.city.strip(),
            "isPrimary": payload.isPrimary,
            **carrier_fields,
        }
        if new_item["isPrimary"]:
            for j, it in enumerate(items):
                if j != idx:
                    it["isPrimary"] = False
        items[idx] = new_item
        if not any(it.get("isPrimary") for it in items) and items:
            items[0]["isPrimary"] = True
        await _save(db, session_id, items)
        return _serialize({"session_id": session_id, "items": items, "updated_at": _now_iso()})

    @router.delete("/{session_id}/{address_id}", response_model=AddressesResponse)
    async def delete_address(session_id: str, address_id: str):
        doc = await _get_or_create(db, session_id)
        items: List[dict] = list(doc.get("items", []))
        new_items = [it for it in items if it.get("id") != address_id]
        if len(new_items) == len(items):
            raise HTTPException(status_code=404, detail="address not found")
        if new_items and not any(it.get("isPrimary") for it in new_items):
            new_items[0]["isPrimary"] = True
        await _save(db, session_id, new_items)
        return _serialize({"session_id": session_id, "items": new_items, "updated_at": _now_iso()})

    @router.post("/{session_id}/{address_id}/primary", response_model=AddressesResponse)
    async def set_primary(session_id: str, address_id: str):
        doc = await _get_or_create(db, session_id)
        items: List[dict] = list(doc.get("items", []))
        if not any(it.get("id") == address_id for it in items):
            raise HTTPException(status_code=404, detail="address not found")
        for it in items:
            it["isPrimary"] = it.get("id") == address_id
        await _save(db, session_id, items)
        return _serialize({"session_id": session_id, "items": items, "updated_at": _now_iso()})

    return router
