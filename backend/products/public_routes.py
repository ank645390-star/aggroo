"""
Public (non-authenticated) product endpoints.

  GET  /api/products                      — list (filters / sort / pagination)
  GET  /api/products/categories           — active filter categories with counts
  GET  /api/products/search?q=            — lightweight autocomplete
  GET  /api/products/{slug}               — full product by slug
  GET  /api/products/{slug}/related       — related products (same category)
"""
from __future__ import annotations

from typing import Optional, List

from fastapi import APIRouter, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from .models import ProductOut, ProductListResponse, ProductCategoryOut
from .utils import to_product_out, strip_mongo_id


def build_public_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(prefix="/products", tags=["products-public"])

    @router.get("", response_model=ProductListResponse)
    async def list_products(
        category: Optional[str] = None,
        stock: Optional[str] = Query(default=None, description="in | pre | all"),
        q: Optional[str] = None,
        sort: str = Query(default="rec", description="rec | asc | desc | new | az"),
        agronomist_choice: Optional[bool] = Query(
            default=None,
            description="Фільтр: тільки товари з admin-позначкою 'Вибір агрономів'",
        ),
        limit: int = Query(default=48, ge=1, le=100),
        skip: int = Query(default=0, ge=0),
    ):
        mongo_q: dict = {"status": "published"}
        if category:
            cats = [c.strip() for c in category.split(",") if c.strip()]
            if cats:
                mongo_q["category"] = {"$in": cats}
        if stock == "in":
            mongo_q["in_stock"] = True
        elif stock == "pre":
            mongo_q["in_stock"] = False
        if q:
            mongo_q["$or"] = [
                {"name":       {"$regex": q, "$options": "i"}},
                {"short_desc": {"$regex": q, "$options": "i"}},
                {"category":   {"$regex": q, "$options": "i"}},
            ]
        if agronomist_choice is True:
            mongo_q["is_agronomist_choice"] = True
        elif agronomist_choice is False:
            mongo_q["$or"] = (mongo_q.get("$or") or []) + [
                {"is_agronomist_choice": {"$exists": False}},
                {"is_agronomist_choice": False},
            ]

        sort_spec: List[tuple] = [("sort_order", 1), ("created_at", -1)]
        if sort == "asc":
            sort_spec = [("price", 1)]
        elif sort == "desc":
            sort_spec = [("price", -1)]
        elif sort == "new":
            sort_spec = [("created_at", -1)]
        elif sort == "az":
            sort_spec = [("name", 1)]

        total = await db.products.count_documents(mongo_q)
        cursor = (
            db.products.find(mongo_q, {"_id": 0})
            .sort(sort_spec)
            .skip(skip)
            .limit(limit)
        )
        items = [to_product_out(d) async for d in cursor]
        return ProductListResponse(items=items, total=total, limit=limit, skip=skip)

    @router.get("/categories", response_model=dict)
    async def list_categories():
        cursor = db.product_categories.find({"active": True}, {"_id": 0}).sort("sort_order", 1)
        cats = await cursor.to_list(length=200)
        # attach counts (only published products)
        result: list = []
        for c in cats:
            count = await db.products.count_documents({"status": "published", "category": c.get("slug")})
            c2 = dict(c)
            c2["count"] = count
            result.append(ProductCategoryOut(**c2).model_dump())
        return {"items": result}

    @router.get("/search", response_model=dict)
    async def search_products(q: str = "", limit: int = Query(default=6, ge=1, le=20)):
        if not q or len(q.strip()) < 2:
            return {"items": []}
        regex = q.strip()
        cursor = (
            db.products.find(
                {
                    "status": "published",
                    "$or": [
                        {"name":       {"$regex": regex, "$options": "i"}},
                        {"short_desc": {"$regex": regex, "$options": "i"}},
                    ],
                },
                {"_id": 0},
            )
            .sort("sort_order", 1)
            .limit(limit)
        )
        items = [to_product_out(d).model_dump() async for d in cursor]
        return {"items": items}

    @router.get("/{slug}", response_model=ProductOut)
    async def get_product(slug: str):
        doc = await db.products.find_one({"slug": slug, "status": "published"}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Товар не знайдено")
        return to_product_out(doc)

    @router.get("/{slug}/related", response_model=dict)
    async def get_related(slug: str, limit: int = Query(default=4, ge=1, le=12)):
        doc = await db.products.find_one({"slug": slug}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Товар не знайдено")
        cursor = (
            db.products.find(
                {
                    "status": "published",
                    "category": doc.get("category"),
                    "slug": {"$ne": slug},
                },
                {"_id": 0},
            )
            .sort("sort_order", 1)
            .limit(limit)
        )
        items = [to_product_out(d).model_dump() async for d in cursor]
        if len(items) < limit:
            need = limit - len(items)
            cursor2 = (
                db.products.find(
                    {
                        "status": "published",
                        "slug": {"$ne": slug},
                        "category": {"$ne": doc.get("category")},
                    },
                    {"_id": 0},
                )
                .sort("created_at", -1)
                .limit(need)
            )
            items.extend([to_product_out(d).model_dump() async for d in cursor2])
        return {"items": items}

    return router
