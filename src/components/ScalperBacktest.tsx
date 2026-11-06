import { useCallback, useEffect, useRef, useState } from "react";
import { Play, RefreshCw, Square } from "lucide-react";
import { Panel } from "./Panel";
import { api, describeApiError } from "../lib/api";
import type { BacktestJob, BacktestListItem, BtGroup, BtSummary } from "../types/api";

const VARIANT_LABEL: Record<string, string> = {
  strategy: "Your settings",
  baseline: "Random direction",
  shuffle: "Scrambled prices",
  stress: "Costs doubled",
};
const VARIANT_COLOR: Record<string, string> = {
  strategy: "#33d6a0",
  baseline: "#f2a33d",
  shuffle: "#7c8b99",
  stress: "#ff5c5c",
};

const fmt = (n: number | null | undefined, d = 2) => (n === null || n === undefined ? "—" : n.toFixed(d));
const signed = (n: number | null | undefined, d = 2) => (n === null || n === undefined ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(d)}`);
const tone = (n: number | null | undefined) => (n === null || n === undefined || n === 0 ? "text-paper" : n > 0 ? "text-signal" : "text-danger");

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-paper">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[10px] leading-snug text-dim">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-sm border border-hairline bg-ink px-3 py-2 font-mono text-sm text-paper outline-none focus-visible:border-signal";

// ---------------------------------------------------------------- equity chart (plain SVG, no chart library)
function EquityChart({ summaries }: { summaries: Record<string, BtSummary> }) {
  const series = Object.entries(summaries).filter(([, s]) => s.equity.length > 1);
  if (!series.length) return null;
  const W = 720, H = 220, PAD = 8;
  const all = series.flatMap(([, s]) => s.equity.map((p) => p[1]));
  const lo = Math.min(...all), hi = Math.max(...all);
  const span = hi - lo || 1;
  const base = series[0][1].start_balance;
  const y = (v: number) => H - PAD - ((v - lo) / span) * (H - 2 * PAD);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Equity curves">
        {base >= lo && base <= hi && <line x1="0" x2={W} y1={y(base)} y2={y(base)} stroke="#22303c" strokeDasharray="4 4" />}
        {series.map(([name, s]) => {
          const pts = s.equity.map((p, i) => `${((i / (s.equity.length - 1)) * (W - 2 * PAD) + PAD).toFixed(1)},${y(p[1]).toFixed(1)}`);
          return <polyline key={name} fill="none" stroke={VARIANT_COLOR[name] ?? "#ecf2f7"} strokeWidth={name === "strategy" ? 2.2 : 1.3} points={pts.join(" ")} />;
        })}
      </svg>
      <div className="mt-1 flex flex-wrap gap-4 text-[11px] text-dim">
        {series.map(([name]) => (
          <span key={name} className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4" style={{ background: VARIANT_COLOR[name] }} />
            {VARIANT_LABEL[name] ?? name}
          </span>
        ))}
        <span className="ml-auto font-mono">{fmt(lo, 0)} – {fmt(hi, 0)}</span>
      </div>
    </div>
  );
}

function GroupTable({ title, rows, order }: { title: string; rows: Record<string, BtGroup>; order?: string[] }) {
  const keys = order ? order.filter((k) => k in rows) : Object.keys(rows);
  if (!keys.length) return null;
  return (
    <div>
      <h4 className="mb-1 font-mono text-[10px] tracking-widest text-dim uppercase">{title}</h4>
      <table className="w-full border-collapse font-mono text-xs">
        <thead>
          <tr className="text-left text-[10px] text-dim"><th className="pb-1 font-normal"></th><th className="font-normal">Trades</th><th className="font-normal">Win %</th><th className="font-normal">Avg/trade</th><th className="text-right font-normal">Net</th></tr>
        </thead>
        <tbody>
          {keys.map((k) => (
            <tr key={k} className="border-t border-hairline/60">
              <td className="py-1 text-paper">{k}</td><td>{rows[k].n}</td><td>{fmt(rows[k].win_rate, 1)}</td>
              <td className={tone(rows[k].expectancy)}>{signed(rows[k].expectancy, 3)}</td>
              <td className={`text-right ${tone(rows[k].net)}`}>{signed(rows[k].net)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------- results
function Results({ job }: { job: BacktestJob }) {
  const r = job.result;
  if (!r) return null;
  const st = r.summaries.strategy;
  const v = r.verdict;
  const banner =
    v.overall === "promising" ? "border-signal/40 bg-signal/10 text-signal"
    : v.overall === "not_viable" ? "border-danger/40 bg-danger/10 text-danger"
    : "border-amber/40 bg-amber/10 text-amber";
  const label = v.overall === "promising" ? "PROMISING — worth a demo-account trial" : v.overall === "not_viable" ? "NOT VIABLE with these settings" : "INCONCLUSIVE";
  const mark = { good: "text-signal", warn: "text-amber", bad: "text-danger", info: "text-dim" } as const;
  const sym = { good: "✓", warn: "!", bad: "✕", info: "i" } as const;
  const order = Object.keys(r.summaries);

  return (
    <div className="space-y-5">
      <div className={`rounded-md border p-4 ${banner}`}>
        <div className="font-mono text-sm font-medium">{label}</div>
        <ul className="mt-3 space-y-1.5">
          {v.points.map((p, i) => (
            <li key={i} className="flex gap-2 text-xs text-paper">
              <span className={`mt-px w-3 shrink-0 text-center font-mono ${mark[p.level]}`}>{sym[p.level]}</span>
              <span className={p.level === "info" ? "text-dim" : ""}>{p.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <Panel title="Results vs the controls" eyebrow="Same data, same costs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse font-mono text-xs">
            <thead>
              <tr className="text-left text-[10px] tracking-widest text-dim uppercase">
                <th className="pb-2 font-normal">Run</th><th className="font-normal">Trades</th><th className="font-normal">Net</th><th className="font-normal">Win %</th>
                <th className="font-normal">Profit factor</th><th className="font-normal">Avg/trade</th><th className="font-normal">Before costs</th><th className="font-normal">Costs</th><th className="text-right font-normal">Max DD</th>
              </tr>
            </thead>
            <tbody>
              {order.map((k) => {
                const s = r.summaries[k];
                return (
                  <tr key={k} className="border-t border-hairline/60">
                    <td className="py-2"><span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: VARIANT_COLOR[k] }} />{VARIANT_LABEL[k] ?? k}</td>
                    <td>{s.n}</td><td className={tone(s.net)}>{signed(s.net)}</td><td>{fmt(s.win_rate, 1)}</td><td>{fmt(s.profit_factor)}</td>
                    <td className={tone(s.expectancy)}>{signed(s.expectancy, 3)}</td><td className={tone(s.gross_before_costs)}>{signed(s.gross_before_costs, 1)}</td>
                    <td>{fmt(s.costs, 1)}</td><td className="text-right">{fmt(s.max_drawdown_pct, 1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] leading-snug text-dim">
          <b className="text-paper">Random direction</b> keeps your entry times but flips a coin for buy/sell. <b className="text-paper">Scrambled prices</b> runs
          your settings on the same candles in shuffled order, which destroys any real market pattern. If your settings can't clearly beat both, there's no
          evidence they find anything real. <b className="text-paper">Costs doubled</b> checks the profit survives wider spreads.
        </p>
      </Panel>

      <Panel title="Equity over the test" eyebrow="Account balance + open P&L">
        <EquityChart summaries={r.summaries} />
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Does a higher signal score mean better trades?" eyebrow="Your settings">
          {Object.keys(st.by_score_band).length ? <GroupTable title="By score at entry" rows={st.by_score_band} /> : <p className="text-xs text-dim">No trades.</p>}
          <p className="mt-2 text-[11px] leading-snug text-dim">If average profit doesn't rise with the score, the score isn't measuring anything useful, so raising or lowering the threshold won't help.</p>
        </Panel>
        <Panel title="Where the money came from" eyebrow="Your settings">
          <div className="space-y-4">
            <GroupTable title="By pair" rows={st.by_instrument} />
            <GroupTable title="By how the trade ended" rows={st.by_exit_reason} />
          </div>
        </Panel>
      </div>

      <Panel title="Stability and extremes" eyebrow="Your settings">
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          {[
            ["First 60% of trades", `${signed(st.in_sample.net)} (${st.in_sample.n})`],
            ["Last 40% of trades", `${signed(st.out_of_sample.net)} (${st.out_of_sample.n})`],
            ["Profitable days", st.profitable_days_pct === null ? "—" : `${fmt(st.profitable_days_pct, 0)}%`],
            ["Longest losing streak", String(st.longest_losing_streak)],
            ["Average trade length", st.avg_hold_seconds === null ? "—" : `${st.avg_hold_seconds}s`],
            ["Trades per day", fmt(st.trades_per_day, 1)],
            ["Best / worst trade", `${signed(st.best_trade)} / ${signed(st.worst_trade)}`],
            ["Days a rule stopped the bot", String(st.days_halted)],
          ].map(([k, val]) => (
            <div key={k} className="rounded-sm border border-hairline bg-ink/40 px-3 py-2">
              <div className="text-[10px] text-dim">{k}</div>
              <div className="font-mono text-paper">{val}</div>
            </div>
          ))}
        </div>
      </Panel>

      <ul className="space-y-1 text-[11px] leading-snug text-dim">
        {r.notes.map((n, i) => <li key={i}>• {n}</li>)}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- main
export function ScalperBacktest() {
  const [source, setSource] = useState<"mt5" | "csv" | "synthetic">("mt5");
  const [days, setDays] = useState("10");
  const [csvDir, setCsvDir] = useState("");
  const [utcOffset, setUtcOffset] = useState("0");
  const [spread, setSpread] = useState("");
  const [slippage, setSlippage] = useState("0.2");
  const [commission, setCommission] = useState("0");
  const [balance, setBalance] = useState("");
  const [controls, setControls] = useState(true);
  const [job, setJob] = useState<BacktestJob | null>(null);
  const [history, setHistory] = useState<BacktestListItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<number | null>(null);

  const loadHistory = useCallback(() => api.scalper.backtest.list().then(setHistory).catch(() => undefined), []);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  const stopPolling = () => { if (timer.current) window.clearInterval(timer.current); timer.current = null; };
  const poll = useCallback((id: string) => {
    stopPolling();
    const tick = async () => {
      try {
        const j = await api.scalper.backtest.status(id);
        setJob(j);
        if (j.state !== "running") { stopPolling(); loadHistory(); }
      } catch (e) { setErr(describeApiError(e)); stopPolling(); }
    };
    tick();
    timer.current = window.setInterval(tick, 1500);
  }, [loadHistory]);
  useEffect(() => stopPolling, []);

  const run = async () => {
    setErr(null); setBusy(true); setJob(null);
    try {
      const body: Record<string, unknown> = {
        source, days: Number(days), slippage_pips: Number(slippage), commission_per_lot: Number(commission),
        variants: controls ? ["strategy", "baseline", "shuffle", "stress"] : ["strategy"],
      };
      if (source === "csv") { body.csv_dir = csvDir; body.csv_utc_offset_hours = Number(utcOffset); }
      if (spread.trim() !== "") body.spread_pips = Number(spread);
      if (balance.trim() !== "") body.start_balance = Number(balance);
      const { job_id } = await api.scalper.backtest.start(body);
      poll(job_id);
    } catch (e) { setErr(describeApiError(e)); } finally { setBusy(false); }
  };

  const running = job?.state === "running";

  return (
    <div className="space-y-5">
      <Panel title="Backtest your scalper settings" eyebrow="Before risking anything">
        <p className="mb-4 text-xs leading-relaxed text-dim">
          Replays your <b className="text-paper">saved scalper settings</b> (the Live tab) through the real engine over historical 1-minute candles, charging spread, slippage and commission.
          It also runs three controls on the same data so you can tell skill from luck. It runs in separate processes and can't slow a live bot.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Data source" hint={source === "mt5" ? "Last N days from your open MT5 terminal, with the real spreads. Needs the backend on that Windows machine." : source === "csv" ? "M1 CSV files, one per pair (EURUSD.csv…). MT5: History Center → Export." : "Random prices. Tests the machinery only; results mean nothing."}>
            <select className={inputCls} value={source} onChange={(e) => setSource(e.target.value as typeof source)}>
              <option value="mt5">MT5 terminal history</option>
              <option value="csv">CSV files</option>
              <option value="synthetic">Synthetic (demo)</option>
            </select>
          </Field>
          <Field label="Trading days" hint="More = more trustworthy. Aim for 200+ trades.">
            <input className={inputCls} type="number" min={1} max={250} value={days} onChange={(e) => setDays(e.target.value)} />
          </Field>
          <Field label="Slippage (pips)" hint="Fill worse than the quote, each way it applies.">
            <input className={inputCls} type="number" step="0.1" min={0} value={slippage} onChange={(e) => setSlippage(e.target.value)} />
          </Field>
          <Field label="Commission per lot (round trip)" hint="Raw-spread accounts: about 6–7. Standard: 0.">
            <input className={inputCls} type="number" step="0.5" min={0} value={commission} onChange={(e) => setCommission(e.target.value)} />
          </Field>
          {source === "csv" && (
            <>
              <div className="sm:col-span-2">
                <Field label="Folder with the CSV files (on the backend's machine)">
                  <input className={inputCls} value={csvDir} onChange={(e) => setCsvDir(e.target.value)} placeholder="C:\data\m1" />
                </Field>
              </div>
              <Field label="CSV clock is ahead of UTC by (hours)" hint="MT5 exports use broker time, often 2 or 3.">
                <input className={inputCls} type="number" step="0.5" value={utcOffset} onChange={(e) => setUtcOffset(e.target.value)} />
              </Field>
            </>
          )}
          <Field label="Fixed spread (pips), optional" hint="Blank = the data's real spread, else typical defaults.">
            <input className={inputCls} type="number" step="0.1" min={0} value={spread} onChange={(e) => setSpread(e.target.value)} placeholder="auto" />
          </Field>
          <Field label="Starting balance" hint="Blank = your MT5 account's balance, in the account's own units (cent accounts: cents).">
            <input className={inputCls} type="number" min={1} value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="auto" />
          </Field>
          <label className="flex items-end gap-2 pb-2 text-xs text-paper">
            <input type="checkbox" checked={controls} onChange={(e) => setControls(e.target.checked)} />
            Run the 3 controls (recommended)
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {!running ? (
            <button onClick={run} disabled={busy} className="flex items-center gap-1.5 rounded-sm bg-signal px-4 py-2 font-mono text-xs font-medium text-ink hover:opacity-90 disabled:opacity-40">
              <Play size={14} /> Run backtest
            </button>
          ) : (
            <button onClick={() => job && api.scalper.backtest.cancel(job.job_id).then(setJob)} className="flex items-center gap-1.5 rounded-sm border border-danger/50 bg-danger/10 px-4 py-2 font-mono text-xs text-danger">
              <Square size={14} /> Cancel
            </button>
          )}
          {source === "synthetic" && <span className="text-xs text-amber">Synthetic data — machinery test only.</span>}
        </div>
        {err && <p className="mt-3 rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{err}</p>}
      </Panel>

      {job && job.state !== "done" && (
        <Panel title={job.state === "running" ? "Running…" : `Backtest ${job.state}`} eyebrow="Progress">
          <div className="h-2 overflow-hidden rounded-full bg-hairline">
            <div className="h-full bg-signal transition-all" style={{ width: `${Math.round(job.progress * 100)}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px] text-dim">
            {Object.entries(job.variants).map(([k, s]) => (
              <span key={k}>{VARIANT_LABEL[k] ?? k}: {s.state === "running" ? `${Math.round(s.progress * 100)}%` : s.state}</span>
            ))}
          </div>
          {job.error && <p className="mt-3 text-xs text-danger">{job.error}</p>}
        </Panel>
      )}

      {job?.state === "done" && <Results job={job} />}

      <Panel
        title="Previous backtests"
        eyebrow="History"
        action={<button onClick={loadHistory} className="flex items-center gap-1.5 rounded-sm border border-hairline px-3 py-1 font-mono text-xs text-paper hover:border-signal"><RefreshCw size={12} /> Refresh</button>}
      >
        {!history.length ? (
          <p className="text-xs text-dim">None yet.</p>
        ) : (
          <ul className="space-y-1 font-mono text-xs">
            {history.map((h) => (
              <li key={h.job_id}>
                <button onClick={() => { setErr(null); poll(h.job_id); }} className="flex w-full flex-wrap items-center gap-x-4 rounded-sm px-2 py-1.5 text-left hover:bg-ink/60">
                  <span className="text-paper">{h.created ? new Date(h.created * 1000).toLocaleString() : h.job_id}</span>
                  <span className="text-dim">{h.source} · {h.days}d</span>
                  <span className={h.overall === "promising" ? "text-signal" : h.overall === "not_viable" ? "text-danger" : "text-amber"}>{h.overall ? h.overall.replace("_", " ") : h.state}</span>
                  {h.net !== null && h.net !== undefined && <span className={tone(h.net)}>{signed(h.net)} · {h.trades} trades</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
