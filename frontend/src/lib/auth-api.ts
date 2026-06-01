/**
 * Auth API client + helpers — реєстрація / логін / поточний користувач.
 *
 * JWT зберігається в localStorage під ключем TOKEN_LS_KEY. Вся взаємодія
 * з приватними endpoints виконується через axios-інстанс з автоматично
 * підписаним заголовком Authorization: Bearer <token>.
 */
import axios from "axios";
import { getSessionId } from "./profile-api";

declare const process: { env: Record<string, string | undefined> };
const BACKEND_URL =
  (typeof process !== "undefined" && process.env.REACT_APP_BACKEND_URL) || "";

const TOKEN_LS_KEY = "tamis-agro-auth-token-v1";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(TOKEN_LS_KEY); } catch { return null; }
}
export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(TOKEN_LS_KEY, token); } catch { /* noop */ }
}
export function clearToken(): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(TOKEN_LS_KEY); } catch { /* noop */ }
}

export const authedApi = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 15000,
});
authedApi.interceptors.request.use((cfg) => {
  const t = getToken();
  if (t) {
    (cfg.headers as any) = cfg.headers || {};
    (cfg.headers as any).Authorization = `Bearer ${t}`;
  }
  return cfg;
});

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role?: string;
};

export type AuthResponse = { token: string; user: AuthUser };

export async function register(payload: {
  email: string; password: string; firstName: string; lastName: string; phone?: string;
}): Promise<AuthResponse> {
  const { data } = await authedApi.post<AuthResponse>("/auth/register", {
    ...payload,
    session_id: getSessionId(),
  });
  setToken(data.token);
  return data;
}

export async function login(payload: { email: string; password: string }): Promise<AuthResponse> {
  const { data } = await authedApi.post<AuthResponse>("/auth/login", {
    ...payload,
    session_id: getSessionId(),
  });
  setToken(data.token);
  return data;
}

export async function fetchMe(): Promise<AuthUser | null> {
  if (!getToken()) return null;
  try {
    const { data } = await authedApi.get<AuthUser>("/auth/me");
    return data;
  } catch {
    clearToken();
    return null;
  }
}
