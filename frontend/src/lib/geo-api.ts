/**
 * Geo API client — обгортка над backend-проксі для Nova Poshta та Ukrposhta.
 * Працює без авторизації — всі ключі лежать на бекенді.
 */
import axios from "axios";

declare const process: { env: Record<string, string | undefined> };
const BACKEND_URL =
  (typeof process !== "undefined" && process.env.REACT_APP_BACKEND_URL) || "";

const api = axios.create({ baseURL: `${BACKEND_URL}/api`, timeout: 20000 });

export type NPCity = {
  ref: string;
  name: string;
  area: string;
  region: string;
  settlement_type: string;
  present: string;
};
export type NPWarehouse = {
  ref: string;
  number: string;
  description: string;
  short_address: string;
  type: string;
};

export async function searchCities(q: string, limit = 12): Promise<NPCity[]> {
  if (!q.trim()) return [];
  const { data } = await api.get<{ items: NPCity[] }>("/np/cities", {
    params: { q, limit },
  });
  return data.items || [];
}

export async function searchWarehouses(
  cityRef: string,
  q: string,
  limit = 50,
): Promise<NPWarehouse[]> {
  if (!cityRef) return [];
  const { data } = await api.get<{ items: NPWarehouse[] }>("/np/warehouses", {
    params: { city_ref: cityRef, q, limit },
  });
  return data.items || [];
}

export type UPPostOffice = {
  postcode: string;
  name: string;
  city: string;
  address: string;
  region: string;
};

export async function fetchUkrposhtaByPostcode(postcode: string): Promise<UPPostOffice[]> {
  if (!/^\d{5}$/.test(postcode)) return [];
  try {
    const { data } = await api.get<{ items: UPPostOffice[] }>("/up/postoffices", {
      params: { postcode },
    });
    return data.items || [];
  } catch { return []; }
}
