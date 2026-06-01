"""
Blog routes — TAMIS АГРО.

Повний CRUD блогу з керуванням з адмінки + завантаженням зображень для редактора.

Public endpoints:
  GET    /api/blog/posts                 — список опублікованих (фільтри, пошук, пагінація)
  GET    /api/blog/posts/{slug}          — повний пост за slug
  GET    /api/blog/posts/{slug}/related  — рекомендовані (3 пости тієї ж категорії)
  GET    /api/blog/categories            — категорії з кількістю постів
  GET    /api/blog/tags                  — теги з кількістю використань

Admin endpoints (Bearer JWT, role=admin):
  GET    /api/admin/blog/posts           — повний список (incl. drafts)
  GET    /api/admin/blog/posts/{id}      — повний пост за id
  POST   /api/admin/blog/posts           — створити
  PATCH  /api/admin/blog/posts/{id}      — оновити
  DELETE /api/admin/blog/posts/{id}      — видалити
  POST   /api/admin/blog/upload-image    — завантажити зображення для редактора
"""
from __future__ import annotations

import os
import re
import uuid
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List

import jwt
import aiofiles
from slugify import slugify
from fastapi import APIRouter, Depends, Header, HTTPException, UploadFile, File, Query
from pydantic import BaseModel, ConfigDict, Field
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret")
JWT_ALG = os.environ.get("JWT_ALG", "HS256")

UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "/app/backend/uploads/blog"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
PUBLIC_UPLOAD_BASE = "/api/uploads/blog"  # served via FastAPI StaticFiles (see server.py)

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_MIMES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
}

WORDS_PER_MINUTE = 220  # для reading_minutes


# ===== Pydantic models =====
class BlogPostBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    title: str = Field(min_length=1, max_length=300)
    slug: Optional[str] = None
    excerpt: str = Field(default="", max_length=600)
    content_html: str = ""
    cover_image: str = ""
    cover_alt: str = ""
    category: str = "Агрономія"
    tags: List[str] = []
    hot: bool = False
    status: str = Field(default="published")  # draft | published
    published_at: Optional[str] = None
    seo_title: str = ""
    seo_description: str = ""


class BlogPostCreate(BlogPostBase):
    pass


class BlogPostPatch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    title: Optional[str] = None
    slug: Optional[str] = None
    excerpt: Optional[str] = None
    content_html: Optional[str] = None
    cover_image: Optional[str] = None
    cover_alt: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    hot: Optional[bool] = None
    status: Optional[str] = None
    published_at: Optional[str] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None


class BlogPostOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    slug: str
    title: str
    excerpt: str = ""
    content_html: str = ""
    cover_image: str = ""
    cover_alt: str = ""
    category: str = ""
    tags: List[str] = []
    hot: bool = False
    status: str = "published"
    reading_minutes: int = 1
    word_count: int = 0
    views: int = 0
    published_at: Optional[str] = None
    seo_title: str = ""
    seo_description: str = ""
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


# ===== Helpers =====
def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Невалідний токен")


def _strip_html(html: str) -> str:
    """Простий стрип HTML для підрахунку слів. Зберігає юнікод (UA)."""
    # Видалити script/style разом з контентом
    txt = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html, flags=re.S | re.I)
    # Усі теги -> пробіл
    txt = re.sub(r"<[^>]+>", " ", txt)
    # HTML entities → space
    txt = re.sub(r"&[a-zA-Z#0-9]+;", " ", txt)
    # Колапсувати пробіли
    txt = re.sub(r"\s+", " ", txt).strip()
    return txt


def _count_words(html_or_text: str) -> int:
    text = _strip_html(html_or_text)
    if not text:
        return 0
    # Розбиваємо за пробілами та фільтруємо порожнечу
    return len([w for w in re.split(r"\s+", text) if w])


def _reading_minutes(html: str) -> int:
    words = _count_words(html)
    if words <= 0:
        return 1
    minutes = max(1, round(words / WORDS_PER_MINUTE))
    return minutes


def _make_slug(value: str) -> str:
    """Cyrillic-friendly slug. python-slugify транслітерує UA через unidecode."""
    s = slugify(value, max_length=140, lowercase=True, separator="-")
    if not s:
        s = uuid.uuid4().hex[:10]
    return s


async def _unique_slug(db: AsyncIOMotorDatabase, base: str, exclude_id: Optional[str] = None) -> str:
    slug = base
    suffix = 2
    while True:
        q = {"slug": slug}
        if exclude_id:
            q["id"] = {"$ne": exclude_id}
        exists = await db.blog_posts.find_one(q, {"_id": 0, "id": 1})
        if not exists:
            return slug
        slug = f"{base}-{suffix}"
        suffix += 1


def _enrich(doc: dict) -> dict:
    """Розрахувати reading_minutes / word_count перед віддачею клієнту."""
    if not doc:
        return doc
    wc = _count_words(doc.get("content_html", ""))
    doc["word_count"] = wc
    doc["reading_minutes"] = max(1, round(wc / WORDS_PER_MINUTE)) if wc else 1
    return doc


# ===== Seed =====
DEFAULT_POSTS: List[dict] = [
    {
        "title": "Мінус 30% на селітрі: як інокулянти економлять азот",
        "slug": "minus-30-na-selitri",
        "excerpt": "Як інокулянти фіксують атмосферний азот і дозволяють економити на мінеральних добривах без втрати врожайності.",
        "content_html": (
            "<p>Біологічна фіксація азоту — найдешевший спосіб «знайти» сотні кілограмів"
            " діючої речовини на полі без купівлі додаткової селітри. У статті розберемо,"
            " <strong>як саме інокулянти на основі <em>Bradyrhizobium japonicum</em></strong>"
            " формують симбіоз із корінням бобових, скільки азоту фіксують у середньому за"
            " сезон та які агропрактики дозволяють вийти на верхню межу ефекту.</p>"
            "<h2>Що відбувається на корінні</h2>"
            "<p>Ризобіальні бактерії утворюють бульбочки на коренях сої вже через 14–21 день"
            " після сходів. Усередині цих структур фермент нітрогеназа перетворює атмосферний N₂"
            " на NH₃, доступний рослині.</p>"
            "<h3>Скільки можна заощадити</h3>"
            "<ul><li>На сої: 100–180 кг N/га за сезон</li>"
            "<li>На горосі: 60–110 кг N/га</li>"
            "<li>На квасолі: 40–80 кг N/га</li></ul>"
            "<blockquote><p>«За три роки переходу на біопрепарати ми зменшили внесення селітри"
            " на 35% — без жодних втрат врожайності.» — агроном господарства «Поділля Агро»</p></blockquote>"
            "<h3>Топ-5 помилок при застосуванні</h3>"
            "<ol><li>Обробка насіння під прямим сонцем</li>"
            "<li>Зберігання інокулянту при +30 °C</li>"
            "<li>Сумісне внесення з протруйниками без перевірки сумісності</li>"
            "<li>Висів через &gt;6 годин після обробки</li>"
            "<li>Ігнорування рН ґрунту нижче 5.5</li></ol>"
        ),
        "category": "Інокулянти",
        "tags": ["соя", "азот", "Bradyrhizobium", "економія"],
        "hot": True,
        "cover_image": "/Image-Container@2x.webp",
        "cover_alt": "Поле сої під час цвітіння",
        "seo_title": "Економія на азотних добривах: інокулянти для сої — TAMIS АГРО",
        "seo_description": "Дізнайтеся, як інокулянти на основі Bradyrhizobium фіксують атмосферний азот і дозволяють заощадити до 30% на селітрі без втрати врожайності.",
    },
    {
        "title": "Біопрепарати: усе з початку. Як влаштовані живі агропрепарати",
        "slug": "biopreparaty-vse-z-pochatku",
        "excerpt": "Кліматично орієнтовані рішення для захисту врожаю: як біопрепарати роблять виробництво стійким до змін погоди.",
        "content_html": (
            "<p>Біопрепарати — це живі мікроорганізми або продукти їхньої життєдіяльності,"
            " які підсилюють природні захисні механізми рослин. На відміну від хімічних"
            " пестицидів, вони працюють у симбіозі з рослиною та екосистемою поля.</p>"
            "<h2>Три великі групи</h2>"
            "<ul><li><strong>Інокулянти</strong> — азотфіксація</li>"
            "<li><strong>Біофунгіциди</strong> (Trichoderma, Bacillus subtilis) — захист від хвороб</li>"
            "<li><strong>Біоінсектициди</strong> — захист від шкідників</li></ul>"
        ),
        "category": "Біотехнології",
        "tags": ["біопрепарати", "клімат"],
        "hot": True,
        "cover_image": "/Image-Container@2x.webp",
        "cover_alt": "Біопрепарати у лабораторії",
    },
    {
        "title": "Чому живі бактерії виграють у хімії в довгій перспективі",
        "slug": "chomu-zhyvi-bakterii-vyhrayut",
        "excerpt": "На конкретних польових випробуваннях показуємо, чим біопрепарати перевершують класичну хімію в довгостроковій перспективі.",
        "content_html": (
            "<p>Тривалі польові випробування 2018–2024 років показують: господарства,"
            " які перейшли на біологічну схему захисту, демонструють у 4–5-й рік стабільніший"
            " приріст врожаю та витрачають менше на діючі речовини.</p>"
            "<h2>Дані з полів</h2>"
            "<p>На контрольних ділянках з біопрепаратами рівень органічної речовини в орному"
            " шарі зріс на 0.4–0.7%, що відповідає 8–12 тоннам гумусу на гектар.</p>"
        ),
        "category": "Агрономія",
        "tags": ["біологія", "польові випробування", "ґрунт"],
        "cover_image": "/Image-Container@2x.webp",
        "cover_alt": "Здорове поле кукурудзи",
    },
    {
        "title": "Як підготувати ґрунт до весни: чек-лист агронома",
        "slug": "yak-pidhotuvaty-grunt-do-vesny",
        "excerpt": "Осінній чек-лист агронома: від аналізу родючості до корекції pH та запуску мікробіологічних стартерів.",
        "content_html": (
            "<p>Підготовка ґрунту восени визначає 40% потенціалу врожаю наступного сезону."
            " Розглянемо ключові кроки, які потрібно виконати до закриття вологи.</p>"
            "<h2>Чек-лист на жовтень–листопад</h2>"
            "<ol><li>Агрохімічний аналіз ґрунту (NPK, мікроелементи, рН)</li>"
            "<li>Корекція pH вапнуванням або гіпсуванням</li>"
            "<li>Внесення органіки або сидератів</li>"
            "<li>Запуск мікробіологічних стартерів</li></ol>"
        ),
        "category": "Ґрунт та вода",
        "tags": ["підготовка ґрунту", "осінь", "pH"],
        "cover_image": "/Image-Container@2x.webp",
        "cover_alt": "Підготовка ґрунту восени",
    },
    {
        "title": "Інокулянти для бобових — огляд штамів 2026",
        "slug": "inokulyanty-dlya-bobovyh-2026",
        "excerpt": "Порівняли штами Bradyrhizobium japonicum за показниками приросту врожаю та стійкості до посухи.",
        "content_html": (
            "<p>У 2025–2026 роках на ринку України представлено понад 14 комерційних штамів"
            " <em>Bradyrhizobium japonicum</em>. Ми порівняли 7 найпопулярніших.</p>"
            "<h2>Топ-3 за врожайністю</h2>"
            "<ol><li>USDA 110 — стабільні +18% врожаю</li>"
            "<li>SEMIA 5079 — +15%, найкращий для посушливих регіонів</li>"
            "<li>USDA 138 — +13%, рекомендований для північних регіонів</li></ol>"
        ),
        "category": "Інокулянти",
        "tags": ["соя", "штами", "огляд 2026"],
        "cover_image": "/Image-Container@2x.webp",
        "cover_alt": "Соя на стадії цвітіння",
    },
    {
        "title": "Trichoderma vs. фузаріоз: реальні кейси",
        "slug": "trichoderma-vs-fusarium",
        "excerpt": "Кейси фермерів, які замінили системні фунгіциди на біопрепарати на основі Trichoderma — і побачили результат.",
        "content_html": (
            "<p>Trichoderma harzianum — мікроскопічний гриб-антагоніст, який пригнічує"
            " розвиток патогенних грибів роду Fusarium, Rhizoctonia, Pythium. Ось три кейси"
            " українських господарств.</p>"
        ),
        "category": "Захист від хвороб",
        "tags": ["Trichoderma", "фузаріоз", "біозахист"],
        "hot": True,
        "cover_image": "/Image-Container@2x.webp",
        "cover_alt": "Споруда лабораторії",
    },
    {
        "title": "Мікроелементи та баланс мінералів у живленні рослин",
        "slug": "mikroelementy-balans-mineraliv",
        "excerpt": "Як збалансувати NPK з мікроелементами та уникнути найпоширеніших помилок у живленні кукурудзи та соняшнику.",
        "content_html": (
            "<p>Дефіцит одного мікроелемента може знизити врожай на 15–25%, навіть якщо NPK"
            " внесено в нормі. Розглянемо ключові правила збалансованого живлення.</p>"
        ),
        "category": "Живлення",
        "tags": ["NPK", "мікроелементи", "кукурудза"],
        "cover_image": "/Image-Container@2x.webp",
        "cover_alt": "Зелене листя кукурудзи",
    },
    {
        "title": "Калькулятор дозування біопрепаратів — як працює",
        "slug": "kalkulyator-dozuvannya-biopreparativ",
        "excerpt": "Готовий онлайн-інструмент: введіть площу, культуру та строк обробки — отримаєте точну норму витрати.",
        "content_html": (
            "<p>Наш калькулятор враховує 6 параметрів: культуру, площу, стадію розвитку,"
            " температуру повітря, pH ґрунту та цільового шкідника. Видає точну норму та"
            " розраховує об'єм робочого розчину.</p>"
        ),
        "category": "Інструменти",
        "tags": ["калькулятор", "дозування"],
        "cover_image": "/Image-Container@2x.webp",
        "cover_alt": "Калькулятор на дисплеї",
    },
]


async def seed_blog_if_empty(db: AsyncIOMotorDatabase) -> None:
    try:
        count = await db.blog_posts.count_documents({})
        if count > 0:
            return
        now_iso = _now_iso()
        docs = []
        for i, p in enumerate(DEFAULT_POSTS):
            wc = _count_words(p.get("content_html", ""))
            docs.append(
                {
                    "id": str(uuid.uuid4()),
                    "slug": p["slug"],
                    "title": p["title"],
                    "excerpt": p.get("excerpt", ""),
                    "content_html": p.get("content_html", ""),
                    "cover_image": p.get("cover_image", "/Image-Container@2x.webp"),
                    "cover_alt": p.get("cover_alt", ""),
                    "category": p.get("category", "Агрономія"),
                    "tags": p.get("tags", []),
                    "hot": p.get("hot", False),
                    "status": "published",
                    "word_count": wc,
                    "reading_minutes": max(1, round(wc / WORDS_PER_MINUTE)) if wc else 1,
                    "views": 0,
                    "published_at": now_iso,
                    "seo_title": p.get("seo_title", p["title"]),
                    "seo_description": p.get("seo_description", p.get("excerpt", "")),
                    "created_at": now_iso,
                    "updated_at": now_iso,
                    "order": i,
                }
            )
        await db.blog_posts.insert_many(docs)
        logger.info(f"[seed] blog_posts: inserted {len(docs)} default posts")
    except Exception as e:
        logger.warning(f"[seed] blog skipped: {e}")


# ===== Router =====
def build_blog_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(tags=["blog"])

    async def admin_user(authorization: Optional[str] = Header(default=None)) -> dict:
        if not authorization or not authorization.lower().startswith("bearer "):
            raise HTTPException(status_code=401, detail="Не авторизовано")
        token = authorization.split(" ", 1)[1].strip()
        payload = _decode_token(token)
        uid = payload.get("sub")
        if not uid:
            raise HTTPException(status_code=401, detail="Невалідний токен")
        user = await db.users.find_one({"id": uid}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Користувача не знайдено")
        if user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Доступ лише для адміністраторів")
        return user

    # ============ PUBLIC ============
    @router.get("/blog/posts")
    async def list_public(
        category: Optional[str] = Query(default=None),
        tag: Optional[str] = Query(default=None),
        q: Optional[str] = Query(default=None, description="Search query"),
        sort: str = Query(default="newest", pattern="^(newest|oldest|popular)$"),
        limit: int = Query(default=24, ge=1, le=100),
        skip: int = Query(default=0, ge=0),
    ):
        filt: dict = {"status": "published"}
        if category and category.strip():
            filt["category"] = category.strip()
        if tag and tag.strip():
            filt["tags"] = tag.strip()
        if q and q.strip():
            rx = re.compile(re.escape(q.strip()), re.IGNORECASE)
            filt["$or"] = [
                {"title": rx},
                {"excerpt": rx},
                {"content_html": rx},
                {"tags": rx},
            ]
        sort_spec = {
            "newest": [("published_at", -1), ("created_at", -1)],
            "oldest": [("published_at", 1), ("created_at", 1)],
            "popular": [("views", -1), ("published_at", -1)],
        }[sort]
        total = await db.blog_posts.count_documents(filt)
        cursor = db.blog_posts.find(filt, {"_id": 0}).sort(sort_spec).skip(skip).limit(limit)
        items = await cursor.to_list(length=limit)
        # Lightweight list view — strip content_html from list response
        out = []
        for it in items:
            it = _enrich(it)
            it.pop("content_html", None)
            d = BlogPostOut(**it).model_dump()
            d.pop("content_html", None)
            out.append(d)
        return {"items": out, "total": total, "limit": limit, "skip": skip}

    @router.get("/blog/posts/{slug}", response_model=BlogPostOut)
    async def get_public(slug: str):
        doc = await db.blog_posts.find_one(
            {"slug": slug, "status": "published"}, {"_id": 0}
        )
        if not doc:
            raise HTTPException(status_code=404, detail="Статтю не знайдено")
        # Bump views (best-effort)
        try:
            await db.blog_posts.update_one({"id": doc["id"]}, {"$inc": {"views": 1}})
            doc["views"] = (doc.get("views") or 0) + 1
        except Exception:
            pass
        return BlogPostOut(**_enrich(doc))

    @router.get("/blog/posts/{slug}/related")
    async def related_public(slug: str, limit: int = Query(default=3, ge=1, le=6)):
        base = await db.blog_posts.find_one(
            {"slug": slug, "status": "published"}, {"_id": 0}
        )
        if not base:
            return {"items": []}
        # Spec: same category, exclude this slug, fallback to latest if not enough
        same_cat_cursor = db.blog_posts.find(
            {
                "status": "published",
                "slug": {"$ne": slug},
                "category": base.get("category", ""),
            },
            {"_id": 0},
        ).sort([("published_at", -1)]).limit(limit)
        rel = await same_cat_cursor.to_list(length=limit)
        if len(rel) < limit:
            need = limit - len(rel)
            have_slugs = {slug} | {r["slug"] for r in rel}
            extra_cursor = db.blog_posts.find(
                {"status": "published", "slug": {"$nin": list(have_slugs)}},
                {"_id": 0},
            ).sort([("published_at", -1)]).limit(need)
            rel += await extra_cursor.to_list(length=need)
        out = []
        for it in rel:
            it = _enrich(it)
            it.pop("content_html", None)
            d = BlogPostOut(**it).model_dump()
            d.pop("content_html", None)
            out.append(d)
        return {"items": out}

    @router.get("/blog/categories")
    async def categories_public():
        pipeline = [
            {"$match": {"status": "published"}},
            {"$group": {"_id": "$category", "count": {"$sum": 1}}},
            {"$sort": {"count": -1, "_id": 1}},
        ]
        rows = await db.blog_posts.aggregate(pipeline).to_list(length=200)
        return {
            "items": [
                {"name": r["_id"] or "Без категорії", "count": r["count"]} for r in rows
            ]
        }

    @router.get("/blog/tags")
    async def tags_public():
        pipeline = [
            {"$match": {"status": "published"}},
            {"$unwind": "$tags"},
            {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
            {"$sort": {"count": -1, "_id": 1}},
            {"$limit": 50},
        ]
        rows = await db.blog_posts.aggregate(pipeline).to_list(length=50)
        return {"items": [{"name": r["_id"], "count": r["count"]} for r in rows if r["_id"]]}

    # ============ ADMIN ============
    @router.get("/admin/blog/posts")
    async def list_admin(_user=Depends(admin_user)):
        cursor = db.blog_posts.find({}, {"_id": 0}).sort([("created_at", -1)])
        items = await cursor.to_list(length=500)
        out = []
        for it in items:
            it = _enrich(it)
            it.pop("content_html", None)
            d = BlogPostOut(**it).model_dump()
            d.pop("content_html", None)
            out.append(d)
        return {"items": out, "total": len(out)}

    @router.get("/admin/blog/posts/{post_id}", response_model=BlogPostOut)
    async def get_admin(post_id: str, _user=Depends(admin_user)):
        doc = await db.blog_posts.find_one({"id": post_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Статтю не знайдено")
        return BlogPostOut(**_enrich(doc))

    @router.post("/admin/blog/posts", response_model=BlogPostOut)
    async def create(payload: BlogPostCreate, _user=Depends(admin_user)):
        now_iso = _now_iso()
        base_slug = _make_slug(payload.slug or payload.title)
        slug = await _unique_slug(db, base_slug)
        wc = _count_words(payload.content_html or "")
        doc = {
            "id": str(uuid.uuid4()),
            "slug": slug,
            "title": payload.title.strip(),
            "excerpt": (payload.excerpt or "").strip(),
            "content_html": payload.content_html or "",
            "cover_image": payload.cover_image or "",
            "cover_alt": payload.cover_alt or "",
            "category": (payload.category or "Агрономія").strip(),
            "tags": [t.strip() for t in (payload.tags or []) if t.strip()],
            "hot": bool(payload.hot),
            "status": payload.status if payload.status in ("draft", "published") else "draft",
            "word_count": wc,
            "reading_minutes": max(1, round(wc / WORDS_PER_MINUTE)) if wc else 1,
            "views": 0,
            "published_at": payload.published_at
            or (now_iso if payload.status == "published" else None),
            "seo_title": (payload.seo_title or payload.title).strip(),
            "seo_description": (payload.seo_description or payload.excerpt or "").strip(),
            "created_at": now_iso,
            "updated_at": now_iso,
        }
        await db.blog_posts.insert_one(dict(doc))
        return BlogPostOut(**doc)

    @router.patch("/admin/blog/posts/{post_id}", response_model=BlogPostOut)
    async def patch(post_id: str, payload: BlogPostPatch, _user=Depends(admin_user)):
        doc = await db.blog_posts.find_one({"id": post_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Статтю не знайдено")
        upd: dict = {}
        data = payload.model_dump(exclude_unset=True)

        for k in ("title", "excerpt", "cover_image", "cover_alt", "category",
                  "seo_title", "seo_description"):
            if k in data and data[k] is not None:
                upd[k] = (data[k] or "").strip() if isinstance(data[k], str) else data[k]

        if "tags" in data and data["tags"] is not None:
            upd["tags"] = [t.strip() for t in data["tags"] if t and t.strip()]
        if "hot" in data and data["hot"] is not None:
            upd["hot"] = bool(data["hot"])
        if "content_html" in data and data["content_html"] is not None:
            upd["content_html"] = data["content_html"]
            wc = _count_words(data["content_html"])
            upd["word_count"] = wc
            upd["reading_minutes"] = max(1, round(wc / WORDS_PER_MINUTE)) if wc else 1
        if "status" in data and data["status"] is not None:
            if data["status"] in ("draft", "published"):
                upd["status"] = data["status"]
                # If publishing for the first time → stamp published_at
                if data["status"] == "published" and not doc.get("published_at"):
                    upd["published_at"] = _now_iso()
        if "published_at" in data and data["published_at"] is not None:
            upd["published_at"] = data["published_at"]
        if "slug" in data and data["slug"] is not None:
            base = _make_slug(data["slug"] or upd.get("title") or doc["title"])
            if base != doc["slug"]:
                upd["slug"] = await _unique_slug(db, base, exclude_id=post_id)
        if "title" in data and data["title"] is not None and "slug" not in upd:
            # If user changed the title but not slug, keep current slug (stable URLs).
            pass

        if not upd:
            return BlogPostOut(**_enrich(doc))
        upd["updated_at"] = _now_iso()
        await db.blog_posts.update_one({"id": post_id}, {"$set": upd})
        doc.update(upd)
        return BlogPostOut(**_enrich(doc))

    @router.delete("/admin/blog/posts/{post_id}")
    async def delete(post_id: str, _user=Depends(admin_user)):
        res = await db.blog_posts.delete_one({"id": post_id})
        if res.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Статтю не знайдено")
        return {"deleted": True, "id": post_id}

    @router.post("/admin/blog/upload-image")
    async def upload_image(file: UploadFile = File(...), _user=Depends(admin_user)):
        ctype = (file.content_type or "").lower()
        if ctype not in ALLOWED_MIMES:
            raise HTTPException(
                status_code=400,
                detail=f"Непідтримуваний тип файлу: {ctype}. Дозволені: {list(ALLOWED_MIMES)}",
            )
        # Stream-read and limit size
        data = await file.read()
        if len(data) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="Файл занадто великий (макс. 10MB)")
        ext = ALLOWED_MIMES[ctype]
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
