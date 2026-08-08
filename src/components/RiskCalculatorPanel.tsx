import { useState } from "react";
import { Panel, ErrorState } from "./Panel";
import { StatusBadge } from "./StatusBadge";
import { toneForDirection } from "../lib/tones";
import { useApiData } from "../hooks/useApiData";
import { api, ApiError } from "../lib/api";
import type { RiskCalculation } from "../types/api";

const INSTRUMENTS = ["EUR/USD", "GBP/USD", "XAU/USD"];

function NumberField({
  label,
  value,
  onChange,
  step = "0.0001",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] tracking-widest text-dim uppercase">{label}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-sm border border-hairline bg-ink px-3 py-2 font-mono text-sm text-paper outline-none focus-visible:border-signal"
      />
    </label>
  );
}

export function RiskCalculatorPanel() {
  const { data: recentSignals } = useApiData(() => api.riskCalculator.signalsForCalculator(), [], 60_000);

  const [instrument, setInstrument] = useState(INSTRUMENTS[0]);
  const [direction, setDirection] = useState<"BUY" | "SELL">("BUY");
  const [entry, setEntry] = useState("1.0820");
  const [stopLoss, setStopLoss] = useState("1.0790");
  const [takeProfit, setTakeProfit] = useState("1.0900");
  const [capital, setCapital] = useState("10000");
  const [riskPct, setRiskPct] = useState("1");

  const [result, setResult] = useState<RiskCalculation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const applySignal = (signalId: string) => {
    const signal = recentSignals?.find((s) => String(s.id) === signalId);
    if (!signal) return;
    // SignalRow doesn't carry entry_zone/stop directly in the type today --
    // this handles the common case where the backend returns those fields
    // even though they're not declared on the narrower SignalRow type.
    const raw = signal as unknown as Record<string, number | string>;
    setInstrument(signal.instrument);
    setDirection(signal.direction === "SELL" ? "SELL" : "BUY");
    if (typeof raw.entry_zone_min === "number") setEntry(String(raw.entry_zone_min));
    if (typeof raw.stop_loss === "number") setStopLoss(String(raw.stop_loss));
    if (typeof raw.take_profit_1 === "number") setTakeProfit(String(raw.take_profit_1));
  };

  const handleCalculate = async () => {
    setBusy(true);
    setError(null);
    try {
      const calc = await api.riskCalculator.calculate({
        instrument,
        direction,
        entry: parseFloat(entry),
        stop_loss: parseFloat(stopLoss),
        take_profit: parseFloat(takeProfit),
        capital: parseFloat(capital),
        risk_pct: parseFloat(riskPct),
      });
      setResult(calc);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Calculation failed.");
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel eyebrow="Capital planning" title="Risk Calculator">
      <p className="mb-4 text-xs text-dim">
        This tells you what a trade <em>costs if it hits stop</em> and <em>pays if it hits target</em>, based on
        your capital and risk tolerance. It does not predict which one will happen — no tool honestly can.
      </p>

      {recentSignals && recentSignals.length > 0 && (
        <div className="mb-4">
          <span className="mb-1 block font-mono text-[10px] tracking-widest text-dim uppercase">
            Load a recent confirmed setup
          </span>
          <select
            onChange={(e) => e.target.value && applySignal(e.target.value)}
            defaultValue=""
            className="w-full rounded-sm border border-hairline bg-ink px-3 py-2 font-mono text-sm text-paper outline-none focus-visible:border-signal"
          >
            <option value="">— select a setup —</option>
            {recentSignals.map((s) => (
              <option key={s.id} value={s.id}>
                {s.instrument} {s.direction} · score {s.confluence_score} · {s.grade}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="mb-1 block font-mono text-[10px] tracking-widest text-dim uppercase">Instrument</span>
          <select
            value={instrument}
            onChange={(e) => setInstrument(e.target.value)}
            className="w-full rounded-sm border border-hairline bg-ink px-3 py-2 font-mono text-sm text-paper outline-none focus-visible:border-signal"
          >
            {INSTRUMENTS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block font-mono text-[10px] tracking-widest text-dim uppercase">Direction</span>
          <div className="flex gap-1.5">
            {(["BUY", "SELL"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDirection(d)}
                className={`flex-1 rounded-sm border px-3 py-2 font-mono text-xs transition-colors ${
                  direction === d ? "border-signal/40 bg-signal/12 text-signal" : "border-hairline text-dim"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </label>

        <NumberField label="Account Capital ($)" value={capital} onChange={setCapital} step="1" />
        <NumberField label="Entry Price" value={entry} onChange={setEntry} />
        <NumberField label="Stop Loss" value={stopLoss} onChange={setStopLoss} />
        <NumberField label="Take Profit" value={takeProfit} onChange={setTakeProfit} />
        <NumberField label="Risk Per Trade (%)" value={riskPct} onChange={setRiskPct} step="0.1" />
      </div>

      <button
        onClick={handleCalculate}
        disabled={busy}
        className="mt-4 rounded-sm bg-signal px-4 py-2 font-mono text-xs font-medium text-ink hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Calculating…" : "Calculate"}
      </button>

      {error && <div className="mt-4">
        <ErrorState message={error} />
      </div>}

      {result && (
        <div className="mt-6 border-t border-hairline pt-5">
          <div className="mb-3 flex items-center gap-2">
            <StatusBadge tone={toneForDirection(result.direction)}>{result.direction}</StatusBadge>
            <span className="font-mono text-sm text-paper">{result.instrument}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-md border border-hairline bg-panel-raised p-3">
              <div className="font-mono text-[10px] tracking-widest text-dim uppercase">Position Size</div>
              <div className="mt-1 font-display text-lg text-paper">{result.position_size_units.toFixed(0)}</div>
              <div className="font-mono text-[10px] text-dim">units</div>
            </div>
            <div className="rounded-md border border-danger/25 bg-danger/[0.06] p-3">
              <div className="font-mono text-[10px] tracking-widest text-danger uppercase">If Stopped Out</div>
              <div className="mt-1 font-display text-lg text-danger">-${result.risk_amount.toFixed(2)}</div>
              <div className="font-mono text-[10px] text-dim">{result.risk_pips} pips</div>
            </div>
            <div className="rounded-md border border-signal/25 bg-signal/[0.06] p-3">
              <div className="font-mono text-[10px] tracking-widest text-signal uppercase">If Target Hit</div>
              <div className="mt-1 font-display text-lg text-signal">+${result.reward_amount.toFixed(2)}</div>
              <div className="font-mono text-[10px] text-dim">{result.reward_pips} pips</div>
            </div>
            <div className="rounded-md border border-hairline bg-panel-raised p-3">
              <div className="font-mono text-[10px] tracking-widest text-dim uppercase">Risk : Reward</div>
              <div className="mt-1 font-display text-lg text-paper">1 : {result.risk_reward_ratio}</div>
            </div>
          </div>

          <p className="mt-4 font-mono text-[10px] text-dim">
            These are the two possible outcomes if price reaches your stop or target — not a prediction of
            which one occurs. Position size assumes no leverage/lot-size constraints from your specific broker;
            confirm against your broker's minimum lot size before placing a real order.
          </p>
        </div>
      )}
    </Panel>
  );
}