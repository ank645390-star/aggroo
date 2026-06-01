import { authedApi } from "./auth-api";

export type AdminSettings = {
  channel: "telegram" | "email" | "both" | "none";
  telegram_bot_token: string;
  telegram_chat_id: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  smtp_use_tls: boolean;
  from_email: string;
  to_email: string;
  site_name: string;
  google_client_id: string;
  google_enabled: boolean;
  contact_phone_primary: string;
  contact_phone_secondary: string;
  contact_email: string;
  contact_address: string;
  updated_at?: string | null;
};

export type CallbackItem = {
  id: string;
  name: string;
  phone: string;
  comment: string;
  status: "new" | "in_progress" | "done" | "archived";
  note: string;
  notified_telegram: boolean;
  notified_email: boolean;
  created_at: string;
  updated_at?: string | null;
};

export type DashboardStats = {
  total: number;
  new: number;
  in_progress: number;
  done: number;
  today: number;
  week: number;
};

export async function getSettings(): Promise<AdminSettings> {
  const { data } = await authedApi.get<AdminSettings>("/admin/settings");
  return data;
}

export async function updateSettings(patch: Partial<AdminSettings>): Promise<AdminSettings> {
  const { data } = await authedApi.put<AdminSettings>("/admin/settings", patch);
  return data;
}

export async function testTelegram(): Promise<void> {
  await authedApi.post("/admin/settings/test-telegram");
}

export async function testEmail(): Promise<void> {
  await authedApi.post("/admin/settings/test-email");
}

export async function listCallbacks(statusF: string = "all"): Promise<CallbackItem[]> {
  const { data } = await authedApi.get<CallbackItem[]>("/admin/callbacks", { params: { status_f: statusF } });
  return data;
}

export async function patchCallback(id: string, payload: Partial<Pick<CallbackItem, "status" | "note">>): Promise<CallbackItem> {
  const { data } = await authedApi.patch<CallbackItem>(`/admin/callbacks/${id}`, payload);
  return data;
}

export async function deleteCallback(id: string): Promise<void> {
  await authedApi.delete(`/admin/callbacks/${id}`);
}

export async function getStats(): Promise<DashboardStats> {
  const { data } = await authedApi.get<DashboardStats>("/admin/stats");
  return data;
}
