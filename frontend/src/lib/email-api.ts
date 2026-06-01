import axios from "axios";

declare const process: { env: Record<string, string | undefined> };
const BACKEND_URL =
  (typeof process !== "undefined" && process.env.REACT_APP_BACKEND_URL) || "";

const api = axios.create({ baseURL: `${BACKEND_URL}/api`, timeout: 20000 });

export type ContactMessagePayload = {
  name: string;
  email: string;
  subject?: string;
  message: string;
  phone?: string;
  consent: boolean;
};

export async function submitContactMessage(payload: ContactMessagePayload) {
  const { data } = await api.post("/contact-messages", payload);
  return data;
}
