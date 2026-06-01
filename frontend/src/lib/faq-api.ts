import { authedApi } from "./auth-api";

export type FaqItem = {
  id: string;
  q: string;
  a: string;
  order: number;
  created_at?: string;
  updated_at?: string;
};

export type FaqCreate = { q: string; a: string; order?: number };
export type FaqPatch = Partial<FaqCreate>;

// Public — open list (uses same axios instance; Authorization is harmless on public route)
export async function listFaqPublic(): Promise<FaqItem[]> {
  const { data } = await authedApi.get<FaqItem[]>("/faq");
  return data;
}

// Admin
export async function listFaq(): Promise<FaqItem[]> {
  const { data } = await authedApi.get<FaqItem[]>("/admin/faq");
  return data;
}

export async function createFaq(payload: FaqCreate): Promise<FaqItem> {
  const { data } = await authedApi.post<FaqItem>("/admin/faq", payload);
  return data;
}

export async function patchFaq(id: string, payload: FaqPatch): Promise<FaqItem> {
  const { data } = await authedApi.patch<FaqItem>(`/admin/faq/${id}`, payload);
  return data;
}

export async function deleteFaq(id: string): Promise<void> {
  await authedApi.delete(`/admin/faq/${id}`);
}

export async function reorderFaq(ids: string[]): Promise<FaqItem[]> {
  const { data } = await authedApi.put<FaqItem[]>("/admin/faq/reorder", { ids });
  return data;
}
