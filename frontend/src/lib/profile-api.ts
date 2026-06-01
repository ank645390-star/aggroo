/**
 * HTTP-клієнт для роботи з backend (profile + addresses).
 * Використовує той же session_id, що й CartContext, через localStorage.
 *
 * Усі функції повертають promise. Якщо мережі немає — кидаємо помилку,
 * викликаючий код може зробити fallback на localStorage.
 */
import axios from "axios";

declare const process: { env: Record<string, string | undefined> };
const BACKEND_URL =
  (typeof process !== "undefined" && process.env.REACT_APP_BACKEND_URL) || "";

const SESSION_LS_KEY = "tamis-agro-cart-session-v1";

function newSessionId(): string {
  const cryptoObj =
    typeof window !== "undefined" ? (window as any).crypto : undefined;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    const existing = window.localStorage.getItem(SESSION_LS_KEY);
    if (existing) return existing;
    const fresh = newSessionId();
    window.localStorage.setItem(SESSION_LS_KEY, fresh);
    return fresh;
  } catch {
    return newSessionId();
  }
}

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 15000,
});

/* ----------------------- Profile ----------------------- */
export type ProfileDTO = {
  session_id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export async function fetchProfile(): Promise<ProfileDTO> {
  const { data } = await api.get<ProfileDTO>(`/profile/${getSessionId()}`);
  return data;
}

export async function updateProfile(
  patch: Partial<Pick<ProfileDTO, "firstName" | "lastName" | "email" | "phone">>
): Promise<ProfileDTO> {
  const { data } = await api.put<ProfileDTO>(
    `/profile/${getSessionId()}`,
    patch
  );
  return data;
}

export async function changePassword(
  current_password: string,
  new_password: string
): Promise<{ ok: boolean; message?: string }> {
  try {
    await api.post(`/profile/${getSessionId()}/password`, {
      current_password,
      new_password,
    });
    return { ok: true };
  } catch (err: any) {
    const message =
      err?.response?.data?.detail ||
      err?.message ||
      "Не вдалося змінити пароль";
    return { ok: false, message };
  }
}

/* ----------------------- Addresses ----------------------- */
export type Carrier = "novaposhta" | "ukrposhta";
export type DeliveryMode = "branch" | "courier";

export type AddressDTO = {
  id: string;
  carrier: Carrier;
  title: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  isPrimary: boolean;
  // Nova Poshta
  deliveryMode?: DeliveryMode;
  branch?: string | null;
  // Ukrposhta + courier NP
  street?: string | null;
  zip?: string | null;
};

export type AddressesResponseDTO = {
  session_id: string;
  items: AddressDTO[];
  updated_at: string;
};

export async function fetchAddresses(): Promise<AddressDTO[]> {
  const { data } = await api.get<AddressesResponseDTO>(
    `/addresses/${getSessionId()}`
  );
  return data.items || [];
}

export type AddressInput = Omit<AddressDTO, "id">;

export async function createAddress(input: AddressInput): Promise<AddressDTO[]> {
  const { data } = await api.post<AddressesResponseDTO>(
    `/addresses/${getSessionId()}`,
    input
  );
  return data.items;
}

export async function updateAddress(
  id: string,
  input: AddressInput
): Promise<AddressDTO[]> {
  const { data } = await api.put<AddressesResponseDTO>(
    `/addresses/${getSessionId()}/${id}`,
    input
  );
  return data.items;
}

export async function deleteAddress(id: string): Promise<AddressDTO[]> {
  const { data } = await api.delete<AddressesResponseDTO>(
    `/addresses/${getSessionId()}/${id}`
  );
  return data.items;
}

export async function setPrimaryAddress(id: string): Promise<AddressDTO[]> {
  const { data } = await api.post<AddressesResponseDTO>(
    `/addresses/${getSessionId()}/${id}/primary`
  );
  return data.items;
}

/* ----------------------- Orders ----------------------- */
export type OrderStatus = "in_progress" | "delivered" | "cancelled";

export type OrderItemDTO = {
  product_id: string;
  name: string;
  desc?: string | null;
  photo?: string | null;
  volume?: string | null;
  quantity: number;
  unit_price: number;
  total: number;
};

export type OrderDTO = {
  id: string;
  number: string;
  session_id: string;
  items: OrderItemDTO[];
  items_count: number;
  subtotal: number;
  delivery_cost: number;
  total: number;
  status: OrderStatus;
  carrier: Carrier;
  ttn: string | null;
  delivery_mode: string | null;
  city: string;
  address: string;
  zip: string | null;
  recipient_first_name: string;
  recipient_last_name: string;
  phone: string;
  comment?: string | null;
  created_at: string;
  updated_at: string;
};

export async function fetchOrders(): Promise<OrderDTO[]> {
  const { data } = await api.get<{ session_id: string; items: OrderDTO[] }>(
    `/orders/${getSessionId()}`
  );
  return data.items || [];
}
