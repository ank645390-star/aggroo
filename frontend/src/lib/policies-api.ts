import axios from "axios";
import { authedApi } from "./auth-api";

/* =====================================================================
   policies-api.ts — клієнт для site-policies API.
   Public: GET /policies, /policies/:type
   Admin:  GET /admin/policies, PUT /admin/policies/:type
   ===================================================================== */

declare const process: { env: Record<string, string | undefined> };
const BACKEND_URL =
  (typeof process !== "undefined" && process.env.REACT_APP_BACKEND_URL) || "";

export type PolicyType = "cookie" | "privacy" | "terms";

export type Policy = {
  type: PolicyType;
  button_label: string;
  title: string;
  html_content: string;
  updated_at?: string;
};

export type PolicyUpdate = {
  button_label?: string;
  title?: string;
  html_content?: string;
};

const publicApi = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 15000,
});

export async function fetchAllPolicies(): Promise<Policy[]> {
  const res = await publicApi.get<{ items: Policy[] }>("/policies");
  return res.data.items || [];
}

export async function fetchPolicy(type: PolicyType): Promise<Policy> {
  const res = await publicApi.get<Policy>(`/policies/${type}`);
  return res.data;
}

export async function adminListPolicies(): Promise<Policy[]> {
  const res = await authedApi.get<{ items: Policy[] }>("/admin/policies");
  return res.data.items || [];
}

export async function adminUpdatePolicy(
  type: PolicyType,
  payload: PolicyUpdate,
): Promise<Policy> {
  const res = await authedApi.put<Policy>(`/admin/policies/${type}`, payload);
  return res.data;
}
