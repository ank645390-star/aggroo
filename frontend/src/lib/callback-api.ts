import axios from "axios";

declare const process: { env: Record<string, string | undefined> };
const BACKEND_URL = (typeof process !== "undefined" && process.env.REACT_APP_BACKEND_URL) || "";

const api = axios.create({ baseURL: `${BACKEND_URL}/api`, timeout: 20000 });

export type CallbackPayload = {
  name: string;
  phone: string;
  comment?: string;
  consent: boolean;
};

export async function submitCallback(payload: CallbackPayload) {
  const { data } = await api.post("/callbacks", payload);
  return data;
}
