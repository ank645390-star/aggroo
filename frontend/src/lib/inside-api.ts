import { authedApi } from "./auth-api";

export type InsideTab = {
  id: string;
  slug: string;
  label: string;
  title: string;
  description: string;
  image_url: string;
  image_alt: string;
  accent_color: string;
  is_active: boolean;
  order: number;
  created_at?: string;
  updated_at?: string;
};

export type InsideTabCreate = {
  label: string;
  slug?: string;
  title?: string;
  description?: string;
  image_url?: string;
  image_alt?: string;
  accent_color?: string;
  is_active?: boolean;
  order?: number;
};

export type InsideTabPatch = Partial<InsideTabCreate>;

export type InsideMeta = {
  title1: string;
  title2: string;
  updated_at?: string;
};

// ===== Public =====
export async function listInsideTabsPublic(): Promise<InsideTab[]> {
  const { data } = await authedApi.get<InsideTab[]>("/inside-tabs");
  return data;
}
export async function getInsideMetaPublic(): Promise<InsideMeta> {
  const { data } = await authedApi.get<InsideMeta>("/inside-tabs/meta");
  return data;
}

// ===== Admin =====
export async function listInsideTabsAdmin(): Promise<InsideTab[]> {
  const { data } = await authedApi.get<InsideTab[]>("/admin/inside-tabs");
  return data;
}
export async function createInsideTab(payload: InsideTabCreate): Promise<InsideTab> {
  const { data } = await authedApi.post<InsideTab>("/admin/inside-tabs", payload);
  return data;
}
export async function patchInsideTab(id: string, payload: InsideTabPatch): Promise<InsideTab> {
  const { data } = await authedApi.patch<InsideTab>(`/admin/inside-tabs/${id}`, payload);
  return data;
}
export async function deleteInsideTab(id: string): Promise<void> {
  await authedApi.delete(`/admin/inside-tabs/${id}`);
}
export async function reorderInsideTabs(ids: string[]): Promise<InsideTab[]> {
  const { data } = await authedApi.put<InsideTab[]>("/admin/inside-tabs/reorder", { ids });
  return data;
}
export async function getInsideMetaAdmin(): Promise<InsideMeta> {
  const { data } = await authedApi.get<InsideMeta>("/admin/inside-tabs/meta");
  return data;
}
export async function updateInsideMeta(payload: Partial<InsideMeta>): Promise<InsideMeta> {
  const { data } = await authedApi.put<InsideMeta>("/admin/inside-tabs/meta", payload);
  return data;
}
