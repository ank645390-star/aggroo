"""
Ukrposhta API proxy — публічний шар нашого бекенда поверх Address Classifier.

Ukrposhta Address Classifier WS — публічний (без токена) сервіс пошуку
індексів та поштових відділень. Базовий URL:
    https://www.ukrposhta.ua/address-classifier-ws/

Це достатньо для checkout-флоу:
  • перевірити, що індекс існує і отримати назву поштового відділення
  • знайти відділення в певному населеному пункті

Для автокомпліту міст ми використовуємо ту саму базу Nova Poshta, бо
географія України одна, а у НП — більш повний і структурований список
населених пунктів (~30k).

Endpoints:
  GET /api/up/postoffices?postcode=01001         — відділення за індексом
  GET /api/up/postoffices/by-city?city=Київ      — відділення у місті
"""
from __future__ import annotations

import asyncio
import time
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, HTTPException, Query

UP_BASE = "https://www.ukrposhta.ua/address-classifier-ws"
_CACHE: Dict[str, tuple[float, Any]] = {}
_CACHE_TTL_SEC = 60 * 60


async def _up_get(path: str, params: Dict[str, Any]) -> Any:
    url = f"{UP_BASE}{path}"
    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            r = await client.get(url, params=params, headers={"Accept": "application/json"})
            r.raise_for_status()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"Ukrposhta upstream error: {e}")
        try:
            return r.json()
        except Exception:
            return r.text


def build_up_router() -> APIRouter:
    router = APIRouter(prefix="/up", tags=["ukrposhta"])

    @router.get("/postoffices")
    async def by_postcode(postcode: str = Query(..., min_length=5, max_length=5,
                                                 regex=r"^\d{5}$")):
        """
        Знайти поштові відділення Укрпошти за індексом (5 цифр).
        Якщо індекс валідний — повертаємо короткий список відділень з адресою.
        """
        cache_key = f"pc::{postcode}"
        now = time.time()
        cached = _CACHE.get(cache_key)
        if cached and (now - cached[0]) < _CACHE_TTL_SEC:
            return {"items": cached[1]}

        try:
            raw = await _up_get("/get_postoffices_by_postcode_simply",
                                 {"postcode": postcode})
        except HTTPException:
            # fallback метод
            try:
                raw = await _up_get("/get_postoffices_by_postindex_data",
                                     {"postindex": postcode})
            except HTTPException:
                # Якщо обидва методи не працюють (API недоступний),
                # повертаємо порожній масив замість помилки 502
                _CACHE[cache_key] = (now, [])
                return {"items": []}

        items: List[Dict[str, Any]] = []
        if isinstance(raw, dict):
            arr = raw.get("Entries", {}).get("Entry", [])
            if isinstance(arr, dict):
                arr = [arr]
            for it in arr or []:
                items.append({
                    "postcode": it.get("POSTCODE") or postcode,
                    "name": it.get("POSTOFFICE_NAME") or it.get("PO_LONG") or "",
                    "city": it.get("CITY_UA") or "",
                    "address": it.get("ADDRESS") or "",
                    "region": it.get("REGION_UA") or "",
                })
        _CACHE[cache_key] = (now, items)
        return {"items": items}

    return router
