/* =============================================================================
 *  Discounts API client
 *  --------------------------------------------------------------------------
 *  Маленький fetch-обгортник для нашої системи знижок з адмінкою.
 *
 *  Бекенд: /api/discounts/active, /api/discounts/preview,
 *           /api/admin/discounts (CRUD, JWT admin).
 * ========================================================================== */
import axios from "axios";

const API_BASE =
  (typeof process !== "undefined" && (process as any).env
    ? (process as any).env.REACT_APP_BACKEND_URL
    : "") || "";
const API = `${API_BASE}/api`;

export type DiscountRuleType =
  | "cart_volume_l"
  | "cart_quantity"
  | "cart_subtotal"
  | "category_volume_l"
  | "category_quantity"
  | "category_subtotal";

export interface DiscountRule {
  id: string;
  name: string;
  description?: string | null;
  type: DiscountRuleType;
  threshold: number;
  percent: number;
  category_slug?: string | null;
  active: boolean;
  priority: number;
  label?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DiscountRuleCreate {
  name: string;
  description?: string;
  type: DiscountRuleType;
  threshold: number;
  percent: number;
  category_slug?: string | null;
  active?: boolean;
  priority?: number;
  label?: string;
}

export type DiscountRuleUpdate = Partial<DiscountRuleCreate>;

export interface PreviewItem {
  product_id?: string;
  productId?: string;
  slug?: string;
  name?: string;
  category?: string;
  category_slug?: string;
  volume?: string;
  price: number;
  quantity: number;
}

export interface AppliedRule {
  id: string;
  name: string;
  label: string;
  type: DiscountRuleType;
  percent: number;
  threshold: number;
  category_slug?: string | null;
  amount: number;
}

export interface RuleProgress {
  id: string;
  name: string;
  label: string;
  type: DiscountRuleType;
  percent: number;
  threshold: number;
  category_slug?: string | null;
  current: number;
  eligible: boolean;
}

export interface PreviewResponse {
  subtotal: number;
  discount_total: number;
  grand_total: number;
  applied_rules: AppliedRule[];
  progress: RuleProgress[];
}

// ----- Public -----
export async function listActiveDiscountRules(): Promise<DiscountRule[]> {
  const r = await axios.get<DiscountRule[]>(`${API}/discounts/active`);
  return r.data || [];
}

export async function previewDiscount(items: PreviewItem[]): Promise<PreviewResponse> {
  const r = await axios.post<PreviewResponse>(`${API}/discounts/preview`, { items });
  return r.data;
}

// ----- Admin (Bearer JWT) -----
function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function adminListDiscountRules(token: string): Promise<DiscountRule[]> {
  const r = await axios.get<DiscountRule[]>(`${API}/admin/discounts`, {
    headers: authHeaders(token),
  });
  return r.data || [];
}

export async function adminCreateDiscountRule(
  token: string,
  body: DiscountRuleCreate
): Promise<DiscountRule> {
  const r = await axios.post<DiscountRule>(`${API}/admin/discounts`, body, {
    headers: authHeaders(token),
  });
  return r.data;
}

export async function adminUpdateDiscountRule(
  token: string,
  id: string,
  body: DiscountRuleUpdate
): Promise<DiscountRule> {
  const r = await axios.patch<DiscountRule>(`${API}/admin/discounts/${id}`, body, {
    headers: authHeaders(token),
  });
  return r.data;
}

export async function adminDeleteDiscountRule(token: string, id: string): Promise<void> {
  await axios.delete(`${API}/admin/discounts/${id}`, {
    headers: authHeaders(token),
  });
}

export const RULE_TYPE_LABELS: Record<DiscountRuleType, string> = {
  cart_volume_l:      "Сумарний обʼєм у літрах (увесь кошик)",
  cart_quantity:      "Сумарна кількість одиниць (увесь кошик)",
  cart_subtotal:      "Сума кошика, ₴",
  category_volume_l:  "Обʼєм у літрах (категорія)",
  category_quantity:  "Кількість одиниць (категорія)",
  category_subtotal:  "Сума товарів категорії, ₴",
};

export const RULE_TYPE_UNITS: Record<DiscountRuleType, string> = {
  cart_volume_l:      "л",
  cart_quantity:      "шт",
  cart_subtotal:      "₴",
  category_volume_l:  "л",
  category_quantity:  "шт",
  category_subtotal:  "₴",
};
