import { authedApi } from "./auth-api";
import axios from "axios";
import { setToken } from "./auth-api";
import type { AuthResponse } from "./auth-api";
import { getSessionId } from "./profile-api";

declare const process: { env: Record<string, string | undefined> };
const BACKEND_URL = (typeof process !== "undefined" && process.env.REACT_APP_BACKEND_URL) || "";

export type AuthPublicConfig = {
  google_client_id: string;
  google_enabled: boolean;
};

export async function fetchAuthConfig(): Promise<AuthPublicConfig> {
  const { data } = await axios.get<AuthPublicConfig>(`${BACKEND_URL}/api/auth/config`, { timeout: 10000 });
  return data;
}

export async function googleLogin(credential: string): Promise<AuthResponse> {
  const { data } = await authedApi.post<AuthResponse>("/auth/google", {
    credential,
    session_id: getSessionId(),
  });
  setToken(data.token);
  return data;
}
