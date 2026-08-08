const STORAGE_KEY = "forex-ai-analyst:api-base-url";
const DEFAULT_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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
