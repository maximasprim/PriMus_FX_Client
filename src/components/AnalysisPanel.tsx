import { useState } from "react";
import { Panel, ErrorState } from "./Panel";
import { StatusBadge } from "./StatusBadge";
import { toneForConfidence, toneForDirection, toneForGrade } from "../lib/tones";
import { useApiData } from "../hooks/useApiData";
import { api } from "../lib/api";

const INSTRUMENTS = ["EUR/USD", "GBP/USD", "XAU/USD"];

const BREAKDOWN_LABELS: Record<string, string> = {
  market_structure: "Market Structure",
  higher_timeframe_alignment: "Higher TF Alignment",
  liquidity_confirmation: "Liquidity Confirmation",
  entry_zone_quality: "Entry Zone Quality",
  momentum: "Momentum",
  risk_reward: "Risk:Reward",
  news_and_conditions: "News & Conditions",
};

const BREAKDOWN_MAX: Record<string, number> = {
  market_structure: 20,
  higher_timeframe_alignment: 20,
  liquidity_confirmation: 15,
  entry_zone_quality: 15,
  momentum: 10,
  risk_reward: 10,
  news_and_conditions: 10,
};

export function AnalysisPanel() {
  const [selected, setSelected] = useState(INSTRUMENTS[0]);
  const { data, error, loading, refetch } = useApiData(() => api.analysis.get(selected), [selected]);

  return (
    <Panel
      eyebrow="Reasoning"
      title="AI Analysis"
      action={
        <div className="flex gap-1">
          {INSTRUMENTS.map((instrument) => (
            <button
              key={instrument}
              onClick={() => setSelected(instrument)}
              className={`rounded-sm border px-2.5 py-1 font-mono text-xs transition-colors ${
                selected === instrument
                  ? "border-signal/40 bg-signal/12 text-signal"
                  : "border-hairline text-dim hover:text-paper"
              }`}
            >
              {instrument}
            </button>
          ))}
        </div>
      }
    >
      {loading && !data && <p className="font-mono text-xs text-dim">Running analysis…</p>}
      {error && <ErrorState message={error} />}

      {data && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={toneForDirection(data.direction)}>{data.direction}</StatusBadge>
            <StatusBadge tone={toneForGrade(data.grade)}>{data.grade} · {data.confluence_score}/100</StatusBadge>
            <StatusBadge tone={toneForConfidence(data.confidence_level)}>
              Confidence: {data.confidence_level}
            </StatusBadge>
            <StatusBadge tone="dim">{data.market_regime}</StatusBadge>
            <StatusBadge tone="dim">HTF: {data.higher_timeframe_bias}</StatusBadge>
            <button onClick={refetch} className="ml-auto font-mono text-[11px] text-dim hover:text-signal">
              Re-run
            </button>
          </div>

          <div>
            <h4 className="mb-1.5 font-mono text-[10px] tracking-widest text-dim uppercase">Market Summary</h4>
            <p className="text-sm leading-relaxed text-paper">{data.reasoning}</p>
          </div>

          <div>
            <h4 className="mb-2 font-mono text-[10px] tracking-widest text-dim uppercase">
              Confluence Breakdown
            </h4>
            <div className="space-y-2">
              {Object.entries(BREAKDOWN_LABELS).map(([key, label]) => {
                const points = (data.score_breakdown as unknown as Record<string, number>)[key] ?? 0;
                const max = BREAKDOWN_MAX[key];
                const reason = data.score_breakdown.reasons?.[key];
                return (
                  <div key={key} className="rounded-sm border border-hairline bg-panel-raised p-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-[11px] text-paper">{label}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-16 overflow-hidden rounded-full bg-hairline">
                          <div
                            className="h-full rounded-full bg-signal"
                            style={{ width: `${max ? (points / max) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-dim">
                          {points}/{max}
                        </span>
                      </div>
                    </div>
                    {reason && <p className="mt-1 text-[11px] leading-snug text-paper/70">{reason}</p>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-sm border border-signal/25 bg-signal/[0.06] p-3">
              <h4 className="mb-1 font-mono text-[10px] tracking-widest text-signal uppercase">Primary Scenario</h4>
              <p className="text-sm text-paper/90">{data.scenario.primary_scenario}</p>
            </div>
            <div className="rounded-sm border border-amber/25 bg-amber/[0.06] p-3">
              <h4 className="mb-1 font-mono text-[10px] tracking-widest text-amber uppercase">Alternative Scenario</h4>
              <p className="text-sm text-paper/90">{data.scenario.alternative_scenario}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <h4 className="mb-1 font-mono text-[10px] tracking-widest text-dim uppercase">Confirmation Required</h4>
              <p className="text-sm text-paper/80">{data.scenario.confirmation_required}</p>
            </div>
            <div>
              <h4 className="mb-1 font-mono text-[10px] tracking-widest text-danger uppercase">Invalidation</h4>
              <p className="text-sm text-paper/80">{data.scenario.invalidation_condition}</p>
            </div>
          </div>

          {data.entry_zone && (
            <div className="grid grid-cols-2 gap-3 border-t border-hairline pt-4 font-mono text-xs sm:grid-cols-4">
              <div>
                <div className="text-dim">Entry Zone</div>
                <div className="text-paper">
                  {data.entry_zone.min} – {data.entry_zone.max}
                </div>
              </div>
              <div>
                <div className="text-dim">Stop Loss</div>
                <div className="text-danger">{data.stop_loss}</div>
              </div>
              <div>
                <div className="text-dim">Take Profit 1</div>
                <div className="text-signal">{data.take_profit_1}</div>
              </div>
              <div>
                <div className="text-dim">R:R</div>
                <div className="text-paper">{data.risk_reward ? `1:${data.risk_reward}` : "-"}</div>
              </div>
            </div>
          )}

          <p className="font-mono text-[10px] text-dim">
            This is a probabilistic setup, not a guaranteed outcome. You remain the final decision-maker.
          </p>
        </div>
      )}
    </Panel>
  );
}
