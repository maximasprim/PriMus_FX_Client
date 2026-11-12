import { getApiBaseUrl, getApiKey } from "./config";
import type {
  AccountStatus,
  AISettings,
  ChatMessage,
  ChatResponse,
  DailyReport,
  ManualCloseResponse,
  ManualEnterResponse,
  ManualModifyResponse,
  ManualPreviewResponse,
  MarketHoursStatus,
  MarketSnapshot,
  OpenPosition,
  PerformanceSummary,
  PositionCheckResult,
  RiskCalculation,
  BacktestJob,
  BacktestListItem,
  HoldoutState,
  HistoryResponse,
  PresetInfo,
  PresetsResponse,
  ScheduleView,
  ScalperConfigResponse,
  ScalperDiagnostics,
  ScalperStatus,
  SignalRow,
  TradeSetup,
  TradingControlStatus,
  WeeklyReport,
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
      headers: { "Content-Type": "application/json", "X-API-Key": getApiKey(), ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError(0, `Could not reach the backend at ${getApiBaseUrl()}. Check the API URL in Settings.`);
  }
  if (res.status === 401) {
    throw new ApiError(401, "The backend rejected the API key. Open Settings and enter the API key (API_SECRET_KEY from Server/.env).");
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, body || `Request failed with status ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface HistoryQuery {
  limit?: number; offset?: number; since?: number; until?: number; instrument?: string;
  result?: string; preset?: string; reason?: string; status?: string;
}

function historyQs(p: HistoryQuery): string {
  const qs = new URLSearchParams();
  Object.entries(p).forEach(([k, v]) => { if (v !== undefined && v !== "" && v !== null) qs.set(k, String(v)); });
  qs.set("tz", Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  return `?${qs.toString()}`;
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

  riskCalculator: {
    calculate: (payload: {
      instrument: string;
      direction: string;
      entry: number;
      stop_loss: number;
      take_profit: number;
      capital: number;
      risk_pct: number;
    }) =>
      request<RiskCalculation>("/api/risk-calculator/calculate", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    signalsForCalculator: () => request<SignalRow[]>("/api/risk-calculator/signals-for-calculator"),
  },

  positions: {
    check: () => request<PositionCheckResult>("/api/positions/check", { method: "POST" }),
    listOpen: () => request<OpenPosition[]>("/api/positions/open"),
  },

  reports: {
    daily: () => request<{ report: DailyReport }>("/api/notifications/reports/daily", { method: "POST" }),
    weekly: () => request<{ report: WeeklyReport }>("/api/notifications/reports/weekly", { method: "POST" }),
  },

  execution: {
    manualEnter: (instrument: string, confirm = false, actor = "dashboard") =>
      request<ManualEnterResponse>("/api/execution/manual/enter", {
        method: "POST",
        body: JSON.stringify({ instrument, confirm, actor }),
      }),
    manualClose: (instrument: string, confirm = false, closeFraction = 1.0, actor = "dashboard") =>
      request<ManualCloseResponse>("/api/execution/manual/close", {
        method: "POST",
        body: JSON.stringify({ instrument, confirm, close_fraction: closeFraction, actor }),
      }),
    manualModify: (
      instrument: string,
      newStopLoss: number | null,
      newTakeProfit: number | null,
      actor = "dashboard"
    ) =>
      request<ManualModifyResponse>("/api/execution/manual/modify", {
        method: "POST",
        body: JSON.stringify({
          instrument,
          new_stop_loss: newStopLoss,
          new_take_profit: newTakeProfit,
          actor,
        }),
      }),
    manualPreview: (symbol: string) =>
      request<ManualPreviewResponse>(`/api/execution/manual/preview/${symbol.replace(/\//g, "-")}`),
  },

  chat: {
    sendMessage: (messages: ChatMessage[], actor = "dashboard-chat") =>
      request<ChatResponse>("/api/chat/message", {
        method: "POST",
        body: JSON.stringify({ messages, actor }),
      }),
  },

  account: {
    status: () => request<AccountStatus>("/api/account/status"),
  },

  aiSettings: {
    get: () => request<AISettings>("/api/ai-settings"),
    update: (update: { provider?: string; model?: string | null; analysis_enrichment_enabled?: boolean }) =>
      request<AISettings>("/api/ai-settings", {
        method: "PUT",
        body: JSON.stringify(update),
      }),
  },

  marketHours: {
    status: () => request<MarketHoursStatus>("/api/market-hours/status"),
  },

  scalper: {
    status: () => request<ScalperStatus>("/api/scalper/status"),
    config: () => request<ScalperConfigResponse>("/api/scalper/config"),
    updateConfig: (changes: Record<string, unknown>, acknowledgeLiveRisk = false) =>
      request<{ config: ScalperConfigResponse["config"]; applied_live: boolean }>(
        `/api/scalper/config${acknowledgeLiveRisk ? "?acknowledge_live_risk=true" : ""}`,
        { method: "PUT", body: JSON.stringify(changes) }
      ),
    resetConfig: () => request<{ config: ScalperConfigResponse["config"] }>("/api/scalper/config/reset", { method: "POST" }),
    start: () => request<ScalperStatus>("/api/scalper/start", { method: "POST" }),
    stop: (closePositions = false) =>
      request<ScalperStatus>("/api/scalper/stop", { method: "POST", body: JSON.stringify({ close_positions: closePositions }) }),
    flatten: () => request<ScalperStatus & { closed: number }>("/api/scalper/flatten", { method: "POST" }),
    diagnostics: () => request<ScalperDiagnostics>("/api/scalper/diagnostics"),
    history: (p: HistoryQuery = {}) => request<HistoryResponse>(`/api/scalper/history${historyQs(p)}`),
    downloadHistoryCsv: async (p: HistoryQuery = {}) => {
      const res = await fetch(`${getApiBaseUrl()}/api/scalper/history/export${historyQs({ ...p, limit: undefined, offset: undefined })}`, {
        headers: { "X-API-Key": getApiKey() },
      });
      if (!res.ok) throw new ApiError(res.status, await res.text().catch(() => "Download failed"));
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `scalper_trades_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },
    presets: {
      list: () => request<PresetsResponse>("/api/scalper/presets"),
      create: (name: string, description = "") =>
        request<{ preset: PresetInfo }>("/api/scalper/presets", { method: "POST", body: JSON.stringify({ name, description }) }),
      rename: (id: string, name: string, description?: string) =>
        request<{ preset: PresetInfo }>(`/api/scalper/presets/${id}`, { method: "PUT", body: JSON.stringify({ name, description }) }),
      updateFromCurrent: (id: string) =>
        request<{ preset: PresetInfo }>(`/api/scalper/presets/${id}`, { method: "PUT", body: JSON.stringify({ use_current_settings: true }) }),
      remove: (id: string) => request<{ deleted: string }>(`/api/scalper/presets/${id}`, { method: "DELETE" }),
      apply: (id: string) =>
        request<{ config: ScalperConfigResponse["config"]; changed: { key: string; from: unknown; to: unknown }[]; applied_live: boolean }>(
          `/api/scalper/presets/${id}/apply`, { method: "POST" }),
    },
    schedule: {
      get: () => request<ScheduleView>("/api/scalper/schedule"),
      save: (body: Record<string, unknown>) => request<ScheduleView>("/api/scalper/schedule", { method: "PUT", body: JSON.stringify(body) }),
    },
    startTimed: (body: { duration_minutes: number; profit_target_money: number; close_positions_at_end: boolean }) =>
      request<ScalperStatus>("/api/scalper/start-timed", { method: "POST", body: JSON.stringify(body) }),
    backtest: {
      start: (body: Record<string, unknown>) =>
        request<{ job_id: string }>("/api/scalper/backtest", { method: "POST", body: JSON.stringify(body) }),
      status: (id: string) => request<BacktestJob>(`/api/scalper/backtest/${id}`),
      list: () => request<BacktestListItem[]>("/api/scalper/backtest"),
      cancel: (id: string) => request<BacktestJob>(`/api/scalper/backtest/${id}/cancel`, { method: "POST" }),
      holdout: () => request<HoldoutState>("/api/scalper/backtest/holdout"),
      resetHoldout: () => request<HoldoutState>("/api/scalper/backtest/holdout/reset", { method: "POST" }),
    },
  },
};

/** Turns an ApiError body like {"detail":[{"field","message"}]} or {"detail":"..."} into readable text. */
export function describeApiError(err: unknown): string {
  if (!(err instanceof Error)) return "Something went wrong.";
  try {
    const detail = JSON.parse(err.message)?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail.map((d: { field?: string; message?: string }) => `${d.field ? d.field.replace(/_/g, " ") + ": " : ""}${d.message ?? ""}`).join(" · ");
    }
  } catch {
    /* not JSON */
  }
  return err.message;
}

export { ApiError };
