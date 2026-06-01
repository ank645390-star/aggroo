import { authedApi } from "./auth-api";

/* =========================================================================
   Reviews API — public + admin endpoints (CRUD + upload + reorder).
   Mirrors faq-api / blog-api shape.
   ========================================================================= */

export type ReviewItem = {
  id: string;
  author_name: string;
  author_role: string;
  author_photo: string;
  category: string;
  body: string;
  rating: number;
  display_date: string;
  date_iso?: string | null;
  product_id?: string | null;
  product_slug?: string | null;
  product_name?: string | null;
  published: boolean;
  highlighted: boolean;
  order: number;
  created_at?: string;
  updated_at?: string;
};

export type ReviewCreate = Partial<
  Omit<ReviewItem, "id" | "created_at" | "updated_at">
> & {
  body: string; // required
};

export type ReviewPatch = Partial<
  Omit<ReviewItem, "id" | "created_at" | "updated_at">
>;

export type ReviewListParams = {
  product_id?: string;
  product_slug?: string;
  highlighted?: boolean;
  limit?: number;
};

// ---------- Customer-side eligibility & submission ----------

export type ReviewEligibility = {
  eligible: boolean;
  reason: "" | "ok" | "no_auth" | "no_orders" | "product_not_purchased" | "already_reviewed";
  message: string;
  has_orders: boolean;
  has_purchased_product: boolean;
  already_reviewed: boolean;
};

export async function fetchReviewEligibility(
  productSlug?: string
): Promise<ReviewEligibility> {
  const { data } = await authedApi.get<ReviewEligibility>(
    "/reviews/me/eligibility",
    { params: productSlug ? { product_slug: productSlug } : {} }
  );
  return data;
}

export async function submitCustomerReview(payload: {
  rating: number;
  body: string;
  product_slug?: string;
  product_id?: string;
}): Promise<ReviewItem> {
  const { data } = await authedApi.post<ReviewItem>(
    "/reviews/customer",
    payload
  );
  return data;
}

// ---------- Public ----------

export async function listReviewsPublic(
  params: ReviewListParams = {}
): Promise<ReviewItem[]> {
  const cleaned: Record<string, any> = {};
  if (params.product_id) cleaned.product_id = params.product_id;
  if (params.product_slug) cleaned.product_slug = params.product_slug;
  if (typeof params.highlighted === "boolean")
    cleaned.highlighted = params.highlighted;
  if (params.limit) cleaned.limit = params.limit;
  const { data } = await authedApi.get<ReviewItem[]>("/reviews", {
    params: cleaned,
  });
  return data;
}

export async function getReviewPublic(id: string): Promise<ReviewItem> {
  const { data } = await authedApi.get<ReviewItem>(
    `/reviews/${encodeURIComponent(id)}`
  );
  return data;
}

// ---------- Admin ----------

export async function listReviews(
  params: { product_id?: string; highlighted?: boolean } = {}
): Promise<ReviewItem[]> {
  const cleaned: Record<string, any> = {};
  if (params.product_id) cleaned.product_id = params.product_id;
  if (typeof params.highlighted === "boolean")
    cleaned.highlighted = params.highlighted;
  const { data } = await authedApi.get<ReviewItem[]>("/admin/reviews", {
    params: cleaned,
  });
  return data;
}

export async function createReview(
  payload: ReviewCreate
): Promise<ReviewItem> {
  const { data } = await authedApi.post<ReviewItem>("/admin/reviews", payload);
  return data;
}

export async function patchReview(
  id: string,
  payload: ReviewPatch
): Promise<ReviewItem> {
  const { data } = await authedApi.patch<ReviewItem>(
    `/admin/reviews/${id}`,
    payload
  );
  return data;
}

export async function deleteReview(id: string): Promise<void> {
  await authedApi.delete(`/admin/reviews/${id}`);
}

export async function reorderReviews(ids: string[]): Promise<ReviewItem[]> {
  const { data } = await authedApi.put<ReviewItem[]>(
    "/admin/reviews/reorder",
    { ids }
  );
  return data;
}

export async function uploadReviewImage(
  file: File
): Promise<{ url: string; filename: string; size: number; content_type: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await authedApi.post("/admin/reviews/upload-image", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
