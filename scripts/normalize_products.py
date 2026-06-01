"""
Уніфікує всі товари: ставить одне placeholder-фото (білі каністри) для
всіх карток + урізає `short_desc` до 180 символів, щоб не ламав верстку.
Залишає повний HTML-опис у `description.problem.intro_html` (показується на
сторінці товару у вкладці «Опис»).
"""
import os
import re
import asyncio
import html as ihtml
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

CANISTER = "/Photo@2x.webp"           # original placeholder (white plastic bottles)
SHORT_LIMIT = 180                     # max chars for the catalog card description
PHOTOS = [
    "/Photo@2x.webp", "/Photo1@2x.webp", "/Photo2@2x.webp",
    "/Photo3@2x.webp", "/Photo4@2x.webp", "/Photo5@2x.webp",
    "/Photo6@2x.webp", "/Photo7@2x.webp", "/Photo8@2x.webp",
]


def smart_short(text: str, limit: int) -> str:
    """Strip HTML tags, take first sentence/paragraph, limit to `limit` chars."""
    if not text:
        return ""
    text = ihtml.unescape(text)
    # Strip tags
    text = re.sub(r"<[^>]+>", " ", text)
    # Collapse whitespace
    text = re.sub(r"\s+", " ", text).strip()
    # Take first sentence if it's shorter than limit
    sent = re.split(r"(?<=[.!?])\s+", text, maxsplit=1)[0]
    out = sent if len(sent) <= limit else text[:limit].rsplit(" ", 1)[0]
    if len(out) < len(text):
        out = out.rstrip(",.;: ") + "…"
    return out


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    products = await db.products.find({}).to_list(length=None)
    print(f"Found {len(products)} products. Normalizing photos & descriptions…")

    updated = 0
    for p in products:
        # New short description: prefer the first paragraph of the rich HTML
        # description, fallback to existing short_desc.
        desc_block = (p.get("description") or {}).get("problem") or {}
        raw_html = desc_block.get("intro_html") or p.get("description_html") or p.get("short_desc") or ""
        new_short = smart_short(raw_html, SHORT_LIMIT)
        if not new_short and p.get("short_desc"):
            new_short = smart_short(p["short_desc"], SHORT_LIMIT)

        # Update photo: canister placeholder for ALL cards
        update: dict = {
            "photo": CANISTER,
            "photos": [CANISTER],
            "description_image": CANISTER,
            "short_desc": new_short,
        }
        # Also overwrite hero_image inside description block (used on product page)
        new_desc = dict(p.get("description") or {})
        new_desc["hero_image"] = CANISTER
        update["description"] = new_desc

        await db.products.update_one({"_id": p["_id"]}, {"$set": update})
        updated += 1

    print(f"Updated: {updated}")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
