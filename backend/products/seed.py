"""
Idempotent seeding for products + product_categories collections.

We seed with the same data that previously lived in
frontend/src/data/products.ts so the catalogue page renders
immediately after fresh deployment.
"""
from __future__ import annotations

import uuid
import logging
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorDatabase

from .utils import text_to_slug

logger = logging.getLogger(__name__)


DEFAULT_CATEGORIES = [
    {"slug": "biopesticide",  "label": "Біоінсектициди",      "sort_order": 1},
    {"slug": "macro",         "label": "Макро та мікроелементи", "sort_order": 2},
    {"slug": "inoculant",     "label": "Інокулянти",          "sort_order": 3},
    {"slug": "adjuvant",      "label": "Допоміжні речовини",  "sort_order": 4},
    {"slug": "rodenticide",   "label": "Родентициди",         "sort_order": 5},
    {"slug": "organic",       "label": "Органічні добрива",   "sort_order": 6},
]


PHOTOS = [
    "/Photo@2x.webp", "/Photo1@2x.webp", "/Photo2@2x.webp",
    "/Photo3@2x.webp", "/Photo4@2x.webp", "/Photo5@2x.webp",
    "/Photo6@2x.webp", "/Photo7@2x.webp", "/Photo8@2x.webp",
]

# Default rich-tab content used as template for every seeded product so the
# /product internal page works out of the box.
_DEFAULT_DESCRIPTION_HTML = """
<p><b>Проблема.</b> Протягом вегетаційного періоду рослини піддаються впливу <b>великої кількості стресових факторів</b>: пестицидні навантаження, несприятливі погодні умови, механічні пошкодження та погіршення живлення.</p>
<p><b>Рішення.</b> Комплексний біопрепарат на основі живих культур бактерій, амінокислот та мікроелементів. Активізує поділ клітин кореневої системи та стимулює поглинання елементів живлення.</p>
""".strip()

_DEFAULT_DOSAGE = {
    "title": "Дозування",
    "intro": "",
    "items": [
        {"text": "Польові культури — <b>0,5–1,0 л/га</b>"},
        {"text": "Овочеві культури — <b>0,3–0,7 л/га</b>"},
        {"text": "Плодові та ягідні — <b>0,7–1,2 л/га</b>"},
        {"text": "Кратність обробок: 2–3 рази за вегетацію"},
    ],
    "note": "Обробку проводити в ранкові або вечірні години при температурі 15–25°C, у безвітряну погоду.",
}

_DEFAULT_COMPOSITION = {
    "title": "Склад",
    "intro": "",
    "items": [
        {"text": "<b>Bacillus subtilis</b> — 1×10⁹ КУО/мл"},
        {"text": "Амінокислоти рослинного походження — 12%"},
        {"text": "Гумінові кислоти — 3%"},
        {"text": "Мікроелементи (Zn, Mn, Cu, Mo, B) — у хелатній формі"},
        {"text": "Стабілізатор pH-балансу — органічного походження"},
    ],
    "note": "",
}

_DEFAULT_COMPATIBILITY = {
    "title": "Сумісність",
    "intro": "Препарат сумісний з більшістю засобів захисту рослин та водорозчинних добрив. Рекомендовано перед змішуванням провести тест на сумісність у малих об’ємах.",
    "items": [
        {"text": "Сумісний: фунгіциди, інсектициди, водорозчинні добрива"},
        {"text": "Не сумісний: засоби з лужною реакцією (pH &gt; 8)"},
        {"text": "Інтервал застосування з гербіцидами — мінімум 5 днів"},
    ],
    "note": "",
}

_DEFAULT_SPECS = {
    "title": "Характеристика",
    "intro": "",
    "items": [
        {"text": "Форма випуску: рідкий концентрат"},
        {"text": "Колір: світло-коричневий"},
        {"text": "pH розчину: 6,5–7,5"},
        {"text": "Термін придатності: 24 місяці"},
        {"text": "Температура зберігання: +5…+25°C"},
        {"text": "Фасування: 1 л / 5 л / 10 л / 20 л"},
        {"text": "Сертифікація: придатний для органічного землеробства"},
    ],
    "note": "",
}


def _build_default_tabs():
    return {
        "description_html": _DEFAULT_DESCRIPTION_HTML,
        "dosage": dict(_DEFAULT_DOSAGE),
        "composition": dict(_DEFAULT_COMPOSITION),
        "compatibility": dict(_DEFAULT_COMPATIBILITY),
        "specs": dict(_DEFAULT_SPECS),
    }


def _build_default_description(product_name: str, short_desc: str) -> dict:
    """Return the Figma-style Опис block used as default for every seeded product."""
    return {
        "hero_image": "/tree.webp",
        "title_line1": "Відновлення",
        "title_line2": "після стресу.",
        "title_subline": "Стабільний врожай.",
        "chips": [
            {
                "icon": "lightning",
                "title": "Швидке відновлення",
                "body": "Відновлення життєдіяльності рослин після стресу протягом короткого терміну",
                "variant": "green",
            },
            {
                "icon": "eco",
                "title": "Ідеальний pH-баланс води",
                "body": "Захищає дорогі пестициди від швидкого руйнування у жорсткій воді, покращуючи їх сумісність із рослиною.",
                "variant": "dark",
            },
            {
                "icon": "drop",
                "title": "Покращення поглинання",
                "body": "Впливає на рівномірне покриття листя та засвоєння активних речовин",
                "variant": "cream",
            },
        ],
        "problem": {
            "title": "Проблема",
            "intro_html": (
                "Протягом вегетаційного періоду рослини піддаються впливу "
                "<b>великої кількості стресових факторів</b>: пестицидні навантаження, "
                "несприятливі погодні умови (температура, вологість), механічні пошкодження, "
                "градобій, погіршення живлення та ін."
            ),
            "outro_html": (
                "Це призводить до погіршення росту рослин, зниженню їх продуктивності, "
                "а іноді й до їх загибелі."
            ),
        },
        "solution": {
            "title": "Рішення",
            "intro_html": (
                f"<b>{product_name}</b> — препарат на основі живих культур бактерій, "
                "амінокислот та мікроелементів. Відновлює біохімічні процеси у рослині після "
                "впливу стресових факторів. Активізує поділ клітин кореневої системи, "
                "завдяки чому рослина через молоді кореневі волоски інтенсивно поглинає "
                "елементи живлення та вологу."
            ),
            "outro_html": (
                "Рослина <span style=\"color:#b3d217\">швидше виходить зі стресу</span> "
                "і спрямовує енергію на ріст та формування врожаю. "
                "<span style=\"color:#b3d217\">Врожай стабільніший</span> навіть у складні сезони."
            ),
        },
    }


DEFAULT_PRODUCTS = [
    dict(slug="venator",   name="Венатор",   full_title='Біологічний родентицид нового покоління "ВЕНАТОР" (VENATOR)', short_desc="біологічний родентицид",                                  category="rodenticide",  photo=PHOTOS[0], price=420, default_volume="5 Л", packing="1, 5, 10 л", norm="1.5–2 л/га",   in_stock=True,  rating=4.9, reviews=100, is_hit=True),
    dict(slug="flores",    name="Флорес",    full_title='Антистресант зі стимулюючим ефектом "ФЛОРЕС" (FLORES)', short_desc="комплексний антистресант зі стимулюючим ефектом",         category="macro",        photo=PHOTOS[1], price=380, default_volume="5 Л", packing="1, 5, 10 л", norm="0,5-1,0 л/га", in_stock=True,  rating=4.9, reviews=100, is_hit=True),
    dict(slug="agrostim",  name="Агростим",  short_desc="макро та мікро елементи для обробки зернобобових",        category="macro",        photo=PHOTOS[2], price=290, default_volume="5 Л", packing="1, 5, 10 л", norm="1–2 л/га",    in_stock=True,  rating=4.7, reviews=62),
    dict(slug="gladiator", name="Гладіатор", short_desc="потужний біоінсектицид широкого спектру",                  category="biopesticide", photo=PHOTOS[3], price=510, default_volume="5 Л", packing="1, 5, 10 л", norm="0.5–1 л/га",  in_stock=True,  rating=4.9, reviews=142, is_hit=True),
    dict(slug="rodentmax", name="РодентМакс", short_desc="родентицид-приманка тривалої дії",                         category="rodenticide",  photo=PHOTOS[4], price=350, default_volume="5 Л", packing="1, 5, 10 л", norm="1–1.5 кг/га",  in_stock=True,  rating=4.6, reviews=48),
    dict(slug="biogumin",  name="Біогумін",  short_desc="органічне добриво на основі вермікомпосту",                  category="organic",      photo=PHOTOS[5], price=220, default_volume="5 Л", packing="1, 5, 10 л", norm="3–5 л/га",    in_stock=True,  rating=4.5, reviews=30),
    dict(slug="nodulin",   name="Нодулін",   short_desc="інокулянт для сої та інших бобових",                          category="inoculant",    photo=PHOTOS[6], price=410, default_volume="5 Л", packing="1, 5, 10 л", norm="2 л/т",        in_stock=False, rating=4.7, reviews=56,  is_new=True),
    dict(slug="ekobio",    name="ЕкоБіо",    short_desc="біоінсектицид для захисту садових культур",               category="biopesticide", photo=PHOTOS[7], price=480, default_volume="5 Л", packing="1, 5, 10 л", norm="1–2 л/га",    in_stock=True,  rating=4.4, reviews=22),
    dict(slug="mineral-10", name="Мінерал-10", short_desc="макро та мікро елементи для всіх типів культур",        category="macro",        photo=PHOTOS[8], price=310, default_volume="5 Л", packing="1, 5, 10 л", norm="1–3 л/га",    in_stock=True,  rating=4.8, reviews=71,  is_hit=True),
    dict(slug="kompost-plus", name="Компост-Плюс", short_desc="органічне добриво гранульоване",                       category="organic",      photo=PHOTOS[0], price=180, default_volume="5 Л", packing="5, 10, 25 кг", norm="0.5 т/га",   in_stock=True,  rating=4.6, reviews=39),
    dict(slug="rapidkil",  name="РапідКіл",  short_desc="родентицид швидкої дії",                                  category="rodenticide",  photo=PHOTOS[1], price=395, default_volume="5 Л", packing="1, 5, 10 л", norm="1–1.5 кг/га",  in_stock=True,  rating=4.5, reviews=28),
    dict(slug="fitoplant", name="ФітоПлант", short_desc="комплексне макродобриво для злакових",                    category="macro",        photo=PHOTOS[2], price=275, default_volume="5 Л", packing="1, 5, 10 л", norm="1–2 л/га",    in_stock=True,  rating=4.7, reviews=53),
    dict(slug="bioshield", name="БіоЩит",    short_desc="біоінсектицид проти ґрунтових шкідників",                 category="biopesticide", photo=PHOTOS[3], price=530, default_volume="5 Л", packing="1, 5, 10 л", norm="0.5–1 л/га",  in_stock=False, rating=4.9, reviews=117, is_new=True),
    dict(slug="rizotum",   name="Різотум",   short_desc="інокулянт для гороху та люцерни",                         category="inoculant",    photo=PHOTOS[4], price=365, default_volume="5 Л", packing="1, 5, 10 л", norm="1.5 л/т",      in_stock=True,  rating=4.6, reviews=42),
    dict(slug="vermosol",  name="ВермоСол",  short_desc="органічне добриво рідке",                                  category="organic",      photo=PHOTOS[5], price=240, default_volume="5 Л", packing="1, 5, 10 л", norm="2–4 л/га",    in_stock=True,  rating=4.5, reviews=33),
    dict(slug="ratstop",   name="РатСтоп",   short_desc="родентицид у пастках та зернах",                           category="rodenticide",  photo=PHOTOS[6], price=340, default_volume="5 Л", packing="1, 5, 10 л", norm="1 кг/га",     in_stock=True,  rating=4.4, reviews=21),
    dict(slug="microset",  name="МікроСет",  short_desc="комплекс мікроелементів для позакореневого підживлення",  category="macro",        photo=PHOTOS[7], price=320, default_volume="5 Л", packing="1, 5, 10 л", norm="1–1.5 л/га",  in_stock=True,  rating=4.8, reviews=65,  is_hit=True),
    dict(slug="biograd",   name="БіоГрад",   short_desc="біоінсектицид проти попелиці та трипсів",                category="biopesticide", photo=PHOTOS[8], price=470, default_volume="5 Л", packing="1, 5, 10 л", norm="0.5–1 л/га",  in_stock=True,  rating=4.7, reviews=58),
    dict(slug="humatpro",  name="Гумат-Pro",  short_desc="органічне добриво з гумінових кислот",                  category="organic",      photo=PHOTOS[0], price=200, default_volume="5 Л", packing="1, 5, 10 л", norm="2–3 л/га",    in_stock=True,  rating=4.6, reviews=47),
    dict(slug="azotofix",  name="АзотоФікс", short_desc="інокулянт-фіксатор азоту для бобових",                    category="inoculant",    photo=PHOTOS[1], price=425, default_volume="5 Л", packing="1, 5, 10 л", norm="1.5–2 л/т",    in_stock=True,  rating=4.9, reviews=89,  is_new=True),
]


async def seed_product_categories_if_empty(db: AsyncIOMotorDatabase) -> None:
    """Idempotently ensure all DEFAULT_CATEGORIES exist.

    - If collection is empty → insert all defaults.
    - If collection has data → only insert missing slugs (and update sort_order
      so the new default order takes effect once on existing deployments).
    """
    now = datetime.now(timezone.utc).isoformat()
    existing_slugs = set()
    async for doc in db.product_categories.find({}, {"_id": 0, "slug": 1}):
        if doc.get("slug"):
            existing_slugs.add(doc["slug"])

    new_docs = []
    for c in DEFAULT_CATEGORIES:
        if c["slug"] not in existing_slugs:
            new_docs.append({
                "id": str(uuid.uuid4()),
                "slug": c["slug"],
                "label": c["label"],
                "sort_order": c["sort_order"],
                "active": True,
                "created_at": now,
                "updated_at": now,
            })
    if new_docs:
        await db.product_categories.insert_many(new_docs)
        logger.info(
            f"[seed] product_categories: inserted {len(new_docs)} missing "
            f"({', '.join(d['slug'] for d in new_docs)})"
        )

    # Keep sort_order aligned with current defaults (cheap update).
    # Also realign the macro label to "Макро та мікроелементи" if the older
    # short variant "Макро та Мікро" is still stored (1-time idempotent).
    for c in DEFAULT_CATEGORIES:
        update_doc = {"sort_order": c["sort_order"], "updated_at": now}
        # For "macro" — also bump the label to the new descriptive variant
        # IF it still equals the older default ("Макро та Мікро").
        if c["slug"] == "macro":
            existing_doc = await db.product_categories.find_one(
                {"slug": "macro"}, {"_id": 0, "label": 1}
            )
            if existing_doc and (existing_doc.get("label") or "") in (
                "Макро та Мікро",
                "Макро та мікро",
            ):
                update_doc["label"] = c["label"]
        await db.product_categories.update_one(
            {"slug": c["slug"]},
            {"$set": update_doc},
        )


async def seed_products_if_empty(db: AsyncIOMotorDatabase) -> None:
    existing = await db.products.count_documents({})
    if existing > 0:
        return
    now = datetime.now(timezone.utc).isoformat()
    docs = []
    for idx, p in enumerate(DEFAULT_PRODUCTS):
        slug = p.get("slug") or text_to_slug(p["name"])
        tabs = _build_default_tabs()
        # vary seo description from short_desc
        seo_title = f"{p['name']} — TAMIS АГРО"
        seo_desc = p["short_desc"]
        docs.append({
            "id": str(uuid.uuid4()),
            "slug": slug,
            "name": p["name"],
            "full_title": p.get("full_title", ""),
            "short_desc": p["short_desc"],
            "category": p["category"],
            "photo": p["photo"],
            "photos": [p["photo"]],
            "packing": p["packing"],
            "norm": p["norm"],
            "default_volume": p["default_volume"],
            "price": float(p["price"]),
            "variants": [],
            "in_stock": p["in_stock"],
            "rating": float(p["rating"]),
            "reviews": int(p["reviews"]),
            "is_hit": bool(p.get("is_hit", False)),
            "is_new": bool(p.get("is_new", False)),
            "sort_order": idx,
            "description_html": tabs["description_html"],
            "description_image": "",
            "description": _build_default_description(p["name"], p["short_desc"]),
            "dosage": tabs["dosage"],
            "composition": tabs["composition"],
            "compatibility": tabs["compatibility"],
            "specs": tabs["specs"],
            "seo_title": seo_title,
            "seo_description": seo_desc,
            "status": "published",
            "created_at": now,
            "updated_at": now,
        })
    if docs:
        await db.products.insert_many(docs)
        logger.info(f"[seed] products: inserted {len(docs)} default products")


async def backfill_product_descriptions(db: AsyncIOMotorDatabase) -> None:
    """
    One-time, idempotent migration: every existing product that is missing
    the new `description` block gets a sensible default populated using its
    own name + short_desc.

    IMPORTANT: this function NEVER overwrites an existing `problem.intro_html`
    — that block is treated as user-authored content (and also where imported
    real descriptions live). Only the missing sub-fields (chips, solution,
    hero_image, title lines) are filled in.

    Safe to call on every startup.
    """
    cursor = db.products.find({}, {"_id": 0})
    updated = 0
    async for doc in cursor:
        desc = doc.get("description")
        # If the description block is missing/invalid entirely → use full default.
        if not isinstance(desc, dict):
            new_desc = _build_default_description(doc.get("name", ""), doc.get("short_desc", ""))
            await db.products.update_one(
                {"id": doc["id"]},
                {"$set": {"description": new_desc, "updated_at": datetime.now(timezone.utc).isoformat()}},
            )
            updated += 1
            continue

        problem = desc.get("problem") or {}
        solution = desc.get("solution") or {}
        chips = desc.get("chips")
        has_problem_intro = bool(problem.get("intro_html"))
        has_solution_intro = bool(solution.get("intro_html"))
        has_chips = bool(chips)

        # Nothing to fill in?
        if has_problem_intro and has_solution_intro and has_chips:
            continue

        # Generate a default block as the source of fallback values.
        default = _build_default_description(doc.get("name", ""), doc.get("short_desc", ""))
        merged = dict(desc)
        # Preserve existing problem.intro_html if present; otherwise use default.
        merged_problem = dict(problem)
        if not has_problem_intro:
            merged_problem["title"] = problem.get("title") or default["problem"]["title"]
            merged_problem["intro_html"] = default["problem"]["intro_html"]
            merged_problem["outro_html"] = problem.get("outro_html") or default["problem"]["outro_html"]
        merged["problem"] = merged_problem
        # Same for solution
        merged_solution = dict(solution)
        if not has_solution_intro:
            merged_solution["title"] = solution.get("title") or default["solution"]["title"]
            merged_solution["intro_html"] = default["solution"]["intro_html"]
            merged_solution["outro_html"] = solution.get("outro_html") or default["solution"]["outro_html"]
        merged["solution"] = merged_solution
        if not has_chips:
            merged["chips"] = default["chips"]
        # Fill missing other fields without overwriting
        for k in ("hero_image", "title_line1", "title_line2", "title_subline"):
            if not merged.get(k):
                merged[k] = default.get(k, "")

        await db.products.update_one(
            {"id": doc["id"]},
            {"$set": {"description": merged, "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        updated += 1
    if updated:
        logger.info(f"[migrate] products: backfilled description on {updated} products")


# -----------------------------------------------------------------------------
# Migration: pricing variants + storage attributes (idempotent)
# -----------------------------------------------------------------------------
def _default_variants(price: float, packing: str | None):
    """Build 3 default variants (1L / 5L / 10L) where `price` is the TOTAL
    pack price (₴), and the base `price` argument is per-litre.

    Per-litre cost tiers: 1L = price*1.10 (small pack premium),
    5L = price (base), 10L = price*0.93 (bulk discount).
    Resulting total pack prices reflect realistic bulk savings.
    """
    if not price or price <= 0:
        return []
    return [
        {"volume": "1 Л",  "price": round(price * 1.10 * 1),  "sku": ""},
        {"volume": "5 Л",  "price": round(price * 1.00 * 5),  "sku": ""},
        {"volume": "10 Л", "price": round(price * 0.93 * 10), "sku": ""},
    ]


async def backfill_product_pricing_variants(db: AsyncIOMotorDatabase) -> None:
    """
    One-time, idempotent migration:
      • adds storage_temp / storage_period defaults if missing/empty
      • populates variants[] with 1L/5L/10L when none defined
    """
    cursor = db.products.find({}, {"_id": 0})
    updated = 0
    async for doc in cursor:
        updates: dict[str, object] = {}
        if not doc.get("storage_temp"):
            updates["storage_temp"] = "15-25°C"
        if not doc.get("storage_period"):
            updates["storage_period"] = "2 роки"
        # Backfill new feature-card fields (Культури / Бактерії роду)
        if "cultures" not in doc or not doc.get("cultures"):
            updates["cultures"] = "Всі культури"
        if "bacteria_genus" not in doc or not doc.get("bacteria_genus"):
            # Default to Bacillus subtilis for ALL products — per user spec
            # the feature card must always have 5 rows. Admin can override
            # per product if needed.
            updates["bacteria_genus"] = "Bacillus subtilis"
        # One-time normalization: clean up legacy storage values that
        # contain non-standard ellipsis "…" or verbose prose like
        # "у сухому місці" / "від дати виробництва". User asked for
        # short, clean values: "15-25°C" and "2 роки". Admin can still
        # override per product after this migration.
        st = (doc.get("storage_temp") or "").strip()
        if "…" in st or "у сухому" in st or "+5" in st:
            updates["storage_temp"] = "15-25°C"
        sp = (doc.get("storage_period") or "").strip()
        if "від дати" in sp or "24 місяці" in sp or "місяців від" in sp:
            updates["storage_period"] = "2 роки"
        if not doc.get("variants"):
            updates["variants"] = _default_variants(float(doc.get("price") or 0), doc.get("packing"))
        if not updates:
            continue
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.products.update_one({"id": doc["id"]}, {"$set": updates})
        updated += 1
    if updated:
        logger.info(f"[migrate] products: backfilled storage/variants on {updated} products")


# -----------------------------------------------------------------------------
# Spotlight product — fully populated example (idempotent)
# -----------------------------------------------------------------------------
SPOTLIGHT_SLUG = "venator"

_SPOTLIGHT_PAYLOAD = {
    "name": "Венатор",
    "short_desc": "родентицид з пастками + інокулянт-стимулятор для зернобобових",
    "category": "rodenticide",
    "price": 460,
    "default_volume": "5 Л",
    "packing": "1, 5, 10 л",
    "norm": "1,5–2 л/га",
    "storage_temp": "+5…+25 °C, у сухому місці",
    "storage_period": "24 місяці від дати виробництва",
    "in_stock": True,
    "is_hit": True,
    "is_new": False,
    "rating": 4.9,
    "reviews": 117,
    "variants": [
        {"volume": "1 Л",  "price": 506,  "sku": "VNT-1L"},
        {"volume": "5 Л",  "price": 2300, "sku": "VNT-5L"},
        {"volume": "10 Л", "price": 4278, "sku": "VNT-10L"},
    ],
    "description": {
        "hero_image": "/tree.webp",
        "title_line1": "Захист від гризунів",
        "title_line2": "та стрес-стимуляція.",
        "title_subline": "Подвійна дія в одній упаковці.",
        "chips": [
            {
                "icon": "lightning",
                "title": "Швидка дія",
                "body": "Перші результати — за 24–48 годин після внесення.",
                "variant": "green",
            },
            {
                "icon": "shield",
                "title": "Безпека для культури",
                "body": "Не пригнічує ріст і не накопичується у ґрунті.",
                "variant": "dark",
            },
            {
                "icon": "eco",
                "title": "Екологічність",
                "body": "Біодеградує протягом 14 днів, дозволено в IPM-схемах.",
                "variant": "cream",
            },
        ],
        "problem": {
            "title": "Проблема",
            "intro_html": (
                "Гризуни знищують до <b>20 % зернових і олійних посівів</b> ще до збирання, "
                "а тривалий стрес від посухи та шкідників послаблює рослину і знижує "
                "її імунітет."
            ),
            "outro_html": (
                "Класичні родентициди працюють точково, але <b>не вирішують стресового удару</b>, "
                "що отримує культура після пошкодження кореневої системи."
            ),
        },
        "solution": {
            "title": "Рішення",
            "intro_html": (
                "<b>Венатор</b> — це комбінований препарат, що одночасно <b>контролює популяцію "
                "гризунів</b> та запускає <b>стрес-протекторні механізми у рослині</b> "
                "за рахунок амінокислотного комплексу та хелатних мікроелементів."
            ),
            "outro_html": (
                "Результат: <span style=\"color:#b3d217\">стабільний приріст урожаю +12–18 %</span> "
                "проти контролю в умовах підвищеного інфекційного фону."
            ),
        },
    },
    "dosage": {
        "title": "Дозування",
        "intro": "Венатор сумісний з усіма основними способами внесення. Точне дотримання норми гарантує максимальний захист посівів та стрес-стимуляцію культури.",
        "items": [
            {"text": "<b>Передпосівна обробка насіння:</b> 1,5–2 л на 1 т насіння (робочий розчин 10–15 л/т)."},
            {"text": "<b>Позакореневе підживлення (фаза 3–5 листків):</b> 1 л/га, витрата робочого розчину 200–300 л/га."},
            {"text": "<b>Повторна обробка через 14–21 день:</b> 0,8 л/га у бакових сумішах з фунгіцидами / інсектицидами."},
            {"text": "<b>Кратність обробок:</b> 1–2 за сезон."},
        ],
        "note": "Працюйте у прохолодну погоду (до +25 °C). При перевищенні норми можливе тимчасове пожовтіння нижніх листків, що минає протягом 5–7 днів."
    },
    "composition": {
        "title": "Склад",
        "intro": "Концентрат суспензії (КС) на водній основі, без розчинників. pH робочого розчину 5,8–6,4 — безпечний для більшості ЗЗР.",
        "items": [
            {"text": "<b>Бродіфакум</b> — 0,005 % (родентицидний компонент тривалої дії)"},
            {"text": "<b>Хелати Fe, Mn, Zn, Cu</b> — 8 % сумарно (форма EDTA)"},
            {"text": "<b>Бор (B)</b> — 0,8 %, <b>Молібден (Mo)</b> — 0,05 %"},
            {"text": "<b>L-амінокислоти</b> (вільні + гідролізат) — 12 %"},
            {"text": "<b>Поверхнево-активні речовини</b> (адгезив + прилипач) — 3 %"},
        ],
        "note": "Не змішуйте з препаратами на основі мідного купоросу (CuSO₄) та бордоської рідини — це знижує біологічну активність родентицидного компонента."
    },
    "compatibility": {
        "title": "Сумісність",
        "intro": "Перед бак-сумішшю обов'язково проведіть тест-злиття у склянці на 10 хвилин. Відсутність розшарувань і пластівців підтверджує сумісність.",
        "items": [
            {"text": "<b>✓ Сумісний з гербіцидами:</b> гліфосат, 2,4-Д амінна сіль, метрибузин, флуміоксазин."},
            {"text": "<b>✓ Сумісний з інсектицидами:</b> більшість піретроїдів (циперметрин, лямбда-цигалотрин)."},
            {"text": "<b>✓ Сумісний з фунгіцидами:</b> тебуконазол, дифеноконазол, азоксистробін."},
            {"text": "<b>✗ Не сумісний</b> з препаратами на основі міді (CuSO₄, Cu(OH)₂)."},
            {"text": "<b>✗ Не сумісний</b> з сильно лужними розчинами (pH &gt; 8) та олійними емульсіями понад 3 %."},
        ],
        "note": "У разі сумнівів — звертайтеся до агрономів TAMIS АГРО за безкоштовною консультацією щодо бак-сумішей."
    },
    "specs": {
        "title": "Характеристика",
        "intro": "Офіційні параметри препарату згідно з реєстраційним свідоцтвом UA-2024-RDT-118.",
        "items": [
            {"text": "Діюча речовина — Бродіфакум 0,005 % + хелати Fe/Mn/Zn/Cu/B/Mo"},
            {"text": "Препаративна форма — КС (концентрат суспензії)"},
            {"text": "Норма витрати — 1,5–2 л/га"},
            {"text": "Кратність обробок — 1–2 за сезон"},
            {"text": "Період захисної дії — до 30 днів"},
            {"text": "Швидкість дії — 24–48 годин"},
            {"text": "Спектр дії — польова миша, хом’як, пацюк, ховрах"},
            {"text": "Клас небезпеки — ІІ (помірно небезпечний)"},
            {"text": "Період очікування до збирання — 20 днів"},
            {"text": "Виробник — TAMIS АГРО (Україна)"},
            {"text": "Реєстраційне свідоцтво — № UA-2024-RDT-118"},
            {"text": "Термін придатності — 24 місяці від дати виробництва"},
        ],
        "note": "Зберігати у щільно закупореній заводській тарі, окремо від харчових продуктів і кормів, у місці, недоступному для дітей та тварин."
    },
}


async def populate_spotlight_product(db: AsyncIOMotorDatabase) -> None:
    """
    Idempotent: applies the rich SPOTLIGHT payload to Venator if and only if
    its content still looks like the auto-generated default
    (we detect this by checking whether description.problem.intro_html still
    contains the auto-generated phrase "Залежність від погодних умов").
    Once a real admin edits the product, this migration becomes a no-op
    so we never overwrite manual changes.
    """
    doc = await db.products.find_one({"slug": SPOTLIGHT_SLUG}, {"_id": 0})
    if not doc:
        return
    desc = doc.get("description") or {}
    problem_intro = (desc.get("problem") or {}).get("intro_html") or ""
    dosage_items = (doc.get("dosage") or {}).get("items") or []
    # Apply spotlight if: no description yet, or auto-generated description still in place,
    # or dosage is still empty (i.e. user hasn't started filling tabs).
    is_auto_desc = (
        not problem_intro
        or "Протягом вегетаційного періоду" in problem_intro
        or "Залежність від погодних умов" in problem_intro
    )
    # Don't overwrite once the admin clearly started editing both description AND tabs
    if not is_auto_desc and len(dosage_items) > 0:
        return
    updates = dict(_SPOTLIGHT_PAYLOAD)
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.products.update_one({"slug": SPOTLIGHT_SLUG}, {"$set": updates})
    logger.info(f"[migrate] products: populated spotlight content on '{SPOTLIGHT_SLUG}'")



# -----------------------------------------------------------------------------
# Adjuvant ("Допоміжні речовини") products — ensure category has items
# -----------------------------------------------------------------------------
DEFAULT_ADJUVANT_PRODUCTS = [
    dict(
        slug="ph-balance",
        name="pH-Баланс",
        short_desc="регулятор кислотності робочого розчину для ЗЗР",
        category="adjuvant",
        photo=PHOTOS[0],
        price=185,
        default_volume="5 Л",
        packing="1, 5, 10 л",
        norm="50–150 мл/100 л",
        in_stock=True,
        rating=4.8,
        reviews=34,
        is_hit=True,
    ),
    dict(
        slug="surfacto",
        name="Сурфакто",
        short_desc="неіонний поверхнево-активний прилипач для обприскування",
        category="adjuvant",
        photo=PHOTOS[1],
        price=210,
        default_volume="5 Л",
        packing="1, 5, 10 л",
        norm="100–250 мл/га",
        in_stock=True,
        rating=4.7,
        reviews=41,
    ),
    dict(
        slug="anti-drift",
        name="Анти-Дрейф",
        short_desc="антизносний ад'ювант для зменшення дрейфу краплі",
        category="adjuvant",
        photo=PHOTOS[2],
        price=240,
        default_volume="5 Л",
        packing="1, 5, 10 л",
        norm="200–400 мл/га",
        in_stock=True,
        rating=4.6,
        reviews=22,
        is_new=True,
    ),
    dict(
        slug="aquafix",
        name="АкваФікс",
        short_desc="кондиціонер жорсткої води + хелатний стабілізатор",
        category="adjuvant",
        photo=PHOTOS[3],
        price=195,
        default_volume="5 Л",
        packing="1, 5, 10 л",
        norm="100–200 мл/100 л",
        in_stock=True,
        rating=4.9,
        reviews=58,
        is_hit=True,
    ),
]


async def ensure_adjuvant_products(db: AsyncIOMotorDatabase) -> None:
    """
    Idempotent: гарантує що в категорії "adjuvant" є хоча б базовий набір
    товарів. Запускається разом з іншими seed-функціями. Безпечно для
    повторних запусків — додає тільки відсутні slug-и.
    """
    # Якщо вже є adjuvant-товари — нічого не робимо
    existing_count = await db.products.count_documents({"category": "adjuvant"})
    if existing_count > 0:
        # Перевіримо, чи всі дефолтні slug-и присутні; якщо ні — додамо лише відсутні
        existing_slugs = set()
        async for d in db.products.find({"category": "adjuvant"}, {"_id": 0, "slug": 1}):
            if d.get("slug"):
                existing_slugs.add(d["slug"])
        missing = [p for p in DEFAULT_ADJUVANT_PRODUCTS if p["slug"] not in existing_slugs]
        if not missing:
            return
        target = missing
    else:
        target = list(DEFAULT_ADJUVANT_PRODUCTS)

    now = datetime.now(timezone.utc).isoformat()
    # знаходимо максимальний sort_order, щоб нові додались у кінець
    max_order_doc = await db.products.find_one({}, {"_id": 0, "sort_order": 1}, sort=[("sort_order", -1)])
    base_order = (max_order_doc or {}).get("sort_order", -1) + 1

    docs = []
    for idx, p in enumerate(target):
        slug = p["slug"]
        tabs = _build_default_tabs()
        docs.append({
            "id": str(uuid.uuid4()),
            "slug": slug,
            "name": p["name"],
            "short_desc": p["short_desc"],
            "category": p["category"],
            "photo": p["photo"],
            "photos": [p["photo"]],
            "packing": p["packing"],
            "norm": p["norm"],
            "default_volume": p["default_volume"],
            "price": float(p["price"]),
            "variants": _default_variants(float(p["price"]), p.get("packing")),
            "in_stock": p.get("in_stock", True),
            "rating": float(p["rating"]),
            "reviews": int(p["reviews"]),
            "is_hit": bool(p.get("is_hit", False)),
            "is_new": bool(p.get("is_new", False)),
            "sort_order": base_order + idx,
            "storage_temp": "+5…+25 °C",
            "storage_period": "24 місяці",
            "description_html": tabs["description_html"],
            "description_image": "",
            "description": _build_default_description(p["name"], p["short_desc"]),
            "dosage": tabs["dosage"],
            "composition": tabs["composition"],
            "compatibility": tabs["compatibility"],
            "specs": tabs["specs"],
            "seo_title": f"{p['name']} — TAMIS АГРО",
            "seo_description": p["short_desc"],
            "status": "published",
            "created_at": now,
            "updated_at": now,
        })

    if docs:
        await db.products.insert_many(docs)
        logger.info(
            f"[seed] adjuvant products: inserted {len(docs)} item(s) "
            f"({', '.join(d['slug'] for d in docs)})"
        )



# ====================================================================
# Migration: backfill manual_rating / manual_reviews + perform initial
# recompute of effective rating/reviews on every product.
#
# Логіка:
#   • manual_rating  ← (popередньо існуюче) product.rating
#   • manual_reviews ← (popередньо існуюче) product.reviews
#   • Якщо manual_* вже були виставлені раніше — не чіпаємо їх.
#   • Після backfill — викликаємо recompute_product_rating для кожного,
#     що враховує реальні відгуки з db.reviews (якщо є).
#
async def backfill_product_rating_baselines(db: AsyncIOMotorDatabase) -> int:
    """Зберегти поточні rating/reviews у нові поля manual_*."""
    n = 0
    cursor = db.products.find({"manual_rating": {"$exists": False}}, {"_id": 0, "id": 1, "rating": 1, "reviews": 1})
    async for p in cursor:
        update_doc = {
            "manual_rating": float(p.get("rating") or 4.7),
            "manual_reviews": int(p.get("reviews") or 0),
        }
        await db.products.update_one({"id": p["id"]}, {"$set": update_doc})
        n += 1
    if n:
        logger.info(f"[migrate] products: backfilled manual_rating/manual_reviews on {n} products")
    return n



# -----------------------------------------------------------------------------
# Migration: backfill `full_title` (descriptive H1) on all products + ensure
# showcase products (flores/venator) mostly fully populated for design review
# (gallery з 5 фото + правильна категорія + full_title).
#
# Idempotent: пропускає продукти, де full_title уже заповнено вручну і де
# галерея має > 1 фото. Перенастройка категорії — тільки для slug-ів зі списку.
# -----------------------------------------------------------------------------
_PRODUCT_FULL_TITLE_DEFAULTS: dict = {
    "flores": {
        "full_title": 'Антистресант зі стимулюючим ефектом "ФЛОРЕС" (FLORES)',
        "category": "macro",
        "short_desc": "комплексний антистресант зі стимулюючим ефектом",
        "photos": [
            "/Frame-4@3x.webp",
            "/Frame-1@3x.webp",
            "/Frame-5@3x.webp",
            "/Frame-190@2x.png",
            "/Frame-193@2x.png",
        ],
    },
    "venator": {
        "full_title": 'Біологічний родентицид нового покоління "ВЕНАТОР" (VENATOR)',
        "photos": [
            "/Frame-1@3x.webp",
            "/Frame-4@3x.webp",
            "/Frame-5@3x.webp",
            "/Frame-194@2x.png",
            "/Frame-195@2x.png",
        ],
    },
    "agrostim":   {"full_title": 'Стимулятор росту з мікроелементами "АГРОСТИМ" (AGROSTIM)'},
    "gladiator":  {"full_title": 'Біоінсектицид широкого спектру дії "ГЛАДІАТОР" (GLADIATOR)'},
    "rodentmax":  {"full_title": 'Родентицид-приманка тривалої дії "РОДЕНТМАКС" (RODENTMAX)'},
    "biogumin":   {"full_title": 'Органічне добриво на основі вермікомпосту "БІОГУМІН" (BIOGUMIN)'},
    "nodulin":    {"full_title": 'Інокулянт для сої та бобових культур "НОДУЛІН" (NODULIN)'},
    "ekobio":     {"full_title": 'Біоінсектицид для садових культур "ЕКОБІО" (EKOBIO)'},
    "mineral-10": {"full_title": 'Комплекс макро- та мікроелементів "МІНЕРАЛ-10" (MINERAL-10)'},
    "kompost-plus": {"full_title": 'Гранульоване органічне добриво "КОМПОСТ-ПЛЮС" (KOMPOST-PLUS)'},
    "rapidkil":   {"full_title": 'Родентицид швидкої дії "РАПІДКІЛ" (RAPIDKIL)'},
    "fitoplant":  {"full_title": 'Комплексне макродобриво для злакових "ФІТОПЛАНТ" (FITOPLANT)'},
    "bioshield":  {"full_title": 'Біоінсектицид ґрунтового спектру "БІОЩИТ" (BIOSHIELD)'},
    "rizotum":    {"full_title": 'Інокулянт для гороху та люцерни "РІЗОТУМ" (RIZOTUM)'},
    "vermosol":   {"full_title": 'Рідке органічне добриво "ВЕРМОСОЛ" (VERMOSOL)'},
    "ratstop":    {"full_title": 'Родентицид у пастках та зернах "РАТСТОП" (RATSTOP)'},
    "microset":   {"full_title": 'Комплекс мікроелементів для позакореневого підживлення "МІКРОСЕТ" (MICROSET)'},
    "biograd":    {"full_title": 'Біоінсектицид проти попелиці та трипсів "БІОГРАД" (BIOGRAD)'},
    "humatpro":   {"full_title": 'Органічне добриво з гумінових кислот "ГУМАТ-PRO" (HUMAT-PRO)'},
    "azotofix":   {"full_title": 'Інокулянт-фіксатор азоту для бобових "АЗОТОФІКС" (AZOTOFIX)'},
    "ph-balance": {"full_title": 'Регулятор кислотності робочого розчину "pH-БАЛАНС" (pH-BALANCE)'},
    "surfacto":   {"full_title": 'Неіонний поверхнево-активний прилипач "СУРФАКТО" (SURFACTO)'},
    "anti-drift": {"full_title": 'Антизносний ад\'ювант для зменшення дрейфу "АНТИ-ДРЕЙФ" (ANTI-DRIFT)'},
    "aquafix":    {"full_title": 'Кондиціонер жорсткої води "АКВАФІКС" (AQUAFIX)'},
}


async def backfill_product_full_titles(db: AsyncIOMotorDatabase) -> int:
    """Idempotent migration that:
    1. Populates `full_title` for any product that has it empty/missing.
    2. Populates `title_black` + `title_grey` (two-color H1 split) where missing.
       Rule: BLACK = перше слово; GREY = решта рядка ДО першої лапки
       (включно з лапками + бренд) — за специфікацією користувача
       (тільки ДВА сегменти, без подвоєння чорного у кінці).
       Якщо лапок немає — title_black = whole, title_grey = "".
    3. Ensures showcase products (flores, venator) have 5 gallery photos
       (only when current gallery <= 1 photo, never overwriting admin uploads).
    4. Re-aligns FLORES → "macro" category (per design spec).
    Safe to run on every startup.
    """
    def _split_two_color(full: str) -> tuple[str, str]:
        """Перше слово → black; решта → grey. Якщо одне слово — все black."""
        t = (full or "").strip()
        if not t:
            return ("", "")
        # Знаходимо перший пробіл (роздільник першого слова від решти)
        i = t.find(" ")
        if i <= 0:
            return (t, "")
        return (t[:i], t[i + 1:].strip())

    n = 0
    cursor = db.products.find(
        {},
        {"_id": 0, "id": 1, "slug": 1, "name": 1, "full_title": 1,
         "title_black": 1, "title_grey": 1,
         "photos": 1, "category": 1, "short_desc": 1},
    )
    async for p in cursor:
        slug = p.get("slug")
        cfg = _PRODUCT_FULL_TITLE_DEFAULTS.get(slug, {})
        updates: dict = {}

        # 1) full_title (kept for backward-compat)
        if not (p.get("full_title") or "").strip():
            ft = cfg.get("full_title") or p.get("name") or ""
            if ft:
                updates["full_title"] = ft

        # 2) title_black / title_grey — fill only if BOTH currently empty.
        # Це дає адміну змогу вручну змінити будь-яку з частин без перезапису.
        cur_black = (p.get("title_black") or "").strip()
        cur_grey = (p.get("title_grey") or "").strip()
        if not cur_black and not cur_grey:
            source_full = updates.get("full_title") or (p.get("full_title") or "") or cfg.get("full_title") or p.get("name") or ""
            tb, tg = _split_two_color(source_full)
            if tb:
                updates["title_black"] = tb
            if tg:
                updates["title_grey"] = tg

        # 3) Gallery photos — only if currently 0 or 1 photo AND defaults provided
        existing_photos = p.get("photos") or []
        wanted_photos = cfg.get("photos")
        if wanted_photos and len(existing_photos) <= 1:
            updates["photos"] = list(wanted_photos)
            updates["photo"] = wanted_photos[0]

        # 4) Category override (only for explicit slugs that have it)
        wanted_cat = cfg.get("category")
        if wanted_cat and p.get("category") != wanted_cat:
            updates["category"] = wanted_cat

        # 5) Optional short_desc realignment (only flores per spec)
        wanted_sd = cfg.get("short_desc")
        if wanted_sd and slug == "flores" and (p.get("short_desc") or "") != wanted_sd:
            updates["short_desc"] = wanted_sd

        if not updates:
            continue
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.products.update_one({"id": p["id"]}, {"$set": updates})
        n += 1
    if n:
        logger.info(
            f"[migrate] products: backfilled full_title/title_black/title_grey/photos/category on {n} products"
        )
    return n



async def ensure_default_agronomist_choice(db: AsyncIOMotorDatabase) -> int:
    """
    Якщо ЖОДЕН товар не позначений як `is_agronomist_choice`, проставити позначку
    топ-9 товарам (по is_hit DESC, sort_order ASC). Це дає коректне відображення
    блоку "Вибір українських агрономів" одразу після першого деплою.

    Адмін потім може змінити через UI — повторно НЕ перепризначаємо нічого.
    """
    has_selection = await db.products.count_documents({"is_agronomist_choice": True})
    if has_selection > 0:
        return 0
    cursor = db.products.find(
        {"status": "published"},
        {"_id": 0, "id": 1},
    ).sort([("is_hit", -1), ("sort_order", 1), ("created_at", -1)]).limit(9)
    ids = [p["id"] async for p in cursor]
    if not ids:
        return 0
    await db.products.update_many(
        {"id": {"$in": ids}},
        {"$set": {"is_agronomist_choice": True}},
    )
    logger.info(f"[migrate] products: defaulted is_agronomist_choice=True on {len(ids)} products")
    return len(ids)
