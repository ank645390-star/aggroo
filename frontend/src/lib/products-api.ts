import { authedApi } from "./auth-api";

/* =====================================================================
   products-api.ts — клієнт для нової продуктової логіки.
   Модульний, типизований API, дзеркало backend/products/.
   ===================================================================== */

export type BulletItem = { text: string };

export type TabBlock = {
  title: string;
  intro: string;
  items: BulletItem[];
  note: string;
};

export type FeatureChip = {
  icon: "lightning" | "eco" | "drop" | "shield" | "leaf";
  title: string;
  body: string;
  variant: "green" | "dark" | "cream";
};

export type DescriptionTextBlock = {
  title: string;
  intro_html: string;
  outro_html: string;
};

export type DescriptionBlock = {
  hero_image: string;
  title_line1: string;
  title_line2: string;
  title_subline: string;
  chips: FeatureChip[];
  problem: DescriptionTextBlock;
  solution: DescriptionTextBlock;
};

export type PriceVariant = {
  volume: string;
  price: number;
  sku?: string;
};

export type ProductCategory = {
  id: string;
  slug: string;
  label: string;
  sort_order: number;
  active: boolean;
  count?: number;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  /** Двокольоровий заголовок H1 на сторінці товару (адмін задає обидві
   *  частини окремо). UI рендерить як два спани:
   *    <span class="black">{title_black}</span>
   *    <span class="grey">{title_grey}</span>
   *  Якщо ОБИДВІ порожні — fallback на простий `name` (чорний). */
  title_black?: string;
  title_grey?: string;
  /** @deprecated Legacy single-string descriptive title (used until split was
   *  introduced into `title_black` / `title_grey`). Не використовується UI,
   *  але повертається API для backward compatibility. */
  full_title?: string;
  short_desc: string;
  category: string;
  photo: string;
  photos: string[];
  packing: string;
  norm: string;
  storage_temp: string;
  storage_period: string;
  cultures?: string;
  bacteria_genus?: string;
  default_volume: string;
  price: number;
  variants: PriceVariant[];
  in_stock: boolean;
  rating: number;
  reviews: number;
  manual_rating?: number;
  manual_reviews?: number;
  is_hit: boolean;
  is_new: boolean;
  is_agronomist_choice?: boolean;
  sort_order: number;
  description_html: string;
  description_image: string;
  description: DescriptionBlock;
  dosage: TabBlock;
  composition: TabBlock;
  compatibility: TabBlock;
  specs: TabBlock;
  seo_title: string;
  seo_description: string;
  status: "draft" | "published";
  created_at?: string;
  updated_at?: string;
};

export type ProductListResponse = {
  items: Product[];
  total: number;
  limit: number;
  skip: number;
};

export type ProductListParams = {
  category?: string;
  stock?: "in" | "pre" | "all";
  q?: string;
  sort?: "rec" | "asc" | "desc" | "new" | "az";
  agronomist_choice?: boolean;
  limit?: number;
  skip?: number;
};

/* ===== Public ===== */
export async function listProducts(params: ProductListParams = {}): Promise<ProductListResponse> {
  const cleaned: any = { ...params };
  if (cleaned.stock === "all") delete cleaned.stock;
  const { data } = await authedApi.get<ProductListResponse>("/products", { params: cleaned });
  return data;
}

export async function getProduct(slug: string): Promise<Product> {
  const { data } = await authedApi.get<Product>(`/products/${encodeURIComponent(slug)}`);
  return data;
}

export async function getRelatedProducts(slug: string, limit = 4): Promise<{ items: Product[] }> {
  const { data } = await authedApi.get<{ items: Product[] }>(`/products/${encodeURIComponent(slug)}/related`, {
    params: { limit },
  });
  return data;
}

export async function listPublicCategories(): Promise<{ items: ProductCategory[] }> {
  const { data } = await authedApi.get<{ items: ProductCategory[] }>("/products/categories");
  return data;
}

export async function searchProductsLive(q: string, limit = 6): Promise<{ items: Product[] }> {
  if (!q || q.trim().length < 2) return { items: [] };
  const { data } = await authedApi.get<{ items: Product[] }>("/products/search", {
    params: { q: q.trim(), limit },
  });
  return data;
}

/* ===== Admin ===== */
export type ProductCreate = Partial<Omit<Product, "id" | "created_at" | "updated_at">> & {
  name: string;
};
export type ProductPatch = Partial<Omit<Product, "id" | "created_at" | "updated_at">>;

export async function adminListProducts(): Promise<{ items: Product[]; total: number }> {
  const { data } = await authedApi.get<{ items: Product[]; total: number }>("/admin/products");
  return data;
}

export async function adminGetProduct(id: string): Promise<Product> {
  const { data } = await authedApi.get<Product>(`/admin/products/${id}`);
  return data;
}

export async function adminCreateProduct(payload: ProductCreate): Promise<Product> {
  const { data } = await authedApi.post<Product>("/admin/products", payload);
  return data;
}

export async function adminPatchProduct(id: string, payload: ProductPatch): Promise<Product> {
  const { data } = await authedApi.patch<Product>(`/admin/products/${id}`, payload);
  return data;
}

export async function adminDeleteProduct(id: string): Promise<{ deleted: boolean }> {
  const { data } = await authedApi.delete<{ deleted: boolean }>(`/admin/products/${id}`);
  return data;
}

export async function adminUploadProductImage(file: File): Promise<{ url: string; filename: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await authedApi.post<{ url: string; filename: string }>(
    "/admin/products/upload-image",
    fd,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
}

/* ===== Admin: Categories ===== */
export async function adminListCategories(): Promise<{ items: ProductCategory[]; total: number }> {
  const { data } = await authedApi.get<{ items: ProductCategory[]; total: number }>("/admin/product-categories");
  return data;
}

export async function adminCreateCategory(payload: Omit<ProductCategory, "id" | "count">): Promise<ProductCategory> {
  const { data } = await authedApi.post<ProductCategory>("/admin/product-categories", payload);
  return data;
}

export async function adminPatchCategory(
  id: string,
  payload: Partial<Omit<ProductCategory, "id" | "count">>,
): Promise<ProductCategory> {
  const { data } = await authedApi.patch<ProductCategory>(`/admin/product-categories/${id}`, payload);
  return data;
}

export async function adminDeleteCategory(id: string): Promise<{ deleted: boolean }> {
  const { data } = await authedApi.delete<{ deleted: boolean }>(`/admin/product-categories/${id}`);
  return data;
}

export async function adminReorderCategories(ids: string[]): Promise<{ ok: boolean; count: number }> {
  const { data } = await authedApi.post<{ ok: boolean; count: number }>("/admin/product-categories/reorder", { ids });
  return data;
}

/* ===== Helpers ===== */
export function pickProductCover(p: Product): string {
  if (p.photo) return p.photo;
  if (p.photos && p.photos.length > 0) return p.photos[0];
  return "/Photo@2x.webp";
}
