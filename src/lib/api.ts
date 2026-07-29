import { getApiBaseUrl } from "./config";
import type {
  MarketSnapshot,
  PerformanceSummary,
  SignalRow,
  TradeSetup,
  TradingControlStatus,
} from "../types/api";

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError(0, `Could not reach the backend at ${getApiBaseUrl()}. Check the API URL in Settings.`);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, body || `Request failed with status ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string }>("/health"),

  markets: {
    list: () => request<{ active_instruments: string[]; planned_instruments: string[] }>("/api/markets"),
    // Backend routes expect dash-separated symbols (e.g. "EUR-USD"), which
    // they convert internally to "EUR/USD" -- NOT a URL-encoded slash
    // (%2F), which Starlette's default path converter won't decode back
    // into a path segment and will 404 on. Confirmed against a live server.
    get: (symbol: string) => request<MarketSnapshot>(`/api/markets/${symbol.replace(/\//g, "-")}`),
  },

  analysis: {
    get: (symbol: string) => request<TradeSetup>(`/api/analysis/${symbol.replace(/\//g, "-")}`),
  },

  signals: {
    list: (params?: { instrument?: string; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.instrument) qs.set("instrument", params.instrument);
      if (params?.limit) qs.set("limit", String(params.limit));
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      return request<SignalRow[]>(`/api/signals${suffix}`);
    },
  },

  performance: {
    get: (instrument?: string) => {
      const qs = instrument ? `?instrument=${encodeURIComponent(instrument)}` : "";
      return request<PerformanceSummary>(`/api/performance${qs}`);
    },
  },

  tradingControl: {
    status: () => request<TradingControlStatus>("/api/trading-control/status"),
    setGlobalMode: (mode: string, changed_by: string) =>
      request("/api/trading-control/mode", { method: "POST", body: JSON.stringify({ mode, changed_by }) }),
    setInstrumentMode: (instrument: string, mode: string) =>
      request("/api/trading-control/instrument-mode", {
        method: "POST",
        body: JSON.stringify({ instrument, mode }),
      }),
    requestEnableAutoTrading: (actor: string) =>
      request<{ message: string }>("/api/trading-control/auto-trading/request-enable", {
        method: "POST",
        body: JSON.stringify({ actor }),
      }),
    confirmEnableAutoTrading: (actor: string) =>
      request("/api/trading-control/auto-trading/confirm-enable", {
        method: "POST",
        body: JSON.stringify({ actor }),
      }),
    stopNewTrades: (actor: string) =>
      request("/api/trading-control/emergency/stop-new-trades", {
        method: "POST",
        body: JSON.stringify({ actor }),
      }),
    clearEmergencyStop: (actor: string) =>
      request("/api/trading-control/emergency/clear-stop", {
        method: "POST",
        body: JSON.stringify({ actor }),
      }),
  },

  backtests: {
    run: (payload: { instrument: string; timeframe: string; start: string; end: string }) =>
      request("/api/backtests/run", { method: "POST", body: JSON.stringify(payload) }),
  },
};

export { ApiError };
