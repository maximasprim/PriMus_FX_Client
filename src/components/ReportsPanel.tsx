import { useState } from "react";
import { Panel, ErrorState } from "./Panel";
import { api, ApiError } from "../lib/api";
import type { DailyReport, WeeklyReport } from "../types/api";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-hairline bg-panel-raised p-3">
      <div className="font-mono text-[10px] tracking-widest text-dim uppercase">{label}</div>
      <div className="mt-1 font-display text-base text-paper">{value}</div>
    </div>
  );
}

export function ReportsPanel() {
  const [daily, setDaily] = useState<DailyReport | null>(null);
  const [weekly, setWeekly] = useState<WeeklyReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"daily" | "weekly" | null>(null);

  const runDaily = async () => {
    setBusy("daily");
    setError(null);
    try {
      const { report } = await api.reports.daily();
      setDaily(report);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not generate the daily report.");
    } finally {
      setBusy(null);
    }
  };

  const runWeekly = async () => {
    setBusy("weekly");
    setError(null);
    try {
      const { report } = await api.reports.weekly();
      setWeekly(report);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not generate the weekly report.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <Panel
        eyebrow="Summary"
        title="Daily Report"
        action={
          <button
            onClick={runDaily}
            disabled={busy === "daily"}
            className="rounded-sm border border-hairline px-3 py-1.5 font-mono text-xs text-paper hover:border-signal hover:text-signal disabled:opacity-50"
          >
            {busy === "daily" ? "Generating…" : "Generate"}
          </button>
        }
      >
        {error && <ErrorState message={error} />}
        {!daily && !error && (
          <p className="font-mono text-xs text-dim">Click Generate to pull today's activity.</p>
        )}
        {daily && (
          <div className="space-y-4">
            <p className="font-mono text-xs text-dim">{daily.date}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Signals" value={String(daily.signals_generated)} />
              <Stat label="A+ Setups" value={String(daily.a_plus_setups)} />
              <Stat label="Trades Executed" value={String(daily.trades_executed)} />
              <Stat label="Net Result" value={`${daily.net_result_r >= 0 ? "+" : ""}${daily.net_result_r.toFixed(2)}R`} />
            </div>
            <div className="grid grid-cols-2 gap-3 font-mono text-xs text-dim">
              <span>Best instrument: {daily.best_instrument ?? "—"}</span>
              <span>Auto-trading: {daily.auto_trading_status}</span>
            </div>
          </div>
        )}
      </Panel>

      <Panel
        eyebrow="Summary"
        title="Weekly Report"
        action={
          <button
            onClick={runWeekly}
            disabled={busy === "weekly"}
            className="rounded-sm border border-hairline px-3 py-1.5 font-mono text-xs text-paper hover:border-signal hover:text-signal disabled:opacity-50"
          >
            {busy === "weekly" ? "Generating…" : "Generate"}
          </button>
        }
      >
        {!weekly && (
          <p className="font-mono text-xs text-dim">Click Generate to pull the last 7 days.</p>
        )}
        {weekly && (
          <div className="space-y-4">
            <p className="font-mono text-xs text-dim">
              {weekly.week_start} – {weekly.week_end}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Total Signals" value={String(weekly.total_signals)} />
              <Stat label="Confirmed" value={String(weekly.confirmed_setups)} />
              <Stat label="Win Rate" value={`${weekly.win_rate}%`} />
              <Stat label="Profit Factor" value={weekly.profit_factor?.toFixed(2) ?? "—"} />
            </div>
            {Object.keys(weekly.by_instrument).length > 0 && (
              <div>
                <h4 className="mb-2 font-mono text-[10px] tracking-widest text-dim uppercase">By Instrument</h4>
                <div className="space-y-1 font-mono text-xs text-dim">
                  {Object.entries(weekly.by_instrument).map(([instrument, stats]) => (
                    <div key={instrument}>
                      {instrument}: {stats.wins}W / {stats.losses}L (of {stats.total})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Panel>

      <p className="font-mono text-[10px] text-dim">
        Generating a report also dispatches it through your configured notification channels (email, etc.), same
        as any other system alert.
      </p>
    </div>
  );
}