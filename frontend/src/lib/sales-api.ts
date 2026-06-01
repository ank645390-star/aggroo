/**
 * Sales / CRM API client — admin-side endpoints under /api/admin/sales/*
 * (plus customer-facing /api/sales/orders/{session}/{id}/* for self-service payment proof).
 */
import axios from "axios";
import { getToken } from "./auth-api";

const BACKEND_URL = (typeof process !== "undefined" && process.env.REACT_APP_BACKEND_URL) || "";
const API = `${BACKEND_URL}/api`;

function authHeaders(): Record<string, string> {
  const tok = getToken();
  return tok ? { Authorization: `Bearer ${tok}` } : {};
}

// ============== Types ==============
export type PaymentStatus =
  | "pending" | "awaiting_confirmation" | "paid" | "refunded" | "failed";
export type PaymentMethod = "cod" | "bank_transfer" | "card";
export type InternalStatus =
  | "new" | "confirmed" | "packed" | "shipped" | "delivered" | "cancelled";

export interface AdminOrderListItem {
  id: string;
  number: string;
  session_id: string;
  items_count: number;
  subtotal: number;
  delivery_cost: number;
  total: number;
  status: string;
  internal_status: InternalStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  paid_at?: string | null;
  paid_amount?: number | null;
  carrier: string;
  ttn?: string | null;
  city: string;
  address: string;
  recipient_first_name: string;
  recipient_last_name: string;
  phone: string;
  customer_email?: string | null;
  user_id?: string | null;
  tags: string[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AdminOrderDetail extends AdminOrderListItem {
  items: any[];
  comment?: string | null;
  payment_proof_url?: string | null;
  admin_notes: { text: string; author_email?: string; created_at?: string }[];
  events: {
    type: string;
    actor: "system" | "customer" | "admin";
    actor_email?: string | null;
    detail?: string | null;
    created_at?: string | null;
  }[];
}

export interface OrderListResp {
  items: AdminOrderListItem[];
  total: number;
  limit: number;
  skip: number;
}

export interface AbandonedCartItem {
  session_id: string;
  items_count: number;
  estimated_total: number;
  last_updated_at?: string | null;
  minutes_since_update: number;
  contact_phone?: string | null;
  contact_email?: string | null;
  contact_name?: string | null;
  user_id?: string | null;
  contacted_at?: string | null;
  contacted_by?: string | null;
  contacted_note?: string | null;
  items_preview: { name?: string; quantity: number; price: number; image?: string }[];
}

export interface AbandonedCartListResp {
  items: AbandonedCartItem[];
  total: number;
  limit: number;
  skip: number;
}

export interface UserSummaryItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  orders_count: number;
  paid_orders_count: number;
  lifetime_value: number;
  last_order_at?: string | null;
  created_at?: string | null;
}

export interface UserSummaryListResp {
  items: UserSummaryItem[];
  total: number;
  limit: number;
  skip: number;
}

export interface UpsellRule {
  id: string;
  title: string;
  source_product_slugs: string[];
  target_product_slugs: string[];
  priority: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UpsellListResp {
  items: UpsellRule[];
  total: number;
}

export interface DashboardKpi {
  orders_total: number;
  orders_paid: number;
  orders_awaiting_confirmation: number;
  orders_pending: number;
  orders_cancelled: number;
  revenue_total: number;
  revenue_today: number;
  revenue_7d: number;
  revenue_30d: number;
  avg_order_value: number;
  abandoned_carts: number;
  abandoned_value: number;
  users_total: number;
  users_new_24h: number;
  users_new_7d: number;
  conversion_rate: number;
  top_products: { product_id: string; name: string; photo?: string; qty: number; revenue: number }[];
}

// ============== Orders ==============
export async function listAdminOrders(params: {
  payment_status?: PaymentStatus;
  internal_status?: InternalStatus;
  payment_method?: PaymentMethod;
  q?: string;
  limit?: number;
  skip?: number;
} = {}): Promise<OrderListResp> {
  const { data } = await axios.get(`${API}/admin/sales/orders`, {
    params,
    headers: authHeaders(),
  });
  return data;
}

export async function getAdminOrder(id: string): Promise<AdminOrderDetail> {
  const { data } = await axios.get(`${API}/admin/sales/orders/${id}`, { headers: authHeaders() });
  return data;
}

export async function patchAdminOrder(id: string, payload: Partial<{
  internal_status: InternalStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  ttn: string;
  customer_email: string;
  tags: string[];
  comment: string;
}>): Promise<AdminOrderDetail> {
  const { data } = await axios.patch(`${API}/admin/sales/orders/${id}`, payload, { headers: authHeaders() });
  return data;
}

export async function confirmPayment(id: string, paid_amount?: number, note?: string): Promise<AdminOrderDetail> {
  const { data } = await axios.post(
    `${API}/admin/sales/orders/${id}/payment/confirm`,
    { paid_amount, note },
    { headers: authHeaders() },
  );
  return data;
}

export async function refundPayment(id: string, text: string): Promise<AdminOrderDetail> {
  const { data } = await axios.post(`${API}/admin/sales/orders/${id}/payment/refund`, { text }, { headers: authHeaders() });
  return data;
}

export async function failPayment(id: string, text: string): Promise<AdminOrderDetail> {
  const { data } = await axios.post(`${API}/admin/sales/orders/${id}/payment/fail`, { text }, { headers: authHeaders() });
  return data;
}

export async function adminUploadProof(id: string, file: File): Promise<AdminOrderDetail> {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await axios.post(
    `${API}/admin/sales/orders/${id}/payment/upload-proof`,
    fd,
    { headers: { ...authHeaders(), "Content-Type": "multipart/form-data" } },
  );
  return data;
}

export async function addOrderNote(id: string, text: string): Promise<AdminOrderDetail> {
  const { data } = await axios.post(`${API}/admin/sales/orders/${id}/notes`, { text }, { headers: authHeaders() });
  return data;
}

// ============== Abandoned carts ==============
export async function listAbandonedCarts(params: {
  threshold_minutes?: number;
  contacted?: boolean;
  limit?: number;
  skip?: number;
} = {}): Promise<AbandonedCartListResp> {
  const { data } = await axios.get(`${API}/admin/sales/abandoned-carts`, { params, headers: authHeaders() });
  return data;
}

export async function markCartContacted(session_id: string, note?: string): Promise<AbandonedCartItem> {
  const { data } = await axios.post(
    `${API}/admin/sales/abandoned-carts/${session_id}/mark-contacted`,
    { note },
    { headers: authHeaders() },
  );
  return data;
}

// ============== Users ==============
export async function listAdminUsers(params: { q?: string; role?: string; limit?: number; skip?: number } = {}): Promise<UserSummaryListResp> {
  const { data } = await axios.get(`${API}/admin/sales/users`, { params, headers: authHeaders() });
  return data;
}

// ============== Upsells ==============
export async function listUpsells(): Promise<UpsellListResp> {
  const { data } = await axios.get(`${API}/admin/sales/upsells`, { headers: authHeaders() });
  return data;
}

export async function createUpsell(payload: Partial<UpsellRule>): Promise<UpsellRule> {
  const { data } = await axios.post(`${API}/admin/sales/upsells`, payload, { headers: authHeaders() });
  return data;
}

export async function updateUpsell(id: string, payload: Partial<UpsellRule>): Promise<UpsellRule> {
  const { data } = await axios.patch(`${API}/admin/sales/upsells/${id}`, payload, { headers: authHeaders() });
  return data;
}

export async function deleteUpsell(id: string): Promise<void> {
  await axios.delete(`${API}/admin/sales/upsells/${id}`, { headers: authHeaders() });
}

// ============== Dashboard ==============
export async function getSalesDashboard(): Promise<DashboardKpi> {
  const { data } = await axios.get(`${API}/admin/sales/dashboard`, { headers: authHeaders() });
  return data;
}

// ============== Helpers ==============
export function paymentStatusLabel(s: PaymentStatus): { text: string; color: string } {
  switch (s) {
    case "paid":                  return { text: "Оплачено",       color: "#0d9344" };
    case "awaiting_confirmation": return { text: "Очікує підтв.",   color: "#b45309" };
    case "pending":               return { text: "Не оплачено",     color: "#92400e" };
    case "refunded":              return { text: "Повернено",        color: "#6b7280" };
    case "failed":                return { text: "Невдала опл.",   color: "#b91c1c" };
    default:                      return { text: s as string,        color: "#374151" };
  }
}

export function internalStatusLabel(s: InternalStatus): { text: string; color: string } {
  switch (s) {
    case "new":       return { text: "Нове",        color: "#2563eb" };
    case "confirmed": return { text: "Підтвердж.", color: "#0891b2" };
    case "packed":    return { text: "Запаковано", color: "#7c3aed" };
    case "shipped":   return { text: "Відправлено", color: "#0d9344" };
    case "delivered": return { text: "Доставлено", color: "#1f7a3a" };
    case "cancelled": return { text: "Скасовано",  color: "#b91c1c" };
    default:          return { text: s as string,   color: "#374151" };
  }
}

export function paymentMethodLabel(m: PaymentMethod): string {
  switch (m) {
    case "cod":           return "Накладений платіж";
    case "bank_transfer": return "Переказ на рахунок";
    case "card":          return "Онлайн-карта";
    default:              return m as string;
  }
}
