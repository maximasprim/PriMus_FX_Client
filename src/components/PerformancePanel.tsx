import { Panel, ErrorState, EmptyState } from "./Panel";
import { useApiData } from "../hooks/useApiData";
import { api } from "../lib/api";

function Stat({ label, value, tone = "text-paper" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md border border-hairline bg-panel-raised p-4">
      <div className="font-mono text-[10px] tracking-widest text-dim uppercase">{label}</div>
      <div className={`mt-1 font-display text-2xl font-semibold ${tone}`}>{value}</div>
    </div>
  );
}

function BreakdownTable({ title, rows }: { title: string; rows: Record<string, { total: number; wins: number; losses: number }> }) {
  const entries = Object.entries(rows);
  if (entries.length === 0) return null;
  return (
    <div>
      <h4 className="mb-2 font-mono text-[10px] tracking-widest text-dim uppercase">{title}</h4>
      <div className="space-y-1.5">
        {entries.map(([key, stats]) => {
          const winRate = stats.total > 0 ? (stats.wins / stats.total) * 100 : 0;
          return (
            <div key={key} className="flex items-center gap-3 font-mono text-xs">
              <span className="w-20 shrink-0 text-paper">{key}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-hairline">
                <div className="h-full rounded-full bg-signal" style={{ width: `${winRate}%` }} />
              </div>
              <span className="w-24 shrink-0 text-right text-dim">
                {stats.wins}W / {stats.losses}L ({stats.total})
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PerformancePanel() {
  const { data, error, loading } = useApiData(() => api.performance.get(), [], 30_000);

  return (
    <Panel eyebrow="Track record" title="Performance Dashboard">
      {loading && !data && <p className="font-mono text-xs text-dim">Loading…</p>}
      {error && <ErrorState message={error} />}
      {data && data.total_signals === 0 && (
        <EmptyState label="No performance data yet. Stats populate once signals resolve to WIN/LOSS." />
      )}
      {data && data.total_signals > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Total Signals" value={String(data.total_signals)} />
            <Stat label="Confirmed Setups" value={String(data.confirmed_setups)} />
            <Stat
              label="Win Rate"
              value={`${data.win_rate.toFixed(1)}%`}
              tone={data.win_rate >= 50 ? "text-signal" : "text-danger"}
            />
            <Stat
              label="Profit Factor"
              value={data.profit_factor ? data.profit_factor.toFixed(2) : "—"}
              tone={data.profit_factor && data.profit_factor >= 1 ? "text-signal" : "text-danger"}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <BreakdownTable title="By Instrument" rows={data.by_instrument} />
            <BreakdownTable title="By Grade" rows={data.by_grade} />
          </div>
        </div>
      )}
    </Panel>
  );
}
