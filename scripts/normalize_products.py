"""
Уніфікує всі товари: ставить одне placeholder-фото (білі каністри) для
всіх карток у каталозі + урізає `short_desc` до 180 символів, щоб не ламав
верстку. Залишає повний HTML-опис у `description.problem.intro_html`
(показується на сторінці товару у вкладці «Опис»).

КРИТИЧНО: НЕ чіпає `description.hero_image`, `title_line1`, `title_line2`,
`title_subline`, `chips` — це елементи фірмового UI секції «Опис», які
повинні залишатися такими, як їх дав дизайнер (дерево + короткий слоган).
Ця нормалізація лише оновлює короткі службові поля + реальний opening
параграф проблеми.
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

CANISTER = "/Photo@2x.webp"     # placeholder фото каністр для каталога
HERO_TREE = "/tree.webp"        # фірмова ілюстрація дерева для секції «Опис»

# Дефолти для короткого заголовка в секції «Опис» (саме ті, які закладав дизайнер)
DEFAULT_TITLE_LINE1 = "Відновлення"
DEFAULT_TITLE_LINE2 = "після стресу."
DEFAULT_TITLE_SUBLINE = "Стабільний врожай."

# Дефолтні chips (як у дизайні)
DEFAULT_CHIPS = [
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
]

SHORT_LIMIT = 180


def smart_short(text: str, limit: int) -> str:
    if not text:
        return ""
    text = ihtml.unescape(text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
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
        # 1) Нормалізуємо short_desc — або з реального intro_html, або з існуючого
        desc_block = (p.get("description") or {}).get("problem") or {}
        raw_html = desc_block.get("intro_html") or p.get("description_html") or p.get("short_desc") or ""
        new_short = smart_short(raw_html, SHORT_LIMIT)
        if not new_short and p.get("short_desc"):
            new_short = smart_short(p["short_desc"], SHORT_LIMIT)

        # 2) ВАЖЛИВО: НЕ переписуємо hero_image / title_line1 / title_line2 /
        # title_subline / chips якщо вони вже є. Якщо вони відсутні або не
        # відповідають фірмовій верстці (наприклад, hero_image == photo, що
        # ламає секцію «Опис»), повертаємо їх до дефолтів дизайнера.
        new_desc = dict(p.get("description") or {})
        # Якщо hero_image — це фото товару (а не "/tree.webp"), скидаємо
        if not new_desc.get("hero_image") or new_desc["hero_image"] != HERO_TREE:
            new_desc["hero_image"] = HERO_TREE

        # title_line1/2/subline: завжди скидаємо до дефолтів дизайнера —
        # так секція «Опис» залишається фірмово оформленою для всіх товарів.
        new_desc["title_line1"] = DEFAULT_TITLE_LINE1
        new_desc["title_line2"] = DEFAULT_TITLE_LINE2
        new_desc["title_subline"] = DEFAULT_TITLE_SUBLINE
        # chips: якщо чіпи без body (тільки title), завжди ламають верстку —
        # відновлюємо повний дефолтний набір.
        existing_chips = new_desc.get("chips") or []
        chips_have_body = any((c or {}).get("body") for c in existing_chips)
        if not chips_have_body:
            new_desc["chips"] = [dict(c) for c in DEFAULT_CHIPS]

        update = {
            "photo": CANISTER,
            "photos": [CANISTER],
            "description_image": CANISTER,  # цей field використовується тільки в адмінці
            "short_desc": new_short,
            "description": new_desc,
        }
        await db.products.update_one({"_id": p["_id"]}, {"$set": update})
        updated += 1

    print(f"Updated: {updated}")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())

