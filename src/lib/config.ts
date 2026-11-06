const STORAGE_KEY = "forex-ai-analyst:api-base-url";
const DEFAULT_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const KEY_STORAGE = "forex-ai-analyst:api-key";

/** The shared secret the backend requires in the X-API-Key header (API_SECRET_KEY in Server/.env). */
export function getApiKey(): string {
  return (localStorage.getItem(KEY_STORAGE) ?? import.meta.env.VITE_API_KEY ?? "").trim();
}

export function setApiKey(key: string): void {
  localStorage.setItem(KEY_STORAGE, key.trim());
}

export function getApiBaseUrl(): string {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored && stored.trim() ? stored.trim().replace(/\/+$/, "") : DEFAULT_BASE_URL;
}

export function setApiBaseUrl(url: string): void {
  localStorage.setItem(STORAGE_KEY, url.trim().replace(/\/+$/, ""));
}

export function getWsBaseUrl(): string {
  return getApiBaseUrl().replace(/^http/, "ws");
}
