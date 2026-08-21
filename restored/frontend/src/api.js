import axios from "axios";
import placeholderUrl from "./assets/order-placeholder.svg";

export { placeholderUrl };

const defaultApiBaseUrl =
  "https://script.google.com/macros/s/AKfycbwiGkEsRaJuxXkkJoyKNgBkqLfhpwUXsrYByLmeYkexuzfMIAY95k4EWn2C32VrqDbf/exec";
const baseURL = import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl;
const isAppsScript = /script\.google\.com|script\.googleusercontent\.com/.test(baseURL);
const axiosApi = axios.create({ baseURL });

async function appsScriptRequest(method, path, body) {
  const response = await fetch(baseURL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ method, path, body }),
  });
  const data = await response.json();
  if (!response.ok || data?.success === false) {
    const error = new Error(data?.message || "request failed");
    error.response = { data, status: response.status };
    throw error;
  }
  return { data };
}

export const api = isAppsScript
  ? {
      defaults: { baseURL },
      get: (path) => appsScriptRequest("GET", path),
      post: (path, body) => appsScriptRequest("POST", path, body),
      put: (path, body) => appsScriptRequest("PUT", path, body),
    }
  : axiosApi;

export function assetUrl(value) {
  if (!value) return placeholderUrl;
  if (/^https?:\/\//.test(value)) return value;
  if (value.startsWith("/images/")) return `${api.defaults.baseURL}${value}`;
  return value;
}
