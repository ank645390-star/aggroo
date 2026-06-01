"""
Reviews routes — TAMIS АГРО.

Адмін-керовані відгуки клієнтів («Фермери обирають нас» на головній,
прив'язка до конкретного товару — опціонально).

Public:
  GET    /api/reviews                                   — список опублікованих
                                                          фільтри: product_id, product_slug, highlighted, limit
  GET    /api/reviews/{review_id}                       — отримати один відгук

Admin (Bearer JWT з роллю admin):
  GET    /api/admin/reviews                             — повний список (всі статуси)
  POST   /api/admin/reviews                             — створити
  PATCH  /api/admin/reviews/{review_id}                 — оновити
  DELETE /api/admin/reviews/{review_id}                 — видалити
  PUT    /api/admin/reviews/reorder                     — переставити порядок (ids[])
  POST   /api/admin/reviews/upload-image                — завантажити фото/аватар
"""
from __future__ import annotations

import os
import uuid
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List

import aiofiles
import jwt
from fastapi import APIRouter, Depends, Header, HTTPException, UploadFile, File, Query
from pydantic import BaseModel, ConfigDict, Field
from motor.motor_asyncio import AsyncIOMotorDatabase

# Перерахунок ефективного рейтингу товару після CRUD відгуку.
from products.utils import recompute_product_rating  # noqa: E402

logger = logging.getLogger(__name__)

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret")
JWT_ALG = os.environ.get("JWT_ALG", "HS256")

# Upload config (mirrors blog/products uploaders)
UPLOAD_DIR = Path(os.environ.get("REVIEWS_UPLOAD_DIR", "/app/backend/uploads/reviews"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
PUBLIC_UPLOAD_BASE = "/api/uploads/reviews"

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
ALLOWED_MIMES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
}


# ===== Models =====
class ReviewItem(BaseModel):
    """Public/admin-facing review item."""
    model_config = ConfigDict(extra="ignore")

    id: str
    # Author
    author_name: str = ""
    author_role: str = ""          # e.g. "Аграрна компанія м.Львів"
    author_photo: str = ""         # URL (avatar / photo of farmer or field)
    # Content
    category: str = ""             # short tag/category, e.g. "Біоінсектициди"
    body: str = ""                 # main review text
    rating: int = 5                # 1..5
    # Display date (free-form, e.g. "Травень 2024") + ISO for sorting
    display_date: str = ""
    date_iso: Optional[str] = None
    # Product linking
    product_id: Optional[str] = None
    product_slug: Optional[str] = None
    product_name: Optional[str] = None  # cached for convenience
    # Flags
    published: bool = True
    highlighted: bool = True       # show on welcome page block
    order: int = 0
    # Audit
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class ReviewCreate(BaseModel):
    author_name: str = ""
    author_role: str = ""
    author_photo: str = ""
    category: str = ""
    body: str = Field(min_length=1)
    rating: int = Field(default=5, ge=1, le=5)
    display_date: str = ""
    date_iso: Optional[str] = None
    product_id: Optional[str] = None
    product_slug: Optional[str] = None
    product_name: Optional[str] = None
    published: bool = True
    highlighted: bool = True
    order: Optional[int] = None


class ReviewPatch(BaseModel):
    author_name: Optional[str] = None
    author_role: Optional[str] = None
    author_photo: Optional[str] = None
    category: Optional[str] = None
    body: Optional[str] = None
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    display_date: Optional[str] = None
    date_iso: Optional[str] = None
    product_id: Optional[str] = None
    product_slug: Optional[str] = None
    product_name: Optional[str] = None
    published: Optional[bool] = None
    highlighted: Optional[bool] = None
    order: Optional[int] = None


class ReviewReorder(BaseModel):
    ids: List[str]


# ===== Customer review submission =====
class CustomerReviewCreate(BaseModel):
    """Payload that a logged-in customer can submit on the product page."""
    model_config = ConfigDict(extra="ignore")

    rating: int = Field(ge=1, le=5)
    body: str = Field(min_length=10, max_length=2000)
    product_slug: Optional[str] = None
    product_id: Optional[str] = None


class ReviewEligibility(BaseModel):
    eligible: bool
    reason: str = ""             # машинно-читаний код причини (для UI)
    message: str = ""            # людський текст для тосту/банера
    has_orders: bool = False
    has_purchased_product: bool = False
    already_reviewed: bool = False


# ===== Default seed (the 5 hardcoded reviews from the welcome page) =====
_DEFAULT_BODY = (
    'Спочатку ставився скептично, звикли "гасити" проблеми жорсткою хімією. '
    "Але минулий рік був посушливий, і хімічні фунгіциди просто палили кукурудзу. "
    "Спробували вашу схему з Тріходерміном по листу. Рослина не стресувала, "
    "стояла зелена до самих жнив. У підсумку отримали +4,5 ц/га на контрольних ділянках."
)

DEFAULT_REVIEWS = [
    {
        "author_name": "Олександр Кравченко",
        "author_role": "Аграрна компанія м.Львів",
        "author_photo": "/image4@2x.webp",
        "category": "Біоінсектициди",
        "body": _DEFAULT_BODY,
        "rating": 5,
        "display_date": "Травень 2024",
        "highlighted": True,
        "published": True,
    },
    {
        "author_name": "Ірина Петрівна",
        "author_role": "ФГ «Зерно Поділля», Тернопільська обл.",
        "author_photo": "/image4@2x.webp",
        "category": "Інокулянти",
        "body": (
            "Друга сезонна схема з Нодуліном — і ми вже не повертаємось до старих варіантів. "
            "Рослини виглядали міцнішими, бульбочки на коренях формувалися активно, "
            "врожайність сої виросла на 12% порівняно з минулим роком."
        ),
        "rating": 5,
        "display_date": "Серпень 2024",
        "highlighted": True,
        "published": True,
    },
    {
        "author_name": "Богдан Литвин",
        "author_role": "Сімейне фермерське господарство, Київщина",
        "author_photo": "/image4@2x.webp",
        "category": "Органічні добрива",
        "body": (
            "Працюю в режимі органік другий рік. Біогумін показав себе чудово — "
            "ґрунт став м'якший, рослини менше хворіли, гречка показала рекордну врожайність "
            "за 6 років мого фермерства."
        ),
        "rating": 5,
        "display_date": "Жовтень 2024",
        "highlighted": True,
        "published": True,
    },
    {
        "author_name": "Сергій Назаренко",
        "author_role": "ТОВ «Агрозлат», Полтавська обл.",
        "author_photo": "/image4@2x.webp",
        "category": "Родентициди",
        "body": (
            "Венатор закрив питання гризунів на 8 тисячах гектарів. "
            "Працював команда вашого агронома — підказали схему по периметру + контрольні точки. "
            "Втрати від мишей цього року практично нульові."
        ),
        "rating": 5,
        "display_date": "Листопад 2024",
        "highlighted": True,
        "published": True,
    },
    {
        "author_name": "Анна Гончарук",
        "author_role": "Агрохолдинг, Вінницька обл.",
        "author_photo": "/image4@2x.webp",
        "category": "Біоінсектициди",
        "body": (
            "Сумісність з нашою класичною системою захисту — на висоті. "
            "Кукурудза проти озимої совки впоралась без додаткових хімічних обробок. "
            "Економія бюджету і чистіший продукт на виході."
        ),
        "rating": 5,
        "display_date": "Грудень 2024",
        "highlighted": True,
        "published": True,
    },
]


async def seed_reviews_if_empty(db: AsyncIOMotorDatabase) -> None:
    """Створює дефолтний набір лише якщо колекція порожня — idempotent."""
    try:
        count = await db.reviews.count_documents({})
        if count == 0:
            now_iso = datetime.now(timezone.utc).isoformat()
            docs = []
            for i, it in enumerate(DEFAULT_REVIEWS):
                docs.append({
                    "id": str(uuid.uuid4()),
                    "author_name": it.get("author_name", ""),
                    "author_role": it.get("author_role", ""),
                    "author_photo": it.get("author_photo", ""),
                    "category": it.get("category", ""),
                    "body": it.get("body", ""),
                    "rating": int(it.get("rating", 5)),
                    "display_date": it.get("display_date", ""),
                    "date_iso": it.get("date_iso"),
                    "product_id": None,
                    "product_slug": None,
                    "product_name": None,
                    "published": bool(it.get("published", True)),
                    "highlighted": bool(it.get("highlighted", True)),
                    "order": i,
                    "created_at": now_iso,
                    "updated_at": now_iso,
                })
            await db.reviews.insert_many(docs)
            logger.info(f"[seed] reviews: inserted {len(docs)} default items")
    except Exception as e:
        logger.warning(f"[seed] reviews skipped: {e}")


# ===== Product-linked seed reviews =====
# Окремі відгуки, прив'язані до конкретних товарів. Безпечно для повторних запусків —
# додаються тільки якщо для конкретного product_slug ще немає жодного відгуку.
PRODUCT_LINKED_SEED_REVIEWS = [
    {
        "product_slug": "venator",
        "author_name": "Сергій Назаренко",
        "author_role": "ТОВ «Агрозлат», Полтавська обл.",
        "author_photo": "/image4@2x.webp",
        "category": "Родентициди",
        "body": (
            "Венатор закрив питання гризунів на 8 тисячах гектарів. "
            "Працювали з агрономом TAMIS: схема по периметру + контрольні точки. "
            "Втрати від мишей цього року практично нульові — рекомендую без сумнівів."
        ),
        "rating": 5,
        "display_date": "Листопад 2024",
    },
    {
        "product_slug": "venator",
        "author_name": "Ольга Іваненко",
        "author_role": "ФГ «Подільські лани», Хмельниччина",
        "author_photo": "/image4@2x.webp",
        "category": "Родентициди",
        "body": (
            "Друге сезон поспіль працюємо Венатором по озимій пшениці. "
            "Стабільність дії висока, безпечний для нецільових видів. "
            "Команда консультує по бакових сумішах — це окрема цінність."
        ),
        "rating": 5,
        "display_date": "Лютий 2025",
    },
    {
        "product_slug": "flores",
        "author_name": "Ірина Петрівна",
        "author_role": "ФГ «Зерно Поділля», Тернопільська обл.",
        "author_photo": "/image4@2x.webp",
        "category": "Інокулянти",
        "body": (
            "Друга сезонна схема з Флоресом — і ми вже не повертаємось до старих варіантів. "
            "Бульбочки на коренях формувалися активно, врожайність сої виросла на 12 % "
            "порівняно з минулим роком."
        ),
        "rating": 5,
        "display_date": "Серпень 2024",
    },
    {
        "product_slug": "gladiator",
        "author_name": "Олександр Кравченко",
        "author_role": "Аграрна компанія м.Львів",
        "author_photo": "/image4@2x.webp",
        "category": "Біоінсектициди",
        "body": (
            "Спочатку скептично. Минулий рік був посушливий — хімічні фунгіциди палили культуру. "
            "Спробували Гладіатора по листу. Рослина не стресувала, стояла зелена до самих жнив. "
            "У підсумку +4,5 ц/га на контрольних ділянках."
        ),
        "rating": 5,
        "display_date": "Травень 2024",
    },
    {
        "product_slug": "gladiator",
        "author_name": "Анна Гончарук",
        "author_role": "Агрохолдинг, Вінницька обл.",
        "author_photo": "/image4@2x.webp",
        "category": "Біоінсектициди",
        "body": (
            "Сумісність з нашою класичною системою захисту — на висоті. "
            "Кукурудза проти озимої совки впоралась без додаткових хімічних обробок. "
            "Економія бюджету і чистіший продукт на виході."
        ),
        "rating": 5,
        "display_date": "Грудень 2024",
    },
    {
        "product_slug": "biogumin",
        "author_name": "Богдан Литвин",
        "author_role": "Сімейне фермерське господарство, Київщина",
        "author_photo": "/image4@2x.webp",
        "category": "Органічні добрива",
        "body": (
            "Працюю в режимі органік другий рік. Біогумін показав себе чудово: "
            "ґрунт став м'якший, рослини менше хворіли, гречка показала рекордну врожайність "
            "за 6 років мого фермерства."
        ),
        "rating": 5,
        "display_date": "Жовтень 2024",
    },
    {
        "product_slug": "agrostim",
        "author_name": "Петро Швидкий",
        "author_role": "СФГ «Світанок», Черкаська обл.",
        "author_photo": "/image4@2x.webp",
        "category": "Макро та Мікро",
        "body": (
            "Агростимом працюємо по сої і кукурудзі. Видимий ефект — листя темно-зелене, "
            "відсутні ознаки голодування навіть на бідних супіщаних ґрунтах."
        ),
        "rating": 5,
        "display_date": "Червень 2025",
    },
    {
        "product_slug": "ph-balance",
        "author_name": "Микола Драган",
        "author_role": "Агроконсалтинг, Одещина",
        "author_photo": "/image4@2x.webp",
        "category": "Допоміжні речовини",
        "body": (
            "pH-Баланс — обов'язковий компонент у нашій бакові суміші. "
            "Жорстка вода більше не \"з'їдає\" дорогу хімію. "
            "Економія препаратів — до 15 %, а ефективність вища."
        ),
        "rating": 5,
        "display_date": "Квітень 2025",
    },
    {
        "product_slug": "aquafix",
        "author_name": "Володимир Заболотний",
        "author_role": "ФГ «Колос», Кіровоградщина",
        "author_photo": "/image4@2x.webp",
        "category": "Допоміжні речовини",
        "body": (
            "АкваФікс розв'язав проблему хелатних добрив у нашій воді. "
            "Раніше були випадання осаду — зараз чистий розчин, рівне покриття листя."
        ),
        "rating": 5,
        "display_date": "Травень 2025",
    },
]


async def seed_product_linked_reviews(db: AsyncIOMotorDatabase) -> None:
    """
    Idempotent: додає весь набір PRODUCT_LINKED_SEED_REVIEWS до конкретних товарів,
    якщо для них ще немає жодного product-linked відгуку. Перевірка відбувається
    ОДНОРАЗОВО на початку (а не після кожної вставки), щоб не зупинятися
    після першого ж додавання при кількох відгуках на один slug.
    Запускається ПІСЛЯ продуктового seed-у.
    """
    try:
        now_iso = datetime.now(timezone.utc).isoformat()
        # Знайти максимальний поточний order, щоб нові додавались у кінець
        max_doc = await db.reviews.find_one({}, {"_id": 0, "order": 1}, sort=[("order", -1)])
        next_order = (max_doc or {}).get("order", -1) + 1

        # Заздалегідь дізнаємось які slugs вже мають відгуки — зробимо це один раз.
        slugs_in_seed = {it["product_slug"] for it in PRODUCT_LINKED_SEED_REVIEWS}
        existing_slugs: set[str] = set()
        if slugs_in_seed:
            async for d in db.reviews.find(
                {"product_slug": {"$in": list(slugs_in_seed)}},
                {"_id": 0, "product_slug": 1},
            ):
                if d.get("product_slug"):
                    existing_slugs.add(d["product_slug"])

        inserted = 0
        for it in PRODUCT_LINKED_SEED_REVIEWS:
            slug = it["product_slug"]
            # Пропускаємо тільки якщо у БД вже були записи ДО запуску цього seed-у
            if slug in existing_slugs:
                continue
            # Дістати product info для кешу
            prod = await db.products.find_one(
                {"slug": slug, "status": "published"},
                {"_id": 0, "id": 1, "slug": 1, "name": 1},
            )
            if not prod:
                continue
            doc = {
                "id": str(uuid.uuid4()),
                "author_name": it.get("author_name", ""),
                "author_role": it.get("author_role", ""),
                "author_photo": it.get("author_photo", ""),
                "category": it.get("category", ""),
                "body": it.get("body", ""),
                "rating": int(it.get("rating", 5)),
                "display_date": it.get("display_date", ""),
                "date_iso": None,
                "product_id": prod.get("id"),
                "product_slug": prod.get("slug"),
                "product_name": prod.get("name"),
                "published": True,
                "highlighted": False,
                "order": next_order + inserted,
                "created_at": now_iso,
                "updated_at": now_iso,
            }
            await db.reviews.insert_one(doc)
            inserted += 1

        if inserted:
            logger.info(f"[seed] product-linked reviews: inserted {inserted} new item(s)")
    except Exception as e:
        logger.warning(f"[seed] product-linked reviews skipped: {e}")



# ===== Helpers =====
def _strip_id(d: dict) -> dict:
    if d:
        d.pop("_id", None)
    return d


def _decode(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Невалідний токен")


def build_reviews_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(tags=["reviews"])

    async def _resolve_user_from_token(authorization: Optional[str]) -> dict:
        """Strict: returns the user doc or raises 401."""
        if not authorization or not authorization.lower().startswith("bearer "):
            raise HTTPException(status_code=401, detail="Не авторизовано")
        token = authorization.split(" ", 1)[1].strip()
        payload = _decode(token)
        uid = payload.get("sub")
        if not uid:
            raise HTTPException(status_code=401, detail="Невалідний токен")
        user = await db.users.find_one({"id": uid}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Користувача не знайдено")
        return user

    async def admin_user(authorization: Optional[str] = Header(default=None)) -> dict:
        user = await _resolve_user_from_token(authorization)
        if user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Доступ лише для адміністраторів")
        return user

    async def auth_user(authorization: Optional[str] = Header(default=None)) -> dict:
        """Any authenticated user (customer or admin)."""
        return await _resolve_user_from_token(authorization)

    async def _compute_eligibility(user: dict, product_slug: Optional[str]) -> dict:
        """
        Перевірка чи може користувач залишити відгук.

        Правила:
        1) Має бути авторизований (контролюється раніше).
        2) Має існувати хоча б одне завершене замовлення (`delivered`) на сесіях
           користувача. Допускаємо `in_progress`, бо клієнт уже здійснив покупку —
           відгук на товар, який він замовив, валідний навіть до отримання.
        3) Якщо product_slug заданий — серед усіх його замовлень має бути цей товар.
        4) Якщо вже залишав відгук на цей товар (product_slug) — повторно не можна.
        """
        session_ids = list(user.get("session_ids") or [])
        order_query: dict = {"status": {"$ne": "cancelled"}}
        if session_ids:
            order_query["session_id"] = {"$in": session_ids}
        else:
            # На випадок коли немає прив'язаних сесій — спробуємо знайти за user_id.
            order_query["user_id"] = user.get("id")

        # Optimization: знаходимо тільки те, що потрібно для рішення.
        orders_count = await db.orders.count_documents(order_query)
        if orders_count == 0:
            return {
                "eligible": False,
                "reason": "no_orders",
                "message": "Залишити відгук можна після першої покупки в нашому магазині.",
                "has_orders": False,
                "has_purchased_product": False,
                "already_reviewed": False,
            }

        has_purchased_product = False
        if product_slug:
            # Знаходимо хоча б одне замовлення, де серед items є цей товар (за slug або id).
            prod = await db.products.find_one(
                {"slug": product_slug},
                {"_id": 0, "id": 1, "slug": 1},
            )
            prod_id = (prod or {}).get("id")
            item_match: dict = {**order_query}
            or_clause = [{"items.product_slug": product_slug}]
            if prod_id:
                or_clause.append({"items.product_id": prod_id})
            item_match["$or"] = or_clause
            has_purchased_product = (await db.orders.count_documents(item_match)) > 0

            if not has_purchased_product:
                return {
                    "eligible": False,
                    "reason": "product_not_purchased",
                    "message": "Залишити відгук на цей товар можна лише після його купівлі.",
                    "has_orders": True,
                    "has_purchased_product": False,
                    "already_reviewed": False,
                }

            already = await db.reviews.find_one(
                {"product_slug": product_slug, "author_user_id": user.get("id")},
                {"_id": 0, "id": 1},
            )
            if already:
                return {
                    "eligible": False,
                    "reason": "already_reviewed",
                    "message": "Ви вже залишили відгук на цей товар. Дякуємо!",
                    "has_orders": True,
                    "has_purchased_product": True,
                    "already_reviewed": True,
                }

        return {
            "eligible": True,
            "reason": "ok",
            "message": "",
            "has_orders": True,
            "has_purchased_product": bool(product_slug and has_purchased_product),
            "already_reviewed": False,
        }


    async def _enrich_product(payload_dict: dict) -> dict:
        """When product_id or product_slug is provided, cache slug/name from products collection."""
        pid = payload_dict.get("product_id")
        pslug = payload_dict.get("product_slug")
        prod = None
        if pid:
            prod = await db.products.find_one({"id": pid}, {"_id": 0, "id": 1, "slug": 1, "name": 1})
        elif pslug:
            prod = await db.products.find_one({"slug": pslug}, {"_id": 0, "id": 1, "slug": 1, "name": 1})
        if prod:
            payload_dict["product_id"] = prod.get("id")
            payload_dict["product_slug"] = prod.get("slug")
            payload_dict["product_name"] = prod.get("name")
        elif pid or pslug:
            # invalid product reference — drop links so we don't show broken data
            payload_dict["product_id"] = None
            payload_dict["product_slug"] = None
            payload_dict["product_name"] = None
        return payload_dict

    # ===== Public =====
    @router.get("/reviews", response_model=List[ReviewItem])
    async def list_public(
        product_id: Optional[str] = Query(default=None),
        product_slug: Optional[str] = Query(default=None),
        highlighted: Optional[bool] = Query(default=None),
        limit: int = Query(default=100, ge=1, le=500),
    ):
        q: dict = {"published": True}
        if product_id:
            q["product_id"] = product_id
        if product_slug:
            q["product_slug"] = product_slug
        if highlighted is not None:
            q["highlighted"] = highlighted
        cursor = db.reviews.find(q, {"_id": 0}).sort([("order", 1), ("created_at", 1)]).limit(limit)
        items = await cursor.to_list(length=limit)
        return [ReviewItem(**it) for it in items]

    @router.get("/reviews/me/eligibility", response_model=ReviewEligibility)
    async def review_eligibility(
        product_slug: Optional[str] = Query(default=None),
        user=Depends(auth_user),
    ):
        result = await _compute_eligibility(user, product_slug)
        return ReviewEligibility(**result)

    @router.get("/reviews/{review_id}", response_model=ReviewItem)
    async def get_public(review_id: str):
        doc = await db.reviews.find_one({"id": review_id, "published": True}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Відгук не знайдено")
        return ReviewItem(**doc)

    # ===== Customer (authenticated user) =====
    @router.post("/reviews/customer", response_model=ReviewItem)
    async def create_customer_review(
        payload: CustomerReviewCreate,
        user=Depends(auth_user),
    ):
        # Resolve product info (prefer slug; fall back to id)
        product_slug = (payload.product_slug or "").strip() or None
        product_id = (payload.product_id or "").strip() or None
        if product_id and not product_slug:
            prod = await db.products.find_one(
                {"id": product_id},
                {"_id": 0, "id": 1, "slug": 1, "name": 1},
            )
            if prod:
                product_slug = prod.get("slug")

        # Enforce business rules.
        eligibility = await _compute_eligibility(user, product_slug)
        if not eligibility["eligible"]:
            raise HTTPException(status_code=403, detail=eligibility["message"])

        now_iso = datetime.now(timezone.utc).isoformat()
        # Build display_date in Ukrainian month + year.
        try:
            _months = [
                "Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
                "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень",
            ]
            _now = datetime.now(timezone.utc)
            display_date = f"{_months[_now.month - 1]} {_now.year}"
        except Exception:
            display_date = ""

        author_name = " ".join(
            x for x in [user.get("firstName") or "", user.get("lastName") or ""] if x
        ).strip() or (user.get("email") or "Користувач")
        author_role = "Покупець TAMIS АГРО"

        # Highest existing order to append at the end.
        max_doc = await db.reviews.find_one({}, {"_id": 0, "order": 1}, sort=[("order", -1)])
        next_order = (max_doc or {}).get("order", -1) + 1

        doc: dict = {
            "id": str(uuid.uuid4()),
            "author_name": author_name,
            "author_role": author_role,
            "author_photo": "",
            "author_user_id": user.get("id"),
            "author_email": user.get("email"),
            "category": "",
            "body": payload.body.strip(),
            "rating": int(payload.rating),
            "display_date": display_date,
            "date_iso": now_iso,
            "product_id": product_id,
            "product_slug": product_slug,
            "product_name": None,
            # Pending moderation by admin.
            "published": False,
            "highlighted": False,
            "moderation_status": "pending",
            "order": next_order,
            "created_at": now_iso,
            "updated_at": now_iso,
        }
        await _enrich_product(doc)

        await db.reviews.insert_one(doc)

        # NOTE: НЕ перераховуємо рейтинг товару — відгук ще не опублікований.
        return ReviewItem(**_strip_id(doc))


    # ===== Admin =====
    @router.get("/admin/reviews", response_model=List[ReviewItem])
    async def list_admin(
        product_id: Optional[str] = Query(default=None),
        highlighted: Optional[bool] = Query(default=None),
        _user=Depends(admin_user),
    ):
        q: dict = {}
        if product_id:
            q["product_id"] = product_id
        if highlighted is not None:
            q["highlighted"] = highlighted
        cursor = db.reviews.find(q, {"_id": 0}).sort([("order", 1), ("created_at", 1)])
        items = await cursor.to_list(length=1000)
        return [ReviewItem(**it) for it in items]

    @router.post("/admin/reviews", response_model=ReviewItem)
    async def create_item(payload: ReviewCreate, _user=Depends(admin_user)):
        now_iso = datetime.now(timezone.utc).isoformat()
        if payload.order is None:
            max_doc = await db.reviews.find_one({}, {"_id": 0, "order": 1}, sort=[("order", -1)])
            next_order = (max_doc or {}).get("order", -1) + 1
        else:
            next_order = payload.order
        doc = payload.model_dump(exclude_none=False)
        doc["id"] = str(uuid.uuid4())
        doc["order"] = next_order
        doc["created_at"] = now_iso
        doc["updated_at"] = now_iso
        # Trim string fields
        for k in ("author_name", "author_role", "author_photo", "category",
                  "body", "display_date"):
            if isinstance(doc.get(k), str):
                doc[k] = doc[k].strip()
        # Cache product info if linked
        await _enrich_product(doc)
        await db.reviews.insert_one(doc)
        # Recompute aggregated rating for linked product (if any).
        if doc.get("product_slug"):
            try:
                await recompute_product_rating(db, product_slug=doc["product_slug"])
            except Exception as e:
                logger.warning(f"[reviews.create] recompute skipped: {e}")
        return ReviewItem(**_strip_id(doc))

    @router.patch("/admin/reviews/{review_id}", response_model=ReviewItem)
    async def patch_item(review_id: str, payload: ReviewPatch, _user=Depends(admin_user)):
        # Запам'ятати попередній slug, щоб перерахувати рейтинг і для нього також,
        # якщо відгук переприв'язано до іншого товару.
        prev = await db.reviews.find_one({"id": review_id}, {"_id": 0, "product_slug": 1})
        prev_slug = (prev or {}).get("product_slug")
        update = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
        if not update:
            raise HTTPException(status_code=400, detail="Нічого оновлювати")
        update["updated_at"] = datetime.now(timezone.utc).isoformat()
        # Trim string fields
        for k in ("author_name", "author_role", "author_photo", "category",
                  "body", "display_date"):
            if k in update and isinstance(update[k], str):
                update[k] = update[k].strip()
        # If product link is being changed — re-enrich
        if "product_id" in update or "product_slug" in update:
            await _enrich_product(update)
        r = await db.reviews.update_one({"id": review_id}, {"$set": update})
        if r.matched_count == 0:
            raise HTTPException(status_code=404, detail="Відгук не знайдено")
        doc = await db.reviews.find_one({"id": review_id}, {"_id": 0})
        # Recompute ratings for both old and new product (if changed).
        new_slug = doc.get("product_slug")
        slugs_to_recompute = {s for s in (prev_slug, new_slug) if s}
        for s in slugs_to_recompute:
            try:
                await recompute_product_rating(db, product_slug=s)
            except Exception as e:
                logger.warning(f"[reviews.patch] recompute skipped for {s}: {e}")
        return ReviewItem(**doc)

    @router.delete("/admin/reviews/{review_id}")
    async def delete_item(review_id: str, _user=Depends(admin_user)):
        prev = await db.reviews.find_one({"id": review_id}, {"_id": 0, "product_slug": 1})
        r = await db.reviews.delete_one({"id": review_id})
        if r.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Відгук не знайдено")
        prev_slug = (prev or {}).get("product_slug")
        if prev_slug:
            try:
                await recompute_product_rating(db, product_slug=prev_slug)
            except Exception as e:
                logger.warning(f"[reviews.delete] recompute skipped: {e}")
        return {"deleted": r.deleted_count}

    @router.put("/admin/reviews/reorder", response_model=List[ReviewItem])
    async def reorder(payload: ReviewReorder, _user=Depends(admin_user)):
        now_iso = datetime.now(timezone.utc).isoformat()
        for idx, rid in enumerate(payload.ids):
            await db.reviews.update_one(
                {"id": rid},
                {"$set": {"order": idx, "updated_at": now_iso}},
            )
        cursor = db.reviews.find({}, {"_id": 0}).sort([("order", 1), ("created_at", 1)])
        items = await cursor.to_list(length=1000)
        return [ReviewItem(**it) for it in items]

    @router.post("/admin/reviews/upload-image")
    async def upload_image(file: UploadFile = File(...), _user=Depends(admin_user)):
        ctype = (file.content_type or "").lower()
        ext = ALLOWED_MIMES.get(ctype)
        if not ext:
            raise HTTPException(
                status_code=400,
                detail=f"Непідтримуваний тип файлу: {ctype}. Дозволено: JPG, PNG, WEBP, GIF, SVG.",
            )
        data = await file.read()
        if len(data) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="Файл занадто великий (макс. 10MB)")
        fname = f"{uuid.uuid4().hex}{ext}"
        dest = UPLOAD_DIR / fname
        async with aiofiles.open(dest, "wb") as f:
            await f.write(data)
        return {
            "url": f"{PUBLIC_UPLOAD_BASE}/{fname}",
            "filename": fname,
            "size": len(data),
            "content_type": ctype,
        }

    return router
