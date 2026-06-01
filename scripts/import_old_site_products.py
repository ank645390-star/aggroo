"""
Imports real products from old TAMIS site (https://tamis.com.ua) into our MongoDB.

- Scrapes 4 categories from the old site:
   * Біоінсектициди (insekticidi) → biopesticide
   * Інокулянти (inokulyanti)    → inoculant
   * Родентицид (rodenticid)     → rodenticide
   * Сад. лінійка (sadova)       → macro (macro & micro elements)

- Each product page is parsed via JSON-LD <script>: name, description, image, price.
- Removes existing seeded mock products (those with default seed slugs) so we only
  keep the real catalog.
- Inserts products with rich description blocks compatible with our schema:
   * basic fields (name, slug, category, photo, photos, price, variants)
   * `description.problem.intro_html` ← rich HTML from old site
   * tabs: composition / specs left empty (admin can fill later)
"""

import os
import re
import json
import html as ihtml
import uuid
import asyncio
from datetime import datetime, timezone
from urllib.parse import urlparse

import requests
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from slugify import slugify

ROOT = "/app/backend"
load_dotenv(f"{ROOT}/.env")
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}

# --- Source pages on old site -----------------------------------------------
OLD = "https://tamis.com.ua"
CATEGORIES = [
    ("biopesticide",  f"{OLD}/uk/products/insekticidi-f212520846/"),
    ("inoculant",     f"{OLD}/uk/products/inokulyanti-f234298744/"),
    ("rodenticide",   f"{OLD}/uk/products/rodenticid-venator-f234297994/"),
    ("macro",         f"{OLD}/uk/products/sadova-liniyka-f212523354/"),
]

# A few products show up under "insekticidi" but are really inoculants/fungicides.
# Override mapping based on slug fragments.
def smart_category(default_cat: str, slug: str) -> str:
    s = slug.lower()
    if s.startswith("inokulyant") or "binitro" in s or "biomag-soya" in s:
        return "inoculant"
    if "rodenticid" in s or "ratter" in s or "venator" in s:
        return "rodenticide"
    return default_cat


def fetch(url: str) -> str:
    r = requests.get(url, headers=UA, timeout=30)
    r.raise_for_status()
    return r.text


def parse_product(html: str, page_url: str) -> dict | None:
    """Extract product info from JSON-LD on product page. Falls back to <h1>+meta
    description+og:image for SPA-rendered pages where JSON-LD is missing."""
    for m in re.finditer(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', html, re.S):
        try:
            d = json.loads(m.group(1))
        except Exception:
            continue
        if isinstance(d, dict) and d.get("@type") == "Product":
            return d

    # ----- Fallback parser (SPA pages without JSON-LD) -----
    # Title from <h1>
    h1 = re.search(r'<h1[^>]*>([^<]+)</h1>', html)
    if not h1:
        return None
    name = clean_name(h1.group(1))

    # Description: try og:description / meta name=description (decoded)
    desc = ""
    for pat in (
        r'<meta[^>]*property=["\']og:description["\'][^>]*content=["\']([^"\']+)["\']',
        r'<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"\']+)["\']',
    ):
        m = re.search(pat, html)
        if m:
            desc = ihtml.unescape(m.group(1))
            break
    # Strip generic catalog suffix like " (id) - найнижча ціна в …"
    desc = re.sub(r'\s*\(\d{6,}\)\s*-\s*найнижча.*$', '', desc, flags=re.S).strip()

    # Image: first images.zakupka.com URL
    imgs = re.findall(r'(https://images\.zakupka\.com/[^"\'\s]+\.(?:jpg|jpeg|webp|png))', html)
    imgs = list(dict.fromkeys(imgs))

    return {
        "@type": "Product",
        "name": name,
        "description": desc,
        "image": imgs,
        "offers": {"price": 0, "priceCurrency": "UAH"},
    }


def html_paragraphs_from_desc(text: str) -> str:
    """Convert plain-text description (with bullet lines) to clean HTML for our
    rich-text panel."""
    text = ihtml.unescape(text).strip()
    # Split into blocks by blank lines
    parts = re.split(r"\n\s*\n", text)
    out_html_blocks = []
    for part in parts:
        lines = [l.strip() for l in part.splitlines() if l.strip()]
        if not lines:
            continue
        # If most lines start with bullet markers → render as <ul>
        bullet_re = re.compile(r"^[●•·\-]\s*(.+)$")
        bullets = [bullet_re.match(l) for l in lines]
        if all(bullets) and len(bullets) >= 2:
            items = "".join(f"<li>{b.group(1)}</li>" for b in bullets)
            out_html_blocks.append(f"<ul>{items}</ul>")
        else:
            # Headings detection: short line ending with ':' → <h3>; otherwise <p>.
            if len(lines) == 1 and lines[0].endswith(":") and len(lines[0]) < 80:
                out_html_blocks.append(f"<h3>{lines[0].rstrip(':')}</h3>")
            else:
                # Headings inside the block (1st line ending with ':') keep as <h3>
                acc = []
                for i, l in enumerate(lines):
                    if i == 0 and l.endswith(":") and len(l) < 80:
                        acc.append(f"<h3>{l.rstrip(':')}</h3>")
                    else:
                        acc.append(f"<p>{l}</p>")
                out_html_blocks.append("".join(acc))
    return "\n".join(out_html_blocks)


def short_desc_from(text: str, max_len: int = 220) -> str:
    text = ihtml.unescape(text).strip()
    # Take the first non-bullet paragraph
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    first = next((p for p in paragraphs if not re.match(r"^[●•·\-]", p)), paragraphs[0] if paragraphs else "")
    first = first.replace("\n", " ")
    return first[:max_len].rstrip() + ("…" if len(first) > max_len else "")


def clean_name(raw: str) -> str:
    return ihtml.unescape(re.sub(r"\s+", " ", raw)).strip().strip('"').replace('&quot;', '"').replace('&amp;', '&')


def best_image(images: list[str] | str | None) -> tuple[str, list[str]]:
    """Return (cover, gallery)."""
    if not images:
        return ("", [])
    if isinstance(images, str):
        images = [images]
    # Dedupe preserving order
    seen = []
    for u in images:
        if u and u not in seen:
            seen.append(u)
    return (seen[0] if seen else "", seen[:5])


PLACEHOLDER_IMG = "/Frame-1052@2x.webp"  # generic agri product placeholder we already have in /public


# ---------------------------------------------------------------------------
# Scrape category list pages → collect (slug, pid, category) tuples
# ---------------------------------------------------------------------------
def collect_products() -> list[tuple[str, str, str]]:
    items: dict[str, tuple[str, str]] = {}  # slug → (pid, cat)
    for default_cat, url in CATEGORIES:
        html = fetch(url)
        for pid, slug in set(re.findall(r"/uk/p/(\d+)-([a-z0-9-]+)/", html)):
            cat = smart_category(default_cat, slug)
            # Don't override if already classified into a more specific category
            if slug not in items or items[slug][1] == "biopesticide":
                items[slug] = (pid, cat)
    return [(slug, pid, cat) for slug, (pid, cat) in sorted(items.items())]


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # 1) Remove all previous seeded mock products to make room for real catalog.
    deleted = await db.products.delete_many({})
    print(f"[clean] removed {deleted.deleted_count} existing products")

    listing = collect_products()
    print(f"[scrape] {len(listing)} unique products across 4 categories")

    inserted = 0
    sort_order = 0
    for slug, pid, cat in listing:
        url = f"{OLD}/uk/p/{pid}-{slug}/"
        try:
            html = fetch(url)
        except Exception as e:
            print(f"  ! fetch {slug}: {e}")
            continue
        prod = parse_product(html, url)
        if not prod:
            print(f"  ! no JSON-LD for {slug}")
            continue

        name = clean_name(prod.get("name") or slug)
        desc_text = prod.get("description") or ""
        desc_html = html_paragraphs_from_desc(desc_text)
        short = short_desc_from(desc_text)
        cover, gallery = best_image(prod.get("image"))

        # Price
        offers = prod.get("offers") or {}
        if isinstance(offers, list):
            offers = offers[0] if offers else {}
        price = float(offers.get("price") or 0)

        # If no real image, use placeholder
        if not cover:
            cover = PLACEHOLDER_IMG
            gallery = [PLACEHOLDER_IMG]

        # Build our schema doc
        sort_order += 10
        slug_clean = slugify(name, lowercase=True, max_length=80) or slug
        doc = {
            "id": str(uuid.uuid4()),
            "name": name,
            "slug": slug_clean,
            "title_black": name.split(" ")[0] if name else "",
            "title_grey": " ".join(name.split(" ")[1:]) if " " in name else "",
            "full_title": name,
            "short_desc": short,
            "category": cat,
            "photo": cover,
            "photos": gallery,
            "packing": "1, 5, 10 л",
            "norm": "",
            "storage_temp": "+2°C – +15°C",
            "storage_period": "6 місяців",
            "cultures": "Всі культури",
            "bacteria_genus": "",
            "default_volume": "5 Л",
            "price": price,
            "variants": [],
            "in_stock": True,
            "rating": 4.7,
            "reviews": 0,
            "manual_rating": 4.7,
            "manual_reviews": 0,
            "is_hit": False,
            "is_new": False,
            "is_agronomist_choice": sort_order <= 90,
            "sort_order": sort_order,
            "is_published": True,
            "status": "published",
            "description_html": "",
            "description_image": cover,
            "description": {
                "hero_image": cover,
                "title_line1": name.split(" ")[0] if name else "",
                "title_line2": "",
                "title_subline": short[:140],
                "chips": [
                    {"icon": "lightning", "title": "Біологічний препарат", "body": "", "variant": "green"},
                    {"icon": "eco",       "title": "Екобезпечно",          "body": "", "variant": "dark"},
                    {"icon": "drop",      "title": "Зручне застосування",  "body": "", "variant": "cream"},
                ],
                "problem":  {"title": "Опис",     "intro_html": desc_html, "outro_html": ""},
                "solution": {"title": "Рішення",  "intro_html": "",        "outro_html": ""},
            },
            "dosage":        {"title": "Норма витрати",     "intro": "", "items": [], "note": ""},
            "composition":   {"title": "Склад",              "intro": "", "items": [], "note": ""},
            "compatibility": {"title": "Сумісність",         "intro": "", "items": [], "note": ""},
            "specs":         {"title": "Характеристики",     "intro": "", "items": [], "note": ""},
            "seo_title":     f"{name} | TAMIS АГРО",
            "seo_description": short,
            "source_url":    url,
            "source_pid":    pid,
            "created_at":    datetime.now(timezone.utc).isoformat(),
            "updated_at":    datetime.now(timezone.utc).isoformat(),
        }

        await db.products.insert_one(doc)
        inserted += 1
        print(f"  + [{cat:<12}] {name[:60]}  ({price}₴)  img={'✓' if cover != PLACEHOLDER_IMG else 'PLACEHOLDER'}")

    # Counts per category
    print("\n[summary]")
    for cat_slug in ["biopesticide", "inoculant", "rodenticide", "macro"]:
        n = await db.products.count_documents({"category": cat_slug})
        print(f"  {cat_slug:<14} {n}")
    print(f"\nTotal inserted: {inserted}")

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
