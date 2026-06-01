import { authedApi } from "./auth-api";

/* =====================================================================
   blog-api.ts — клієнт для блог-ендпоінтів.
   Public: list / detail / related / categories / tags
   Admin:  CRUD + upload image
   ===================================================================== */

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content_html?: string;
  cover_image: string;
  cover_alt: string;
  category: string;
  tags: string[];
  hot: boolean;
  status: "draft" | "published";
  reading_minutes: number;
  word_count: number;
  views: number;
  published_at?: string | null;
  seo_title: string;
  seo_description: string;
  created_at?: string;
  updated_at?: string;
};

export type BlogListResponse = {
  items: BlogPost[];
  total: number;
  limit: number;
  skip: number;
};

export type BlogCategory = { name: string; count: number };
export type BlogTag = { name: string; count: number };

export type BlogListParams = {
  category?: string;
  tag?: string;
  q?: string;
  sort?: "newest" | "oldest" | "popular";
  limit?: number;
  skip?: number;
};

export async function listPosts(params: BlogListParams = {}): Promise<BlogListResponse> {
  const { data } = await authedApi.get<BlogListResponse>("/blog/posts", { params });
  return data;
}

export async function getPost(slug: string): Promise<BlogPost> {
  const { data } = await authedApi.get<BlogPost>(`/blog/posts/${encodeURIComponent(slug)}`);
  return data;
}

export async function getRelated(slug: string, limit = 3): Promise<{ items: BlogPost[] }> {
  const { data } = await authedApi.get<{ items: BlogPost[] }>(
    `/blog/posts/${encodeURIComponent(slug)}/related`,
    { params: { limit } }
  );
  return data;
}

export async function listCategories(): Promise<{ items: BlogCategory[] }> {
  const { data } = await authedApi.get<{ items: BlogCategory[] }>("/blog/categories");
  return data;
}

export async function listTags(): Promise<{ items: BlogTag[] }> {
  const { data } = await authedApi.get<{ items: BlogTag[] }>("/blog/tags");
  return data;
}

// ===== Admin =====
export type BlogPostCreate = {
  title: string;
  slug?: string;
  excerpt?: string;
  content_html?: string;
  cover_image?: string;
  cover_alt?: string;
  category?: string;
  tags?: string[];
  hot?: boolean;
  status?: "draft" | "published";
  published_at?: string | null;
  seo_title?: string;
  seo_description?: string;
};
export type BlogPostPatch = Partial<BlogPostCreate>;

export async function adminListPosts(): Promise<{ items: BlogPost[]; total: number }> {
  const { data } = await authedApi.get<{ items: BlogPost[]; total: number }>("/admin/blog/posts");
  return data;
}

export async function adminGetPost(id: string): Promise<BlogPost> {
  const { data } = await authedApi.get<BlogPost>(`/admin/blog/posts/${id}`);
  return data;
}

export async function adminCreatePost(payload: BlogPostCreate): Promise<BlogPost> {
  const { data } = await authedApi.post<BlogPost>("/admin/blog/posts", payload);
  return data;
}

export async function adminPatchPost(id: string, payload: BlogPostPatch): Promise<BlogPost> {
  const { data } = await authedApi.patch<BlogPost>(`/admin/blog/posts/${id}`, payload);
  return data;
}

export async function adminDeletePost(id: string): Promise<{ deleted: boolean }> {
  const { data } = await authedApi.delete<{ deleted: boolean }>(`/admin/blog/posts/${id}`);
  return data;
}

export async function adminUploadImage(file: File): Promise<{ url: string; filename: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await authedApi.post<{ url: string; filename: string }>(
    "/admin/blog/upload-image",
    fd,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
}
