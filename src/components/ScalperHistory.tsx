import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Download, RefreshCw } from "lucide-react";
import { Panel, ErrorState } from "./Panel";
import { api, describeApiError, type HistoryQuery } from "../lib/api";
import { useApiData } from "../hooks/useApiData";
import type { HistorySummary, TradeRecord } from "../types/api";

const PERIODS = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "all", label: "All time" },
] as const;
type PeriodId = (typeof PERIODS)[number]["id"];

const tone = (n: number | null | undefined) => (n == null ? "text-paper" : n > 0 ? "text-signal" : n < 0 ? "text-danger" : "text-paper");
const money = (n: number | null | undefined, cur = "") =>
  n == null ? "-" : `${n >= 0 ? "+" : "-"}${Math.abs(n).toFixed(2)}${cur ? " " + cur : ""}`;

function since(period: PeriodId): number | undefined {
  const now = new Date();
  if (period === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
  if (period === "7d") return now.getTime() / 1000 - 7 * 86400;
  if (period === "30d") return now.getTime() / 1000 - 30 * 86400;
  return undefined;
}

export function duration(seconds: number | null | undefined): string {
  if (seconds == null) return "-";
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${String(s % 60).padStart(2, "0")}s`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
}

function Tile({ label, value, sub, cls = "text-paper" }: { label: string; value: string; sub?: string; cls?: string }) {
  return (
    <div className="rounded-sm border border-hairline bg-ink/40 px-3 py-2">
      <div className="font-mono text-[10px] tracking-widest text-dim uppercase">{label}</div>
      <div className={`font-mono text-base ${cls}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[10px] leading-snug text-dim">{sub}</div>}
    </div>
  );
}

/** One plain-English paragraph so the numbers are readable without trading jargon. */
function readout(s: HistorySummary, cur: string): string {
  if (s.closed === 0) return "No finished trades in this view yet.";
  const parts = [`${s.wins} of ${s.closed} finished trades made money (${s.win_rate}%).`];
  if (s.avg_win != null && s.avg_loss != null) {
    parts.push(`A typical win was ${money(s.avg_win)} and a typical loss ${money(s.avg_loss)}.`);
  }
  parts.push(`Overall you are ${s.net >= 0 ? "up" : "down"} ${Math.abs(s.net).toFixed(2)} ${cur}.`.trim());
  if (s.profit_factor != null) {
    parts.push(s.profit_factor < 1
      ? "In total, losses are bigger than wins - to turn this around, either wins must get bigger or happen more often."
      : "In total, wins are bigger than losses so far - but keep watching: a small sample can flatter any setup.");
  }
  if (s.closed < 30) parts.push("This is a small sample, so don't read too much into it yet.");
  return parts.join(" ");
}

function DailyBars({ days, cur }: { days: HistorySummary["by_day"]; cur: string }) {
  if (days.length === 0) return <p className="text-xs text-dim">No finished trades yet.</p>;
  const shown = days.slice(-30);
  const max = Math.max(...shown.map((d) => Math.abs(d.net)), 0.01);
  return (
    <div className="flex h-36 items-stretch gap-1 overflow-x-auto" role="img" aria-label="Profit and loss per day">
      {shown.map((d) => {
        const pct = (Math.abs(d.net) / max) * 50;
        return (
          <div key={d.day} className="flex min-w-[22px] flex-1 flex-col" title={`${d.day}: ${money(d.net, cur)} from ${d.trades} trade(s)`}>
            <div className="flex flex-1 items-end justify-center">
              {d.net > 0 && <div className="w-full rounded-t-sm bg-signal/70" style={{ height: `${pct * 2}%` }} />}
            </div>
            <div className="h-px bg-hairline" />
            <div className="flex flex-1 items-start justify-center">
              {d.net < 0 && <div className="w-full rounded-b-sm bg-danger/70" style={{ height: `${pct * 2}%` }} />}
            </div>
            <div className="mt-1 text-center font-mono text-[9px] text-dim">{d.day.slice(5)}</div>
          </div>
        );
      })}
    </div>
  );
}

function Breakdown({ title, rows, cur }: { title: string; rows: { key: string; label: string; trades: number; net: number; win_rate: number | null }[]; cur: string }) {
  return (
    <div>
      <h4 className="mb-2 font-mono text-[10px] tracking-widest text-dim uppercase">{title}</h4>
      {rows.length === 0 ? <p className="text-xs text-dim">Nothing yet.</p> : (
        <table className="w-full border-collapse font-mono text-xs">
          <thead><tr className="text-left text-[10px] text-dim"><th className="pb-1 font-normal">&nbsp;</th><th className="font-normal">Trades</th><th className="font-normal">Wins</th><th className="text-right font-normal">Net</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-hairline/60">
                <td className="py-1.5 pr-2 text-paper">{r.label}</td>
                <td>{r.trades}</td>
                <td>{r.win_rate == null ? "-" : `${r.win_rate}%`}</td>
                <td className={`text-right ${tone(r.net)}`}>{money(r.net, cur)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function when(ts: number | null): string {
  if (!ts) return "-";
  return new Date(ts * 1000).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function TradeRow({ t }: { t: TradeRecord }) {
  const [open, setOpen] = useState(false);
  const cur = t.currency ?? "";
  const stripe = t.result === "win" ? "bg-signal" : t.result === "loss" ? "bg-danger" : t.status === "open" ? "bg-amber" : "bg-hairline";
  return (
    <li className="overflow-hidden rounded-sm border border-hairline/70 bg-ink/30">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-stretch text-left" aria-expanded={open}>
        <span className={`w-1 shrink-0 ${stripe}`} />
        <span className="flex-1 px-3 py-2">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs">
            {open ? <ChevronDown size={12} className="text-dim" /> : <ChevronRight size={12} className="text-dim" />}
            <span className="text-dim">{when(t.opened_at)}</span>
            <span className="text-paper">{t.instrument}</span>
            <span className={t.side === "BUY" ? "text-signal" : "text-danger"}>{t.side}</span>
            <span className="text-dim">{t.volume} lots</span>
            <span className="ml-auto flex items-center gap-3">
              {t.pips != null && <span className="text-dim">{t.pips >= 0 ? "+" : ""}{t.pips} pips</span>}
              <span className={`${tone(t.pnl)} ${t.status === "open" ? "text-amber" : ""}`}>
                {t.status === "open" ? "open" : t.pnl == null ? "?" : money(t.pnl, cur)}
              </span>
            </span>
          </span>
          <span className="mt-1 block text-[11px] leading-snug text-dim">{t.summary}</span>
        </span>
      </button>
      {open && (
        <div className="grid gap-x-6 gap-y-1 border-t border-hairline/60 px-4 py-3 font-mono text-[11px] sm:grid-cols-2">
          <Detail k="Opened" v={when(t.opened_at)} />
          <Detail k="Closed" v={when(t.closed_at)} />
          <Detail k="Entry price" v={String(t.entry)} />
          <Detail k="Exit price" v={t.exit != null ? String(t.exit) : "-"} />
          <Detail k="Stop-loss" v={t.sl ? String(t.sl) : "-"} />
          <Detail k="Take-profit" v={t.tp ? String(t.tp) : "-"} />
          <Detail k="Planned reward / risk" v={t.planned_tp_pips && t.planned_sl_pips ? `${t.planned_tp_pips} pips / ${t.planned_sl_pips} pips` : "-"} />
          <Detail k="Spread when it opened" v={t.spread_pips != null ? `${t.spread_pips} pips` : "-"} />
          <Detail k="Held for" v={duration(t.duration_seconds)} />
          <Detail k="How it ended" v={t.exit_reason_label ?? (t.status === "open" ? "Still open" : "-")} />
          <Detail k="Signal strength" v={t.score != null ? `${t.score}/100` : "-"} />
          <Detail k="Entry style" v={t.entry_style ?? "-"} />
          <Detail k="Settings used" v={t.preset ?? "Custom"} />
          <Detail k="Session" v={t.plan ?? "Started by hand"} />
          {t.reasons && t.reasons.length > 0 && <div className="sm:col-span-2"><span className="text-dim">Why it entered: </span><span className="text-paper">{t.reasons.join(" · ")}</span></div>}
          {t.pnl_estimated && <div className="text-amber sm:col-span-2">P&amp;L is an estimate: the broker’s final figure wasn’t available when this was recorded.</div>}
          <div className="text-dim sm:col-span-2">Ticket #{t.ticket}</div>
        </div>
      )}
    </li>
  );
}

function Detail({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3 border-b border-hairline/30 py-0.5"><span className="text-dim">{k}</span><span className="text-right text-paper">{v}</span></div>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { id: string; label: string }[] }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] text-dim">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-sm border border-hairline bg-ink px-2 py-1.5 font-mono text-xs text-paper outline-none focus-visible:border-signal">
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function ScalperHistory() {
  const [period, setPeriod] = useState<PeriodId>("7d");
  const [instrument, setInstrument] = useState("");
  const [result, setResult] = useState("");
  const [reason, setReason] = useState("");
  const [preset, setPreset] = useState("");
  const [limit, setLimit] = useState(50);
  const [dlError, setDlError] = useState<string | null>(null);

  const query: HistoryQuery = useMemo(
    () => ({ since: since(period), instrument, result, reason, preset, limit }),
    // `since` depends on the clock, so it is recomputed when the user changes the period (and on each poll via refetch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [period, instrument, result, reason, preset, limit]
  );
  const { data, error, loading, refetch } = useApiData(() => api.scalper.history(query), [query], 5000);

  const cur = data?.trades.find((t) => t.currency)?.currency ?? "";
  const s = data?.summary;

  return (
    <div className="space-y-5">
      <Panel
        title="Trade history"
        eyebrow="Every trade the bot has made"
        action={
          <div className="flex items-center gap-2">
            <button onClick={refetch} className="flex items-center gap-1.5 rounded-sm border border-hairline px-3 py-1 font-mono text-xs text-paper hover:border-signal">
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button
              onClick={() => api.scalper.downloadHistoryCsv(query).then(() => setDlError(null)).catch((e) => setDlError(describeApiError(e)))}
              className="flex items-center gap-1.5 rounded-sm border border-hairline px-3 py-1 font-mono text-xs text-paper hover:border-signal"
            >
              <Download size={12} /> Export CSV
            </button>
          </div>
        }
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button key={p.id} onClick={() => { setPeriod(p.id); setLimit(50); }}
                className={`rounded-sm border px-2.5 py-1.5 font-mono text-xs ${period === p.id ? "border-signal/40 bg-signal/12 text-signal" : "border-hairline text-dim hover:text-paper"}`}>
                {p.label}
              </button>
            ))}
          </div>
          <Select label="Pair" value={instrument} onChange={setInstrument} options={[{ id: "", label: "All pairs" }, ...(data?.filters.instruments ?? []).map((i) => ({ id: i, label: i }))]} />
          <Select label="Result" value={result} onChange={setResult} options={[{ id: "", label: "All" }, { id: "win", label: "Wins" }, { id: "loss", label: "Losses" }, { id: "flat", label: "Break-even" }]} />
          <Select label="How it ended" value={reason} onChange={setReason} options={[{ id: "", label: "Any" }, ...Object.entries(data?.filters.reasons ?? {}).map(([id, label]) => ({ id, label }))]} />
          <Select label="Settings used" value={preset} onChange={setPreset} options={[{ id: "", label: "Any" }, ...(data?.filters.presets ?? []).map((p) => ({ id: p, label: p }))]} />
        </div>
        {dlError && <div className="mt-3"><ErrorState message={dlError} /></div>}
      </Panel>

      {error && !data && <ErrorState message={error} />}

      {s && (
        <>
          <Panel>
            <p className="text-sm leading-relaxed text-paper">{readout(s, cur)}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <Tile label="Finished trades" value={String(s.closed)} sub={s.open ? `${s.open} still open` : undefined} />
              <Tile label="Win rate" value={s.win_rate == null ? "-" : `${s.win_rate}%`} sub={`${s.wins} won · ${s.losses} lost`} />
              <Tile label="Net result" value={money(s.net, cur)} cls={tone(s.net)} />
              <Tile label="Average win" value={money(s.avg_win)} cls="text-signal" />
              <Tile label="Average loss" value={money(s.avg_loss)} cls="text-danger" />
              <Tile label="Win ÷ loss total" value={s.profit_factor == null ? "-" : s.profit_factor.toFixed(2)} sub="Above 1.00 = wins outweigh losses" cls={s.profit_factor != null && s.profit_factor < 1 ? "text-danger" : "text-paper"} />
              <Tile label="Best trade" value={money(s.best)} cls="text-signal" />
              <Tile label="Worst trade" value={money(s.worst)} cls="text-danger" />
              <Tile label="Average hold" value={duration(s.avg_duration_seconds)} />
              <Tile label="Longest losing run" value={`${s.longest_losing_streak} in a row`} cls={s.longest_losing_streak >= 4 ? "text-amber" : "text-paper"} />
            </div>
          </Panel>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Result per day" eyebrow="Green = up day, red = down day">
              <DailyBars days={s.by_day} cur={cur} />
            </Panel>
            <Panel title="How trades ended" eyebrow="Why they closed">
              <Breakdown title="" cur={cur} rows={s.by_reason.map((r) => ({ key: r.reason, label: r.label, trades: r.trades, net: r.net, win_rate: r.win_rate }))} />
            </Panel>
            <Panel title="By pair" eyebrow="Where the results come from">
              <Breakdown title="" cur={cur} rows={s.by_instrument.map((r) => ({ key: r.instrument, label: r.instrument, trades: r.trades, net: r.net, win_rate: r.win_rate }))} />
            </Panel>
            <Panel title="By settings used" eyebrow="Which preset made the trade">
              <Breakdown title="" cur={cur} rows={s.by_preset.map((r) => ({ key: r.preset, label: r.preset, trades: r.trades, net: r.net, win_rate: r.win_rate }))} />
            </Panel>
          </div>
        </>
      )}

      <Panel title={`Trades (${data?.total ?? 0})`} eyebrow="Newest first - click a trade for the details">
        {!data ? (
          <p className="font-mono text-xs text-dim">Loading…</p>
        ) : data.trades.length === 0 ? (
          <p className="text-xs text-dim">No trades match this view. Trades appear here as soon as the bot opens them.</p>
        ) : (
          <>
            <ul className="space-y-2">{data.trades.map((t) => <TradeRow key={`${t.ticket}-${t.opened_at}`} t={t} />)}</ul>
            {data.total > data.trades.length && (
              <button onClick={() => setLimit(limit + 50)} className="mt-3 self-center rounded-sm border border-hairline px-4 py-1.5 font-mono text-xs text-paper hover:border-signal">
                Show 50 more ({data.total - data.trades.length} left)
              </button>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}
