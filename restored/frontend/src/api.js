import axios from "axios";
import placeholderUrl from "./assets/order-placeholder.svg";

export { placeholderUrl };

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8787",
});

export function assetUrl(value) {
  if (!value) return placeholderUrl;
  if (/^https?:\/\//.test(value)) return value;
  if (value.startsWith("/images/")) return `${api.defaults.baseURL}${value}`;
  return value;
}
