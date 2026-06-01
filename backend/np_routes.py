"""
Nova Poshta API proxy — публічний шар нашого бекенда поверх api.novaposhta.ua.

Чому через бекенд, а не прямо з фронта?
  • Прихований API-ключ (зберігається лише в .env на сервері)
  • CORS не блокує (наш бекенд → НП → нам)
  • Можемо кешувати результати, фільтрувати тощо

Endpoints:
  GET  /api/np/cities?q=Київ              — автокомпліт міст
  GET  /api/np/warehouses?city_ref=XXX&q=1 — список відділень у вибраному місті

Довідник методів НП: https://developers.novaposhta.ua/documentation
"""
from __future__ import annotations

import os
import asyncio
import time
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, HTTPException, Query

NP_ENDPOINT = "https://api.novaposhta.ua/v2.0/json/"
NP_API_KEY = os.environ.get("NOVA_POSHTA_API_KEY", "")

# Простий in-memory cache (TTL) — НП-cities майже не змінюються,
# тому 1 година більш ніж достатньо.
_CITIES_CACHE: Dict[str, tuple[float, List[Dict[str, Any]]]] = {}
_WAREHOUSES_CACHE: Dict[str, tuple[float, List[Dict[str, Any]]]] = {}
_CACHE_TTL_SEC = 60 * 60  # 1h


async def _np_call(model: str, method: str, props: Dict[str, Any]) -> Any:
    if not NP_API_KEY:
        raise HTTPException(status_code=500, detail="NOVA_POSHTA_API_KEY is not configured")
    payload = {
        "apiKey": NP_API_KEY,
        "modelName": model,
        "calledMethod": method,
        "methodProperties": props,
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            r = await client.post(NP_ENDPOINT, json=payload)
            r.raise_for_status()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"Nova Poshta upstream error: {e}")
        data = r.json()
        if not data.get("success", False):
            errs = data.get("errors") or data.get("warnings") or ["Невідома помилка НП"]
            raise HTTPException(status_code=502, detail="; ".join(str(x) for x in errs))
        return data.get("data", [])


def build_np_router() -> APIRouter:
    router = APIRouter(prefix="/np", tags=["nova-poshta"])

    @router.get("/cities")
    async def cities(q: str = Query("", description="Підрядок назви міста"),
                     limit: int = Query(15, ge=1, le=50)):
        """
        Автокомпліт міст / населених пунктів Нової Пошти.
        Викликає метод `Address.searchSettlements` (швидкий і релевантний).
        Повертає список об'єктів {ref, name, area, settlement_type}.
        """
        q_norm = (q or "").strip()
        if len(q_norm) < 1:
            return {"items": []}

        cache_key = f"{q_norm.lower()}::{limit}"
        now = time.time()
        cached = _CITIES_CACHE.get(cache_key)
        if cached and (now - cached[0]) < _CACHE_TTL_SEC:
            return {"items": cached[1]}

        # Спершу пробуємо searchSettlements — він робить fuzzy-пошук по
        # назві населеного пункту й одразу дає settlement_ref.
        try:
            data = await _np_call(
                "Address", "searchSettlements",
                {"CityName": q_norm, "Limit": str(limit)},
            )
        except HTTPException:
            data = []

        items: List[Dict[str, Any]] = []
        # searchSettlements повертає масив об'єктів з полем Addresses (список знайдених)
        if isinstance(data, list):
            for block in data:
                addresses = block.get("Addresses") if isinstance(block, dict) else None
                if not addresses:
                    continue
                for a in addresses:
                    items.append({
                        "ref": a.get("Ref") or a.get("DeliveryCity") or "",
                        "name": a.get("MainDescription") or a.get("Present") or "",
                        "area": a.get("Area") or "",
                        "region": a.get("Region") or "",
                        "settlement_type": a.get("SettlementTypeCode") or "",
                        "present": a.get("Present") or "",
                    })
                    if len(items) >= limit:
                        break
                if len(items) >= limit:
                    break

        # Якщо порожньо — fallback на Address.getCities (фільтр по FindByString)
        if not items:
            try:
                data2 = await _np_call(
                    "Address", "getCities",
                    {"FindByString": q_norm, "Limit": str(limit)},
                )
                if isinstance(data2, list):
                    for c in data2[:limit]:
                        items.append({
                            "ref": c.get("Ref", ""),
                            "name": c.get("Description", ""),
                            "area": c.get("AreaDescription", ""),
                            "region": c.get("RegionsDescription", ""),
                            "settlement_type": c.get("SettlementTypeDescription", ""),
                            "present": (c.get("Description", "") + ", " + c.get("AreaDescription", "")).strip(", "),
                        })
            except HTTPException:
                pass

        _CITIES_CACHE[cache_key] = (now, items)
        return {"items": items}

    @router.get("/warehouses")
    async def warehouses(city_ref: str = Query(..., description="Ref міста, отриманий з /cities"),
                         q: str = Query("", description="Номер або підрядок назви"),
                         limit: int = Query(50, ge=1, le=200)):
        """
        Список відділень/поштоматів у вибраному місті (settlement Ref).
        Використовує метод `AddressGeneral.getWarehouses`. Якщо q — це число,
        повертаємо тільки відділення, що починаються з цього номера.
        """
        if not city_ref:
            raise HTTPException(status_code=400, detail="city_ref is required")

        q_norm = (q or "").strip()
        cache_key = f"{city_ref}::{q_norm.lower()}::{limit}"
        now = time.time()
        cached = _WAREHOUSES_CACHE.get(cache_key)
        if cached and (now - cached[0]) < _CACHE_TTL_SEC:
            return {"items": cached[1]}

        props: Dict[str, Any] = {"Limit": str(limit)}
        # SettlementRef працює для всіх населених пунктів, CityRef лише для міст.
        # Передаємо обидва — НП ігнорує невідомі поля.
        props["SettlementRef"] = city_ref
        props["CityRef"] = city_ref
        # Якщо введено число — фільтруємо за номером
        if q_norm.isdigit():
            props["WarehouseId"] = q_norm

        try:
            data = await _np_call("AddressGeneral", "getWarehouses", props)
        except HTTPException as e:
            # пробуємо без числового фільтру
            if q_norm.isdigit():
                props.pop("WarehouseId", None)
                data = await _np_call("AddressGeneral", "getWarehouses", props)
            else:
                raise

        items: List[Dict[str, Any]] = []
        if isinstance(data, list):
            for w in data:
                items.append({
                    "ref": w.get("Ref", ""),
                    "number": w.get("Number", ""),
                    "description": w.get("Description", ""),
                    "short_address": w.get("ShortAddress", ""),
                    "type": w.get("CategoryOfWarehouse") or w.get("TypeOfWarehouse", ""),
                })

        # Якщо q непорожній і не число — фільтруємо локально по description
        if q_norm and not q_norm.isdigit():
            ql = q_norm.lower()
            items = [it for it in items if ql in (it["description"] + " " + it["short_address"]).lower()]

        # Сортуємо за номером (числовим, якщо вдається)
        def _sort_key(it: Dict[str, Any]):
            n = it.get("number") or ""
            try:
                return (0, int(n))
            except (TypeError, ValueError):
                return (1, n)
        items.sort(key=_sort_key)
        items = items[:limit]

        _WAREHOUSES_CACHE[cache_key] = (now, items)
        return {"items": items}

    return router
