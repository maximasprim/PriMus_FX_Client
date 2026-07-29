import { TrendingDown, TrendingUp } from "lucide-react";
import { Panel, ErrorState } from "./Panel";
import { StatusBadge } from "./StatusBadge";
import { toneForGrade } from "../lib/tones";
import { useApiData } from "../hooks/useApiData";
import { api } from "../lib/api";

const INSTRUMENTS = ["EUR/USD", "GBP/USD", "XAU/USD"];

function InstrumentCard({ instrument }: { instrument: string }) {
  const { data, error, loading } = useApiData(() => api.markets.get(instrument), [instrument], 15_000);
  const { data: analysis } = useApiData(() => api.analysis.get(instrument), [instrument], 30_000);

  const bullish = data?.market_bias.includes("Bullish");
  const bearish = data?.market_bias.includes("Bearish");

  return (
    <div className="rounded-md border border-hairline bg-panel-raised p-4">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="font-display text-base font-semibold text-paper">{instrument}</h3>
          {data && (
            <p className="font-mono text-xs text-dim">
              bid {data.current_price.bid.toFixed(instrument.includes("XAU") ? 2 : 5)} / ask{" "}
              {data.current_price.ask.toFixed(instrument.includes("XAU") ? 2 : 5)}
            </p>
          )}
        </div>
        {bullish && <TrendingUp size={18} className="text-signal" />}
        {bearish && <TrendingDown size={18} className="text-danger" />}
      </div>

      {loading && !data && <p className="font-mono text-xs text-dim">Loading…</p>}
      {error && <ErrorState message={error} />}

      {data && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge tone={bullish ? "signal" : bearish ? "danger" : "dim"}>{data.market_bias}</StatusBadge>
            <StatusBadge tone="dim">{data.market_regime}</StatusBadge>
          </div>
          {data.latest_structure_event && (
            <p className="font-mono text-[11px] text-dim">latest: {data.latest_structure_event}</p>
          )}
        </div>
      )}

      {analysis && (
        <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3">
          <span className="font-mono text-[10px] tracking-widest text-dim uppercase">Confluence</span>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-hairline">
              <div
                className="h-full rounded-full bg-signal"
                style={{ width: `${analysis.confluence_score}%` }}
              />
            </div>
            <span className="font-mono text-xs text-paper">{analysis.confluence_score}</span>
            <StatusBadge tone={toneForGrade(analysis.grade)}>{analysis.grade}</StatusBadge>
          </div>
        </div>
      )}
    </div>
  );
}

export function WatchlistPanel() {
  return (
    <Panel eyebrow="Live" title="Market Watchlist">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {INSTRUMENTS.map((instrument) => (
          <InstrumentCard key={instrument} instrument={instrument} />
        ))}
      </div>
    </Panel>
  );
}
