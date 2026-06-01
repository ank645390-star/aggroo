from fastapi import FastAPI, APIRouter
from fastapi.responses import Response
from starlette.middleware.gzip import GZipMiddleware
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# Include the router in the main app
app.include_router(api_router)

# Cart API (server-side persistence for the shopping cart)
from cart_routes import build_cart_router  # noqa: E402
from profile_routes import build_profile_router  # noqa: E402
from addresses_routes import build_addresses_router  # noqa: E402
from orders_routes import build_orders_router  # noqa: E402
from np_routes import build_np_router  # noqa: E402
from up_routes import build_up_router  # noqa: E402
from auth_routes import build_auth_router  # noqa: E402
from callback_routes import build_callback_router  # noqa: E402
from admin_routes import build_admin_router  # noqa: E402
from faq_routes import build_faq_router, seed_faq_if_empty  # noqa: E402
from contact_info_routes import build_contact_info_router  # noqa: E402
from cultures_routes import build_cultures_router, seed_cultures_if_empty  # noqa: E402
from trusted_partners_routes import build_trusted_partners_router, seed_partners_if_empty, backfill_partner_links  # noqa: E402
from contact_messages_routes import build_contact_messages_router  # noqa: E402
from blog_routes import build_blog_router, seed_blog_if_empty, UPLOAD_DIR as BLOG_UPLOAD_DIR  # noqa: E402
from reviews_routes import build_reviews_router, seed_reviews_if_empty, seed_product_linked_reviews, UPLOAD_DIR as REVIEWS_UPLOAD_DIR  # noqa: E402
from policies_routes import build_policies_router, seed_policies_if_empty  # noqa: E402
from inside_routes import build_inside_router, seed_inside_tabs_if_empty  # noqa: E402
from products import (  # noqa: E402
    build_products_router,
    seed_products_if_empty,
    seed_product_categories_if_empty,
    backfill_product_descriptions,
    ensure_adjuvant_products,
    UPLOAD_DIR as PRODUCTS_UPLOAD_DIR,
)
from products.seed import backfill_product_pricing_variants, populate_spotlight_product, backfill_product_rating_baselines, ensure_default_agronomist_choice, backfill_product_full_titles  # noqa: E402
from products.utils import recompute_all_products_ratings  # noqa: E402
from sales import build_sales_router, migrate_orders_payment_fields, seed_demo_upsells_if_empty  # noqa: E402
from sales.orders_admin import PROOF_DIR as PAYMENT_PROOF_DIR  # noqa: E402
from discounts_routes import build_discounts_router, seed_default_discount_rules  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402
app.include_router(build_cart_router(db), prefix="/api")
app.include_router(build_profile_router(db), prefix="/api")
app.include_router(build_addresses_router(db), prefix="/api")
app.include_router(build_orders_router(db), prefix="/api")
app.include_router(build_np_router(), prefix="/api")
app.include_router(build_up_router(), prefix="/api")
app.include_router(build_auth_router(db), prefix="/api")
app.include_router(build_callback_router(db), prefix="/api")
app.include_router(build_admin_router(db), prefix="/api")
app.include_router(build_faq_router(db), prefix="/api")
app.include_router(build_contact_info_router(db), prefix="/api")
app.include_router(build_cultures_router(db), prefix="/api")
app.include_router(build_trusted_partners_router(db), prefix="/api")
app.include_router(build_contact_messages_router(db), prefix="/api")
app.include_router(build_blog_router(db), prefix="/api")
app.include_router(build_products_router(db), prefix="/api")
app.include_router(build_reviews_router(db), prefix="/api")
app.include_router(build_policies_router(db), prefix="/api")
app.include_router(build_inside_router(db), prefix="/api")
app.include_router(build_sales_router(db), prefix="/api")
app.include_router(build_discounts_router(db), prefix="/api")


# ====================================================================
# Dynamic sitemap.xml + robots.txt for SEO
# ------------------------------------------------------------
# These are served at the ROOT (NOT /api/*) so search engines can
# crawl them at the conventional path. We override the static files
# in /public/ with live data: products + blog posts always reflect
# the latest catalog/content.
# ====================================================================
SITE_BASE_URL = os.environ.get("SITE_BASE_URL", "https://tamis-agro.ua")


@app.get("/sitemap.xml", include_in_schema=False)
async def dynamic_sitemap():
    """Live sitemap covering static pages + all published products
    + published blog posts. Cached for 1 hour at CDN level."""
    static_urls = [
        ("", "weekly", "1.0"),
        ("catalog", "daily", "0.9"),
        ("cultures", "weekly", "0.8"),
        ("about", "monthly", "0.7"),
        ("contacts", "monthly", "0.6"),
        ("blog", "weekly", "0.7"),
    ]
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for path, freq, prio in static_urls:
        loc = f"{SITE_BASE_URL}/{path}".rstrip("/") + ("/" if not path else "")
        if path:
            loc = f"{SITE_BASE_URL}/{path}"
        else:
            loc = f"{SITE_BASE_URL}/"
        lines.append(
            f"  <url><loc>{loc}</loc><changefreq>{freq}</changefreq>"
            f"<priority>{prio}</priority></url>"
        )
    try:
        # Products
        async for p in db.products.find(
            {"is_published": {"$ne": False}}, {"slug": 1, "updated_at": 1}
        ):
            slug = p.get("slug")
            if not slug:
                continue
            lastmod = p.get("updated_at")
            if isinstance(lastmod, datetime):
                lastmod = lastmod.isoformat()
            lm_tag = f"<lastmod>{lastmod[:10]}</lastmod>" if lastmod else ""
            lines.append(
                f"  <url><loc>{SITE_BASE_URL}/product/{slug}</loc>"
                f"{lm_tag}<changefreq>weekly</changefreq>"
                f"<priority>0.8</priority></url>"
            )
        # Blog posts
        async for b in db.blog_posts.find(
            {"published": {"$ne": False}}, {"slug": 1, "updated_at": 1}
        ):
            slug = b.get("slug")
            if not slug:
                continue
            lastmod = b.get("updated_at")
            if isinstance(lastmod, datetime):
                lastmod = lastmod.isoformat()
            lm_tag = f"<lastmod>{lastmod[:10]}</lastmod>" if lastmod else ""
            lines.append(
                f"  <url><loc>{SITE_BASE_URL}/blog/{slug}</loc>"
                f"{lm_tag}<changefreq>monthly</changefreq>"
                f"<priority>0.5</priority></url>"
            )
    except Exception as e:
        logging.getLogger(__name__).warning(f"[sitemap] failed to enrich: {e}")
    lines.append("</urlset>")
    xml = "\n".join(lines)
    return Response(
        content=xml,
        media_type="application/xml",
        headers={"Cache-Control": "public, max-age=3600"},
    )


@app.get("/robots.txt", include_in_schema=False)
async def dynamic_robots():
    body = (
        "# robots.txt — TAMIS АГРО (dynamic)\n"
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /admin\n"
        "Disallow: /admin/\n"
        "Disallow: /api/\n"
        "Disallow: /checkout\n"
        "Disallow: /profile\n"
        "Disallow: /profile/\n"
        "\n"
        f"Sitemap: {SITE_BASE_URL}/sitemap.xml\n"
    )
    return Response(
        content=body,
        media_type="text/plain",
        headers={"Cache-Control": "public, max-age=86400"},
    )

# Static files: blog uploaded images (served at /api/uploads/blog/<filename>)
# Mounted on /api/* so it goes through the same ingress route as other API endpoints.
BLOG_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/api/uploads/blog", StaticFiles(directory=str(BLOG_UPLOAD_DIR)), name="blog-uploads")

# Static files: product uploaded images (served at /api/uploads/products/<filename>)
PRODUCTS_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/api/uploads/products", StaticFiles(directory=str(PRODUCTS_UPLOAD_DIR)), name="product-uploads")

# Static files: review uploaded images (served at /api/uploads/reviews/<filename>)
REVIEWS_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/api/uploads/reviews", StaticFiles(directory=str(REVIEWS_UPLOAD_DIR)), name="reviews-uploads")

# Static files: payment proof uploads (admin + customer)
PAYMENT_PROOF_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/api/uploads/payment_proofs", StaticFiles(directory=str(PAYMENT_PROOF_DIR)), name="payment-proofs")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# ====================================================================
# Performance: gzip compression for JSON/HTML/text responses
# (binary uploads already compressed — gzip won't hurt them; min_size=500
# skips tiny responses where overhead > savings).
# ====================================================================
app.add_middleware(GZipMiddleware, minimum_size=500, compresslevel=6)


# ====================================================================
# Cache-Control middleware for /api/uploads/* and other static assets.
# Image proofs / product images don't change after upload (hashed names)
# so we can safely cache them for ~30 days at the CDN/browser level.
# This drastically reduces repeat-load bandwidth and improves Core Web
# Vitals (LCP) for any user revisiting the site.
# ====================================================================
@app.middleware("http")
async def add_static_cache_headers(request, call_next):
    response = await call_next(request)
    try:
        path = request.url.path
        if path.startswith("/api/uploads/"):
            # immutable assets with content-addressable URLs (hashed names)
            response.headers.setdefault(
                "Cache-Control", "public, max-age=2592000, immutable"
            )
    except Exception:
        pass
    return response

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


# ====================================================================
# Seed test account on startup — idempotent.
# Дозволяє швидко перевірити авторизований flow без власної реєстрації.
# Credentials передаємо назад у відповідь /api/auth/test-account,
# або просто фіксуємо тут у коді (тест, не продакшн).
# ====================================================================
TEST_ACCOUNT_EMAIL = "test@tamis.ua"
TEST_ACCOUNT_PASSWORD = "test1234"
TEST_ACCOUNT_SESSION_ID = "tamis-demo-session-001"

ADMIN_ACCOUNT_EMAIL = "admin@tamis.ua"
ADMIN_ACCOUNT_PASSWORD = "admin1234"


@app.on_event("startup")
async def seed_test_account():
    try:
        import bcrypt as _bcrypt
        # 1) User
        existing = await db.users.find_one({"email": TEST_ACCOUNT_EMAIL})
        if not existing:
            uid = str(uuid.uuid4())
            await db.users.insert_one({
                "id": uid,
                "email": TEST_ACCOUNT_EMAIL,
                "password_hash": _bcrypt.hashpw(
                    TEST_ACCOUNT_PASSWORD.encode("utf-8"), _bcrypt.gensalt()
                ).decode("utf-8"),
                "firstName": "Тарас",
                "lastName": "Демченко",
                "phone": "+380 (50) 123 45 67",
                "session_ids": [TEST_ACCOUNT_SESSION_ID],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })
            logger.info(f"[seed] test account created: {TEST_ACCOUNT_EMAIL}")
        else:
            # ensure session_id is bound
            if TEST_ACCOUNT_SESSION_ID not in (existing.get("session_ids") or []):
                await db.users.update_one(
                    {"id": existing["id"]},
                    {"$push": {"session_ids": TEST_ACCOUNT_SESSION_ID}},
                )

        # 2) Profile prefill (legacy session-based)
        await db.profiles.update_one(
            {"session_id": TEST_ACCOUNT_SESSION_ID},
            {"$setOnInsert": {
                "session_id": TEST_ACCOUNT_SESSION_ID,
                "firstName": "Тарас",
                "lastName": "Демченко",
                "email": TEST_ACCOUNT_EMAIL,
                "phone": "+380 (50) 123 45 67",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )

        # 3) Sample saved addresses (2 шт.) — щоб у Saved-addresses dropdown було щось видно
        # ВАЖЛИВО: addresses зберігаються як ОДИН документ з масивом items
        existing_doc = await db.addresses.find_one({"session_id": TEST_ACCOUNT_SESSION_ID})
        if not existing_doc or not (existing_doc.get("items") or []):
            now_iso = datetime.now(timezone.utc).isoformat()
            seed_items = [
                {
                    "id": str(uuid.uuid4()),
                    "carrier": "novaposhta",
                    "title": "Дім",
                    "firstName": "Тарас",
                    "lastName": "Демченко",
                    "phone": "+380 (50) 123 45 67",
                    "city": "Київ",
                    "deliveryMode": "branch",
                    "branch": "Відділення №3, вул. Антоновича, 102",
                    "street": "",
                    "zip": "",
                    "isPrimary": True,
                    "created_at": now_iso,
                    "updated_at": now_iso,
                },
                {
                    "id": str(uuid.uuid4()),
                    "carrier": "ukrposhta",
                    "title": "Офіс",
                    "firstName": "Тарас",
                    "lastName": "Демченко",
                    "phone": "+380 (50) 123 45 67",
                    "city": "Львів",
                    "deliveryMode": "courier",
                    "branch": "",
                    "street": "вул. Шевченка 35, оф. 4",
                    "zip": "79000",
                    "isPrimary": False,
                    "created_at": now_iso,
                    "updated_at": now_iso,
                },
            ]
            await db.addresses.update_one(
                {"session_id": TEST_ACCOUNT_SESSION_ID},
                {"$set": {
                    "session_id": TEST_ACCOUNT_SESSION_ID,
                    "items": seed_items,
                    "updated_at": now_iso,
                }, "$setOnInsert": {"created_at": now_iso}},
                upsert=True,
            )
            logger.info("[seed] test account: 2 demo addresses created (items[])")
    except Exception as e:
        logger.warning(f"[seed] test account skipped: {e}")

    # === Seed admin account ===
    try:
        import bcrypt as _bcrypt
        admin = await db.users.find_one({"email": ADMIN_ACCOUNT_EMAIL})
        if not admin:
            await db.users.insert_one({
                "id": str(uuid.uuid4()),
                "email": ADMIN_ACCOUNT_EMAIL,
                "password_hash": _bcrypt.hashpw(
                    ADMIN_ACCOUNT_PASSWORD.encode("utf-8"), _bcrypt.gensalt()
                ).decode("utf-8"),
                "firstName": "Адміністратор",
                "lastName": "TAMIS",
                "phone": "",
                "role": "admin",
                "session_ids": [],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })
            logger.info(f"[seed] admin account created: {ADMIN_ACCOUNT_EMAIL}")
        elif admin.get("role") != "admin":
            await db.users.update_one(
                {"id": admin["id"]},
                {"$set": {"role": "admin"}},
            )
            logger.info(f"[seed] admin role applied to existing user: {ADMIN_ACCOUNT_EMAIL}")

        # default admin settings doc (idempotent)
        await db.admin_settings.update_one(
            {"_id": "main"},
            {"$setOnInsert": {
                "_id": "main",
                "channel": "none",
                "telegram_bot_token": "",
                "telegram_chat_id": "",
                "smtp_host": "",
                "smtp_port": 465,
                "smtp_user": "",
                "smtp_password": "",
                "smtp_use_tls": True,
                "from_email": "",
                "to_email": "",
                "site_name": "TAMIS АГРО",
                "google_client_id": "539552820560-pso3qndegrntp46oneml9nr33t7rpi9j.apps.googleusercontent.com",
                "google_enabled": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )
    except Exception as e:
        logger.warning(f"[seed] admin account skipped: {e}")

    # Seed FAQ defaults
    try:
        await seed_faq_if_empty(db)
    except Exception as e:
        logger.warning(f"[seed] faq skipped: {e}")

    # Seed Cultures defaults
    try:
        await seed_cultures_if_empty(db)
    except Exception as e:
        logger.warning(f"[seed] cultures skipped: {e}")

    # Seed Trusted Partners defaults
    try:
        await seed_partners_if_empty(db)
    except Exception as e:
        logger.warning(f"[seed] trusted_partners skipped: {e}")

    # Migration: backfill empty link_url for existing default partners
    # (idempotent — keeps admin-edited links intact).
    try:
        await backfill_partner_links(db)
    except Exception as e:
        logger.warning(f"[migrate] trusted_partners link backfill skipped: {e}")

    # Seed Blog default posts (8 published posts)
    try:
        await seed_blog_if_empty(db)
    except Exception as e:
        logger.warning(f"[seed] blog skipped: {e}")

    # Seed Reviews defaults (5 farmer reviews on the welcome page)
    try:
        await seed_reviews_if_empty(db)
    except Exception as e:
        logger.warning(f"[seed] reviews skipped: {e}")

    # Seed Product Categories (filter taxonomy) — must run BEFORE products
    try:
        await seed_product_categories_if_empty(db)
    except Exception as e:
        logger.warning(f"[seed] product_categories skipped: {e}")

    # Seed Products with default catalog (20 items)
    try:
        await seed_products_if_empty(db)
    except Exception as e:
        logger.warning(f"[seed] products skipped: {e}")

    # Ensure adjuvant ("Допоміжні речовини") category has products — idempotent.
    try:
        await ensure_adjuvant_products(db)
    except Exception as e:
        logger.warning(f"[seed] adjuvant products skipped: {e}")

    # Migration: backfill `description` block for products created before the schema upgrade.
    # Idempotent — only updates documents missing the new fields.
    try:
        await backfill_product_descriptions(db)
    except Exception as e:
        logger.warning(f"[migrate] backfill description skipped: {e}")

    # Migration: backfill storage attributes & default pricing variants (1L/5L/10L).
    try:
        await backfill_product_pricing_variants(db)
    except Exception as e:
        logger.warning(f"[migrate] backfill variants skipped: {e}")

    # Migration: backfill `full_title` for two-color H1 + ensure flores/venator
    # showcase products have proper gallery (5 photos) and correct category.
    try:
        await backfill_product_full_titles(db)
    except Exception as e:
        logger.warning(f"[migrate] backfill full_title skipped: {e}")

    # Spotlight: populate `venator` with rich, sales-ready content (idempotent).
    try:
        await populate_spotlight_product(db)
    except Exception as e:
        logger.warning(f"[migrate] spotlight product skipped: {e}")

    # Seed product-linked reviews (must run AFTER products seed).
    try:
        await seed_product_linked_reviews(db)
    except Exception as e:
        logger.warning(f"[seed] product-linked reviews skipped: {e}")

    # Migration: backfill manual_rating / manual_reviews baselines.
    try:
        await backfill_product_rating_baselines(db)
    except Exception as e:
        logger.warning(f"[migrate] product rating baselines skipped: {e}")

    # Recompute effective rating/reviews for every product (incl. real reviews).
    try:
        n = await recompute_all_products_ratings(db)
        if n:
            logger.info(f"[migrate] products: recomputed effective ratings on {n} products")
    except Exception as e:
        logger.warning(f"[migrate] recompute ratings skipped: {e}")

    # Default "Вибір агрономів" — first 9 products if admin hasn't selected any.
    try:
        await ensure_default_agronomist_choice(db)
    except Exception as e:
        logger.warning(f"[migrate] default agronomist_choice skipped: {e}")

    # Seed Site Policies (cookie / privacy / terms) — idempotent.
    try:
        await seed_policies_if_empty(db)
    except Exception as e:
        logger.warning(f"[seed] policies skipped: {e}")

    # Seed Inside Tabs (Зазирни всередину) + meta — idempotent.
    try:
        await seed_inside_tabs_if_empty(db)
    except Exception as e:
        logger.warning(f"[seed] inside_tabs skipped: {e}")

    # Sales / CRM migrations — backfill orders + seed demo upsell rules.
    try:
        await migrate_orders_payment_fields(db)
    except Exception as e:
        logger.warning(f"[migrate] sales orders skipped: {e}")
    try:
        await seed_demo_upsells_if_empty(db)
    except Exception as e:
        logger.warning(f"[seed] sales upsells skipped: {e}")

    # Seed default discount rules (matches the previous "100 L → 5%" mock).
    try:
        await seed_default_discount_rules(db)
    except Exception as e:
        logger.warning(f"[seed] discount_rules skipped: {e}")


@app.get("/api/auth/test-credentials")
async def test_credentials():
    """Returns demo credentials so the frontend can show a hint."""
    return {
        "email": TEST_ACCOUNT_EMAIL,
        "password": TEST_ACCOUNT_PASSWORD,
    }