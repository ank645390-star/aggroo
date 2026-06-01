import { authedApi } from "./auth-api";

export type Partner = {
  id: string;
  name: string;
  logo_url: string;
  link_url: string;
  alt: string;
  is_active: boolean;
  order: number;
  created_at?: string;
  updated_at?: string;
};

export type PartnerCreate = {
  name: string;
  logo_url?: string;
  link_url?: string;
  alt?: string;
  is_active?: boolean;
  order?: number;
};

export type PartnerPatch = Partial<PartnerCreate>;

// ===== Public =====
export async function listPartnersPublic(): Promise<Partner[]> {
  const { data } = await authedApi.get<Partner[]>("/trusted-partners");
  return data;
}

// ===== Admin =====
export async function listPartnersAdmin(): Promise<Partner[]> {
  const { data } = await authedApi.get<Partner[]>("/admin/trusted-partners");
  return data;
}

export async function createPartner(payload: PartnerCreate): Promise<Partner> {
  const { data } = await authedApi.post<Partner>("/admin/trusted-partners", payload);
  return data;
}

export async function patchPartner(id: string, payload: PartnerPatch): Promise<Partner> {
  const { data } = await authedApi.patch<Partner>(`/admin/trusted-partners/${id}`, payload);
  return data;
}

export async function deletePartner(id: string): Promise<void> {
  await authedApi.delete(`/admin/trusted-partners/${id}`);
}

export async function reorderPartners(ids: string[]): Promise<Partner[]> {
  const { data } = await authedApi.put<Partner[]>("/admin/trusted-partners/reorder", { ids });
  return data;
}
