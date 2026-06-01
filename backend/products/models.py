"""
Pydantic models for the products module.

The data shape supports a full product card:
  - Identity:   id, slug, name, short_desc
  - Catalog UI: photos[], category, packing, norm, default_volume,
                price, in_stock, rating, reviews, is_hit, is_new, sort_order
  - Product page tabs (rich, admin-configurable):
      description_html, dosage (list+note), composition (list),
      compatibility (list+note), specs (list)
  - SEO:        seo_title, seo_description
  - Status:     draft | published

The rich-tab structure is **dynamic** — each tab has
heading + ordered list of bullet points + optional note paragraph.
This matches the existing UI (/product page — tabs).
"""
from __future__ import annotations

from typing import List, Optional, Literal
from pydantic import BaseModel, ConfigDict, Field


# ====== Tab content blocks ======
class BulletItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    text: str = ""          # may include inline <b>..</b> for emphasis (rendered as HTML)


class TabBlock(BaseModel):
    """Reusable structure for dosage / composition / compatibility / specs tabs."""
    model_config = ConfigDict(extra="ignore")
    title: str = ""
    intro: str = ""          # optional paragraph rendered before the list
    items: List[BulletItem] = []
    note: str = ""           # optional paragraph rendered after the list


class PriceVariant(BaseModel):
    """Optional variant pricing per tare (e.g. 1Л/5Л/10Л)."""
    model_config = ConfigDict(extra="ignore")
    volume: str              # e.g. "5 Л"
    price: float = 0
    sku: str = ""


# ====== Description (Опис) blocks — full Figma-style hero ======
class FeatureChip(BaseModel):
    """One of (up to 3) floating chips overlaid on the Опис hero image."""
    model_config = ConfigDict(extra="ignore")
    icon: Literal["lightning", "eco", "drop", "shield", "leaf"] = "lightning"
    title: str = ""
    body: str = ""
    variant: Literal["green", "dark", "cream"] = "green"


class DescriptionTextBlock(BaseModel):
    """Sub-block for the "Проблема" / "Рішення" sections under the hero."""
    model_config = ConfigDict(extra="ignore")
    title: str = ""          # short heading label (e.g. "Проблема", "Рішення")
    intro_html: str = ""     # main paragraph (HTML allowed: <b>..</b>)
    outro_html: str = ""     # secondary paragraph or conclusion (HTML allowed)


class DescriptionBlock(BaseModel):
    """Full structure for the Опис tab — mirrors original Figma hero design."""
    model_config = ConfigDict(extra="ignore")
    hero_image: str = "/tree.webp"
    title_line1: str = "Відновлення"
    title_line2: str = "після стресу."
    title_subline: str = "Стабільний врожай."
    chips: List[FeatureChip] = []
    problem: DescriptionTextBlock = DescriptionTextBlock(title="Проблема")
    solution: DescriptionTextBlock = DescriptionTextBlock(title="Рішення")


# ====== Product ======
class ProductBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    # Identity
    name: str = Field(min_length=1, max_length=200)
    slug: Optional[str] = None
    # Двокольоровий заголовок H1 на сторінці товару. Адмін задає ОКРЕМО
    # дві частини; UI рендерить їх як два спани з різними кольорами:
    #   title_black  → чорний (--text-black, #2C2C27)
    #   title_grey   → сірий  (--text-grey,  #93928C)
    # Конкатенація: `{title_black} {title_grey}` (через пробіл).
    # Якщо ОБИДВІ порожні — fallback на просте `name`.
    # `full_title` лишаємо для backward-compat: deprecated, але DB read-only.
    title_black: str = ""
    title_grey: str = ""
    full_title: str = ""
    short_desc: str = ""        # 1-line subtitle shown on cards & under title

    # Catalog card data
    category: str = "inoculant"   # category id (string), must match a configured ProductCategory
    photo: str = ""               # primary photo URL (used as cover on cards)
    photos: List[str] = []        # gallery list (first is cover if photo not set)
    packing: str = ""             # "1, 5, 10 л" — free text
    norm: str = ""                # "1.5–2 л/га"
    storage_temp: str = "15-25°C"   # admin-editable storage temperature
    storage_period: str = "2 роки"  # admin-editable shelf life
    # Feature card extra fields (admin-editable, used on product page):
    cultures: str = "Всі культури"   # "Культури" feature row value
    bacteria_genus: str = ""         # "Бактерії роду" feature row value (e.g. "Bacillus subtilis")
    default_volume: str = "5 Л"
    price: float = 0              # base price (₴/л)
    variants: List[PriceVariant] = []   # optional tiered pricing

    # Inventory + flags
    in_stock: bool = True
    # `rating` / `reviews` — ефективні значення, що відображаються на картці.
    # Перераховуються автоматично з реальних відгуків + admin baseline.
    rating: float = 4.7
    reviews: int = 0
    # Admin-керована "базова" оцінка/к-ть відгуків (стартова, поки немає реальних).
    # При появі реальних відгуків (db.reviews) обчислюється зважене середнє.
    manual_rating: float = 4.7
    manual_reviews: int = 0
    is_hit: bool = False
    is_new: bool = False
    # Адмін-куроване "Вибір українських агрономів" — товари, які
    # відображаються в карусельному блоці на сторінці Welcome.
    is_agronomist_choice: bool = False
    sort_order: int = 0

    # Product page rich content
    description_html: str = ""          # legacy: simple HTML fallback
    description_image: str = ""         # legacy: optional cover image
    description: DescriptionBlock = DescriptionBlock()   # NEW: full Figma-style Опис
    dosage: TabBlock = TabBlock(title="Дозування")
    composition: TabBlock = TabBlock(title="Склад")
    compatibility: TabBlock = TabBlock(title="Сумісність")
    specs: TabBlock = TabBlock(title="Характеристика")

    # SEO
    seo_title: str = ""
    seo_description: str = ""

    # Publishing
    status: Literal["draft", "published"] = "published"


class ProductCreate(ProductBase):
    pass


class ProductPatch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: Optional[str] = None
    slug: Optional[str] = None
    title_black: Optional[str] = None
    title_grey: Optional[str] = None
    full_title: Optional[str] = None
    short_desc: Optional[str] = None
    category: Optional[str] = None
    photo: Optional[str] = None
    photos: Optional[List[str]] = None
    packing: Optional[str] = None
    norm: Optional[str] = None
    storage_temp: Optional[str] = None
    storage_period: Optional[str] = None
    cultures: Optional[str] = None
    bacteria_genus: Optional[str] = None
    default_volume: Optional[str] = None
    price: Optional[float] = None
    variants: Optional[List[PriceVariant]] = None
    in_stock: Optional[bool] = None
    rating: Optional[float] = None
    reviews: Optional[int] = None
    manual_rating: Optional[float] = None
    manual_reviews: Optional[int] = None
    is_hit: Optional[bool] = None
    is_new: Optional[bool] = None
    is_agronomist_choice: Optional[bool] = None
    sort_order: Optional[int] = None
    description_html: Optional[str] = None
    description_image: Optional[str] = None
    description: Optional[DescriptionBlock] = None
    dosage: Optional[TabBlock] = None
    composition: Optional[TabBlock] = None
    compatibility: Optional[TabBlock] = None
    specs: Optional[TabBlock] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    status: Optional[Literal["draft", "published"]] = None


class ProductOut(ProductBase):
    id: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class ProductListResponse(BaseModel):
    items: List[ProductOut]
    total: int
    limit: int
    skip: int


# ====== Product Category (filter taxonomy) ======
class ProductCategoryBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    slug: str = Field(min_length=1, max_length=80)   # "inoculant" — used as products.category
    label: str = Field(min_length=1, max_length=200) # "Інокулянти"
    sort_order: int = 0
    active: bool = True


class ProductCategoryCreate(ProductCategoryBase):
    pass


class ProductCategoryPatch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    slug: Optional[str] = None
    label: Optional[str] = None
    sort_order: Optional[int] = None
    active: Optional[bool] = None


class ProductCategoryOut(ProductCategoryBase):
    id: str
    count: int = 0   # populated by API on read for public/admin list
