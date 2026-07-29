import { useState } from "react";
import { Panel, ErrorState } from "./Panel";
import { StatusBadge } from "./StatusBadge";
import { useApiData } from "../hooks/useApiData";
import { api } from "../lib/api";

const ACTOR = "dashboard-user";
const INSTRUMENTS = ["EUR/USD", "GBP/USD", "XAU/USD"];
const GLOBAL_MODES = ["ANALYSIS_ONLY", "ALERT_MODE", "MANUAL_APPROVAL", "FULL_AUTO"] as const;
const INSTRUMENT_MODES = ["AUTO", "APPROVAL", "ALERT_ONLY", "DISABLED"] as const;

export function ControlCenterPanel() {
  const { data, error, loading, refetch } = useApiData(() => api.tradingControl.status(), [], 10_000);
  const [busy, setBusy] = useState<string | null>(null);

  const handleSetGlobalMode = async (mode: string) => {
    setBusy("global");
    try {
      await api.tradingControl.setGlobalMode(mode, ACTOR);
      refetch();
    } finally {
      setBusy(null);
    }
  };

  const handleSetInstrumentMode = async (instrument: string, mode: string) => {
    setBusy(instrument);
    try {
      await api.tradingControl.setInstrumentMode(instrument, mode);
      refetch();
    } finally {
      setBusy(null);
    }
  };

  return (
    <Panel eyebrow="Safety" title="Trading Control Center">
      {loading && !data && <p className="font-mono text-xs text-dim">Loading…</p>}
      {error && <ErrorState message={error} />}

      {data && (
        <div className="space-y-6">
          <div>
            <h4 className="mb-2 font-mono text-[10px] tracking-widest text-dim uppercase">Global Mode</h4>
            <div className="flex flex-wrap gap-2">
              {GLOBAL_MODES.map((mode) => (
                <button
                  key={mode}
                  disabled={busy === "global"}
                  onClick={() => handleSetGlobalMode(mode)}
                  className={`rounded-sm border px-3 py-1.5 font-mono text-xs transition-colors disabled:opacity-50 ${
                    data.global_mode === mode
                      ? "border-signal/40 bg-signal/12 text-signal"
                      : "border-hairline text-dim hover:text-paper"
                  }`}
                >
                  {mode.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-2 font-mono text-[10px] tracking-widest text-dim uppercase">Per-instrument mode</h4>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse">
                <tbody>
                  {INSTRUMENTS.map((instrument) => {
                    const current = data.instrument_modes[instrument] ?? "ALERT_ONLY";
                    return (
                      <tr key={instrument} className="border-b border-hairline/60 last:border-0">
                        <td className="py-2.5 pr-4 font-mono text-sm text-paper">{instrument}</td>
                        <td className="py-2.5">
                          <div className="flex gap-1.5">
                            {INSTRUMENT_MODES.map((mode) => (
                              <button
                                key={mode}
                                disabled={busy === instrument}
                                onClick={() => handleSetInstrumentMode(instrument, mode)}
                                className={`rounded-sm border px-2 py-1 font-mono text-[11px] transition-colors disabled:opacity-50 ${
                                  current === mode
                                    ? "border-signal/40 bg-signal/12 text-signal"
                                    : "border-hairline text-dim hover:text-paper"
                                }`}
                              >
                                {mode}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 border-t border-hairline pt-4 font-mono text-xs">
            <span className="text-dim">
              Auto-trading:{" "}
              <span className={data.auto_trading_enabled ? "text-signal" : "text-dim"}>
                {data.auto_trading_enabled ? "ON" : "OFF"}
              </span>
            </span>
            <span className="text-dim">
              Paper trading:{" "}
              <span className={data.paper_trading_enabled ? "text-signal" : "text-dim"}>
                {data.paper_trading_enabled ? "ON" : "OFF"}
              </span>
            </span>
            <span className="text-dim">
              Emergency stop:{" "}
              <span className={data.emergency_stop_active ? "text-danger" : "text-dim"}>
                {data.emergency_stop_active ? "ACTIVE" : "clear"}
              </span>
            </span>
          </div>

          <div>
            <h4 className="mb-2 font-mono text-[10px] tracking-widest text-dim uppercase">Recent audit log</h4>
            {data.recent_audit_log.length === 0 ? (
              <p className="font-mono text-xs text-dim">No mode changes recorded yet.</p>
            ) : (
              <div className="space-y-1.5">
                {[...data.recent_audit_log].reverse().map((entry, i) => (
                  <div key={i} className="flex items-center gap-2 font-mono text-[11px]">
                    <StatusBadge tone="dim">{entry.previous_mode} → {entry.new_mode}</StatusBadge>
                    <span className="text-dim">by {entry.changed_by}</span>
                    <span className="ml-auto text-dim">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}
