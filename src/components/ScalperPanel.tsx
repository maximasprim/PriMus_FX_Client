import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Play, RefreshCw, ShieldAlert, Square } from "lucide-react";
import { Panel, ErrorState } from "./Panel";
import { ScalperBacktest } from "./ScalperBacktest";
import { api, describeApiError } from "../lib/api";
import { useApiData } from "../hooks/useApiData";
import type { ScalperConfig, ScalperDiagnostics, ScalperStatus } from "../types/api";

type Draft = ScalperConfig;

const money = (n: number, cur = "") => `${n >= 0 ? "+" : "-"}${Math.abs(n).toFixed(2)}${cur ? " " + cur : ""}`;
const tone = (n: number) => (n > 0 ? "text-signal" : n < 0 ? "text-danger" : "text-paper");

// ------------------------------------------------------------------ small inputs
function NumberField({
  label, hint, value, onChange, step = 1, min, max, disabled,
}: {
  label: string; hint?: string; value: number; onChange: (n: number) => void;
  step?: number; min?: number; max?: number; disabled?: boolean;
}) {
  // Keep what the user is typing as text so "0." and "" don't fight the number state.
  const [text, setText] = useState(String(value));
  useEffect(() => {
    if (Number(text) !== value) setText(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <label className={`block ${disabled ? "opacity-40" : ""}`}>
      <span className="mb-1 block text-xs text-paper">{label}</span>
      <input
        type="number" inputMode="decimal" step={step} min={min} max={max} value={text} disabled={disabled}
        onChange={(e) => {
          setText(e.target.value);
          const n = Number(e.target.value);
          if (e.target.value !== "" && !Number.isNaN(n)) onChange(n);
        }}
        className="w-full rounded-sm border border-hairline bg-ink px-3 py-2 font-mono text-sm text-paper outline-none focus-visible:border-signal"
      />
      {hint && <span className="mt-1 block text-[10px] leading-snug text-dim">{hint}</span>}
    </label>
  );
}

function SelectField<T extends string>({
  label, value, options, onChange, hint,
}: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-paper">{label}</span>
      <select
        value={value} onChange={(e) => onChange(e.target.value as T)}
        className="w-full rounded-sm border border-hairline bg-ink px-3 py-2 font-mono text-sm text-paper outline-none focus-visible:border-signal"
      >
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      {hint && <span className="mt-1 block text-[10px] leading-snug text-dim">{hint}</span>}
    </label>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start justify-between gap-3">
      <span className="text-xs text-paper">
        {label}
        {hint && <span className="block text-[10px] leading-snug text-dim">{hint}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 shrink-0" />
    </label>
  );
}

function Group({ title, note, children, accent }: { title: string; note?: string; children: ReactNode; accent?: boolean }) {
  return (
    <section className={`rounded-md border p-4 ${accent ? "border-amber/40 bg-amber/5" : "border-hairline bg-panel"}`}>
      <h3 className="font-mono text-[10px] tracking-widest text-dim uppercase">{title}</h3>
      {note && <p className="mt-1 text-[11px] leading-snug text-dim">{note}</p>}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Stat({ label, value, cls = "text-paper" }: { label: string; value: string; cls?: string }) {
  return (
    <div className="rounded-sm border border-hairline bg-ink/40 px-3 py-2">
      <div className="font-mono text-[10px] tracking-widest text-dim uppercase">{label}</div>
      <div className={`font-mono text-base ${cls}`}>{value}</div>
    </div>
  );
}

// ------------------------------------------------------------------ live view
function ScalperLive() {
  const { data: status, error: statusError, refetch: refetchStatus } = useApiData<ScalperStatus>(() => api.scalper.status(), [], 2000);
  const { data: cfgResp, error: cfgError, refetch: refetchCfg } = useApiData(() => api.scalper.config(), []);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [saved, setSaved] = useState<Draft | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [diag, setDiag] = useState<ScalperDiagnostics | null>(null);

  useEffect(() => {
    if (cfgResp && !draft) {
      setDraft(cfgResp.config);
      setSaved(cfgResp.config);
    }
  }, [cfgResp, draft]);

  const dirtyKeys = useMemo(() => {
    if (!draft || !saved) return [];
    return (Object.keys(draft) as (keyof ScalperConfig)[]).filter((k) => JSON.stringify(draft[k]) !== JSON.stringify(saved[k]));
  }, [draft, saved]);

  const set = <K extends keyof ScalperConfig>(key: K, value: ScalperConfig[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d));

  const act = async (name: string, fn: () => Promise<unknown>, okText?: string) => {
    setBusy(name);
    setMessage(null);
    try {
      await fn();
      if (okText) setMessage({ kind: "ok", text: okText });
    } catch (err) {
      setMessage({ kind: "error", text: describeApiError(err) });
    } finally {
      setBusy(null);
      refetchStatus();
    }
  };

  const save = () =>
    act("save", async () => {
      if (!draft) return;
      const changes: Record<string, unknown> = {};
      dirtyKeys.forEach((k) => (changes[k] = draft[k]));
      let ack = false;
      if (changes.allow_live_account === true) {
        const typed = window.prompt(
          "You are allowing the scalper to trade REAL money. It opens and closes trades automatically and can lose your whole balance.\n\nType LIVE to confirm."
        );
        if (typed?.trim() !== "LIVE") throw new Error(JSON.stringify({ detail: "Live trading was not enabled." }));
        ack = true;
      }
      const res = await api.scalper.updateConfig(changes, ack);
      setDraft(res.config);
      setSaved(res.config);
      refetchCfg();
    }, "Settings saved." + (status?.state === "RUNNING" ? " Applied to the running bot." : ""));

  if (cfgError && !draft) return <ErrorState message={cfgError} />;
  if (!draft || !cfgResp) return <p className="font-mono text-xs text-dim">Loading scalper…</p>;

  const running = status?.state === "RUNNING";
  const acct = status?.account;
  const s = status?.session;
  const cur = acct?.currency ?? "";

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------ control bar */}
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-sm border px-2.5 py-1 font-mono text-xs ${
                running ? "border-signal/40 bg-signal/12 text-signal"
                : status?.state === "HALTED" ? "border-amber/40 bg-amber/10 text-amber"
                : "border-hairline text-dim"
              }`}
            >
              {status?.state ?? "…"}
            </span>
            <span className="font-mono text-xs text-dim">
              {draft.backend === "simulation" ? "SIMULATION (no real orders)" : "MT5 desktop terminal"}
            </span>
            {acct && (
              <span className={`rounded-sm px-2 py-0.5 font-mono text-[10px] ${acct.is_demo ? "bg-signal/12 text-signal" : "bg-danger/15 text-danger"}`}>
                {acct.is_demo ? "DEMO" : "LIVE MONEY"}
              </span>
            )}
            {acct && <span className="font-mono text-xs text-dim">equity {acct.equity.toFixed(2)} {cur}</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            {!running ? (
              <button
                disabled={!!busy || dirtyKeys.length > 0}
                title={dirtyKeys.length ? "Apply or discard your changes first" : ""}
                onClick={() => act("start", () => api.scalper.start(), "Scalper started.")}
                className="flex items-center gap-1.5 rounded-sm bg-signal px-4 py-2 font-mono text-xs font-medium text-ink hover:opacity-90 disabled:opacity-40"
              >
                <Play size={14} /> Start
              </button>
            ) : (
              <button
                disabled={!!busy}
                onClick={() => act("stop", () => api.scalper.stop(false), "Stopped. Open trades keep their stop-loss/take-profit.")}
                className="flex items-center gap-1.5 rounded-sm border border-hairline px-4 py-2 font-mono text-xs text-paper hover:border-signal disabled:opacity-40"
              >
                <Square size={14} /> Stop (keep trades)
              </button>
            )}
            <button
              disabled={!!busy}
              onClick={() => {
                if (window.confirm("Stop the scalper and close ALL of its open trades now?"))
                  act("kill", () => api.scalper.stop(true), "Stopped and closed all scalper trades.");
              }}
              className="flex items-center gap-1.5 rounded-sm border border-danger/50 bg-danger/10 px-4 py-2 font-mono text-xs text-danger hover:bg-danger/20 disabled:opacity-40"
            >
              <ShieldAlert size={14} /> Stop &amp; close all
            </button>
          </div>
        </div>
        {status?.halt_reason && !running && (
          <p className="mt-3 rounded-sm border border-amber/40 bg-amber/10 px-3 py-2 text-xs text-amber">Stopped by a rule: {status.halt_reason}</p>
        )}
        {status?.last_error && running && <p className="mt-3 text-xs text-danger">Last error: {status.last_error}</p>}
        {message && (
          <p className={`mt-3 rounded-sm border px-3 py-2 text-xs ${message.kind === "ok" ? "border-signal/30 bg-signal/10 text-signal" : "border-danger/30 bg-danger/10 text-danger"}`}>
            {message.text}
          </p>
        )}
        {statusError && <div className="mt-3"><ErrorState message={statusError} /></div>}
      </Panel>

      {/* ------------------------------------------------ session numbers */}
      {s && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          <Stat label="Session P&L" value={money(s.net, cur)} cls={tone(s.net)} />
          <Stat label="Realised" value={money(s.realized)} cls={tone(s.realized)} />
          <Stat label="Open (floating)" value={money(s.floating)} cls={tone(s.floating)} />
          <Stat label="Trades opened" value={String(s.trades_opened)} />
          <Stat label="Wins / losses" value={`${s.wins} / ${s.losses}`} />
          <Stat label="Loss streak" value={String(s.consecutive_losses)} cls={s.consecutive_losses >= 3 ? "text-amber" : "text-paper"} />
        </div>
      )}

      {/* ------------------------------------------------ pre-flight */}
      <Panel
        title="Pre-flight checks"
        eyebrow="Connection"
        action={
          <button
            disabled={busy === "diag"}
            onClick={() => act("diag", async () => setDiag(await api.scalper.diagnostics()))}
            className="flex items-center gap-1.5 rounded-sm border border-hairline px-3 py-1 font-mono text-xs text-paper hover:border-signal disabled:opacity-40"
          >
            <RefreshCw size={12} className={busy === "diag" ? "animate-spin" : ""} /> Run checks
          </button>
        }
      >
        {!diag ? (
          <p className="text-xs text-dim">
            Press “Run checks” before the first start. It tells you if MT5 is connected, if the Algo Trading button is on, whether the
            account is demo or live, and whether each pair has a live price.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {diag.checks.map((c) => (
              <li key={c.name} className="flex gap-2 text-xs">
                <span className={c.severity === "ok" ? "text-signal" : c.severity === "warning" ? "text-amber" : "text-danger"}>
                  {c.severity === "ok" ? "✓" : c.severity === "warning" ? "!" : "✕"}
                </span>
                <span><span className="text-paper">{c.name}</span> <span className="text-dim">— {c.detail}</span></span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 border-t border-hairline pt-3 text-[11px] leading-snug text-dim">
          <b className="text-paper">Desktop vs mobile MT5:</b> the bot runs against the MT5 <b>desktop</b> terminal (Windows) on the machine
          where this backend runs — mobile MT5 has no automation interface. Trades the bot opens on your account still show up in the MT5 mobile
          app, and you can close them there by hand. You can also watch and control the bot from this dashboard on your phone.
        </p>
      </Panel>

      {/* ------------------------------------------------ settings */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-sm font-semibold text-paper">Settings</h2>
        <div className="flex items-center gap-2">
          {dirtyKeys.length > 0 && <span className="font-mono text-xs text-amber">{dirtyKeys.length} unsaved change(s)</span>}
          <button
            disabled={dirtyKeys.length === 0 || !!busy}
            onClick={() => saved && setDraft(saved)}
            className="rounded-sm px-3 py-1.5 font-mono text-xs text-dim hover:text-paper disabled:opacity-30"
          >
            Discard
          </button>
          <button
            disabled={dirtyKeys.length === 0 || !!busy}
            onClick={save}
            className="rounded-sm bg-signal px-4 py-1.5 font-mono text-xs font-medium text-ink hover:opacity-90 disabled:opacity-40"
          >
            Apply
          </button>
        </div>
      </div>

      <Group
        accent
        title="Stop the bot when…"
        note="These switch the whole bot off (and by default close everything). A loss limit is required — the bot won't run without one."
      >
        <NumberField label={`Max session loss (${cur || "money"})`} value={draft.session_max_loss_money} min={0} step={1} onChange={(v) => set("session_max_loss_money", v)} hint="Stop when realised + open P&L falls to minus this. 0 = use % only." />
        <NumberField label="Max session loss (% of starting equity)" value={draft.session_max_loss_pct} min={0} max={50} step={0.1} onChange={(v) => set("session_max_loss_pct", v)} hint="Whichever of the two loss limits is hit first stops the bot." />
        <NumberField label={`Total profit target (${cur || "money"})`} value={draft.session_profit_target_money} min={0} step={1} onChange={(v) => set("session_profit_target_money", v)} hint="Stop the bot once the session is up this much. 0 = off." />
        <NumberField label={`Basket take-profit (${cur || "money"})`} value={draft.basket_take_profit_money} min={0} step={1} onChange={(v) => set("basket_take_profit_money", v)} hint="Close ALL open trades when their combined profit reaches this — the bot keeps running. 0 = off." />
        <NumberField label="Stop after N losses in a row" value={draft.max_consecutive_losses} min={0} max={50} onChange={(v) => set("max_consecutive_losses", v)} hint="0 = off." />
        <Toggle label="Close all trades when a rule stops the bot" checked={draft.flatten_on_halt} onChange={(v) => set("flatten_on_halt", v)} hint="Off = trades stay open with their own stop-loss / take-profit." />
      </Group>

      <Group title="How many trades" note="The bot never goes above these, however strong the signal.">
        <NumberField label="Max open trades at once" value={draft.max_concurrent_positions} min={1} max={20} onChange={(v) => set("max_concurrent_positions", v)} hint="Across all pairs." />
        <NumberField label="Max open trades per pair" value={draft.max_positions_per_instrument} min={1} max={10} onChange={(v) => set("max_positions_per_instrument", v)} hint="Needs an MT5 hedging account; netting accounts are limited to 1." />
        <NumberField label="Trades opened per signal" value={draft.entries_per_signal} min={1} max={5} onChange={(v) => set("entries_per_signal", v)} hint="3 = three trades at once on a strong signal (later ones aim for bigger targets if staggering is on)." />
        <NumberField label="Cooldown per pair (seconds)" value={draft.cooldown_seconds} min={0} max={600} onChange={(v) => set("cooldown_seconds", v)} />
        <NumberField label="Max new trades per hour" value={draft.max_trades_per_hour} min={1} max={600} onChange={(v) => set("max_trades_per_hour", v)} />
      </Group>

      <Group title="How picky" note="Looser = more trades, but more of them are noise. Lowering the score without testing is the fastest way to lose money.">
        <div className="sm:col-span-2">
          <SelectField
            label="Entry style"
            value={draft.entry_style}
            onChange={(v) => set("entry_style", v)}
            options={Object.entries(cfgResp.entry_styles).map(([id, info]) => ({ id: id as ScalperConfig["entry_style"], label: info.label }))}
            hint={cfgResp.entry_styles[draft.entry_style]?.hint}
          />
          {cfgResp.entry_styles[draft.entry_style] && draft.min_signal_score !== cfgResp.entry_styles[draft.entry_style].suggested_min_score && (
            <button
              type="button"
              onClick={() => set("min_signal_score", cfgResp.entry_styles[draft.entry_style].suggested_min_score)}
              className="mt-1.5 font-mono text-[10px] text-signal underline underline-offset-2"
            >
              Use this style's suggested minimum score ({cfgResp.entry_styles[draft.entry_style].suggested_min_score})
            </button>
          )}
          <p className="mt-1 text-[10px] leading-snug text-dim">
            Scores can't be compared between styles. Test each style in the <b className="text-paper">Backtest</b> tab (the backtest uses these saved settings) before trusting it.
          </p>
        </div>
        <NumberField label="Minimum signal score (0–100)" value={draft.min_signal_score} min={20} max={95} onChange={(v) => set("min_signal_score", v)} hint="Lower = looser. The built-in signal is a simple heuristic, not a proven edge." />
        <NumberField label="Max spread (pips)" value={draft.max_spread_pips} min={0.1} max={50} step={0.1} onChange={(v) => set("max_spread_pips", v)} hint="Skip when the broker spread is wider (e.g. during news). Gold: 1 pip = 0.10." />
        <NumberField label="Target must be ≥ N × spread" value={draft.min_tp_to_spread_ratio} min={1} max={10} step={0.5} onChange={(v) => set("min_tp_to_spread_ratio", v)} hint="Skips trades where the spread would eat the profit." />
      </Group>

      <Group title="Position size">
        <SelectField label="Sizing mode" value={draft.lot_mode} onChange={(v) => set("lot_mode", v)} options={[{ id: "fixed", label: "Fixed lot" }, { id: "risk_pct", label: "% of equity at risk" }]} />
        {draft.lot_mode === "fixed"
          ? <NumberField label="Lot size" value={draft.fixed_lot} min={0.01} max={5} step={0.01} onChange={(v) => set("fixed_lot", v)} />
          : <NumberField label="Risk per trade (% of equity)" value={draft.risk_per_trade_pct} min={0.05} max={2} step={0.05} onChange={(v) => set("risk_per_trade_pct", v)} hint="If this works out below the broker's minimum lot, the trade is skipped — never rounded up." />}
        <NumberField label="Max lot per trade" value={draft.max_lot_per_trade} min={0.01} max={10} step={0.01} onChange={(v) => set("max_lot_per_trade", v)} />
        <NumberField label="Max total open risk (% of equity)" value={draft.max_total_risk_pct} min={0.1} max={10} step={0.1} onChange={(v) => set("max_total_risk_pct", v)} hint="Sum of every open trade's stop-loss risk. New trades are blocked above this." />
      </Group>

      <Group title="Exits">
        <SelectField label="Stop-loss / take-profit based on" value={draft.exit_mode} onChange={(v) => set("exit_mode", v)} options={[{ id: "atr", label: "Market volatility (ATR) — adapts to each pair" }, { id: "fixed", label: "Fixed pips" }]} />
        {draft.exit_mode === "atr" ? (
          <>
            <NumberField label="Take-profit (× ATR)" value={draft.tp_atr_mult} min={0.2} max={5} step={0.1} onChange={(v) => set("tp_atr_mult", v)} />
            <NumberField label="Stop-loss (× ATR)" value={draft.sl_atr_mult} min={0.2} max={5} step={0.1} onChange={(v) => set("sl_atr_mult", v)} />
          </>
        ) : (
          <>
            <NumberField label="Take-profit (pips)" value={draft.take_profit_pips} min={0.5} max={500} step={0.5} onChange={(v) => set("take_profit_pips", v)} hint="Same for every pair. Gold: 1 pip = 0.10." />
            <NumberField label="Stop-loss (pips)" value={draft.stop_loss_pips} min={0.5} max={500} step={0.5} onChange={(v) => set("stop_loss_pips", v)} />
          </>
        )}
        <NumberField label={`Close a trade once it's up (${cur || "money"})`} value={draft.trade_profit_target_money} min={0} step={0.5} onChange={(v) => set("trade_profit_target_money", v)} hint="Per-trade quick profit. 0 = off (only the take-profit applies)." />
        <NumberField label="Close a trade after (seconds)" value={draft.max_hold_seconds} min={0} max={86400} step={10} onChange={(v) => set("max_hold_seconds", v)} hint="Time stop for scalps that go nowhere. 0 = off." />
        <NumberField label="Move stop to break-even after (pips)" value={draft.breakeven_after_pips} min={0} max={500} step={0.5} onChange={(v) => set("breakeven_after_pips", v)} hint="0 = off." />
        <Toggle label="Stagger targets" checked={draft.stagger_targets} onChange={(v) => set("stagger_targets", v)} hint="When opening several trades at once, each aims further than the last." />
        <Toggle label="Trailing stop" checked={draft.trailing_enabled} onChange={(v) => set("trailing_enabled", v)} />
        {draft.trailing_enabled && (
          <>
            <NumberField label="Start trailing at (pips)" value={draft.trailing_start_pips} min={0.5} max={500} step={0.5} onChange={(v) => set("trailing_start_pips", v)} />
            <NumberField label="Trail distance (pips)" value={draft.trailing_distance_pips} min={0.5} max={500} step={0.5} onChange={(v) => set("trailing_distance_pips", v)} />
            <NumberField label="Move in steps of (pips)" value={draft.trailing_step_pips} min={0.1} max={100} step={0.1} onChange={(v) => set("trailing_step_pips", v)} />
          </>
        )}
      </Group>

      <Group title="Where it trades">
        <SelectField
          label="Backend" value={draft.backend} onChange={(v) => set("backend", v)}
          options={[{ id: "simulation", label: "Simulation (safe, no real orders)" }, { id: "mt5", label: "MetaTrader 5 desktop" }]}
          hint={running ? "Stop the bot before changing this." : "Try everything in simulation first, then a demo account."}
        />
        <NumberField label="Check the market every (ms)" value={draft.loop_interval_ms} min={200} max={5000} step={100} onChange={(v) => set("loop_interval_ms", v)} />
        <div className="sm:col-span-2">
          <span className="mb-1 block text-xs text-paper">Pairs to trade</span>
          <div className="flex flex-wrap gap-2">
            {cfgResp.allowed_instruments.map((i) => {
              const on = draft.instruments.includes(i);
              return (
                <button key={i} type="button"
                  onClick={() => set("instruments", on ? draft.instruments.filter((x) => x !== i) : [...draft.instruments, i])}
                  className={`rounded-sm border px-2.5 py-1 font-mono text-xs ${on ? "border-signal/40 bg-signal/12 text-signal" : "border-hairline text-dim hover:text-paper"}`}>
                  {i}
                </button>
              );
            })}
          </div>
        </div>
        <div className="sm:col-span-2">
          <Toggle
            label="Allow REAL-money accounts"
            hint="Off by default: the bot refuses to start on a live account. Only turn this on after weeks of good demo results."
            checked={draft.allow_live_account} onChange={(v) => set("allow_live_account", v)}
          />
        </div>
      </Group>

      {/* ------------------------------------------------ live view */}
      <Panel title={`Open trades (${status?.positions.length ?? 0})`} eyebrow="Live">
        {!status?.positions.length ? (
          <p className="text-xs text-dim">No open scalper trades.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse font-mono text-xs">
              <thead>
                <tr className="text-left text-[10px] tracking-widest text-dim uppercase">
                  <th className="pb-2">Pair</th><th>Side</th><th>Lots</th><th>Entry</th><th>SL</th><th>TP</th><th>Age</th><th className="text-right">P&amp;L</th>
                </tr>
              </thead>
              <tbody>
                {status.positions.map((p) => (
                  <tr key={p.ticket} className="border-t border-hairline/60">
                    <td className="py-2 text-paper">{p.instrument}</td>
                    <td className={p.side === "BUY" ? "text-signal" : "text-danger"}>{p.side}</td>
                    <td>{p.volume}</td><td>{p.price_open}</td><td>{p.sl || "—"}</td><td>{p.tp || "—"}</td>
                    <td>{p.age_seconds}s</td>
                    <td className={`text-right ${tone(p.profit)}`}>{money(p.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="What the bot sees" eyebrow="Per pair">
        {!status || Object.keys(status.signals).length === 0 ? (
          <p className="text-xs text-dim">Start the bot to see live signal scores.</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(status.signals).map(([inst, sig]) => (
              <div key={inst} className="rounded-sm border border-hairline/60 px-3 py-2">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs">
                  <span className="text-paper">{inst}</span>
                  {sig.side && <span className={sig.side === "BUY" ? "text-signal" : "text-danger"}>{sig.side}</span>}
                  {sig.score !== undefined && (
                    <span className="flex items-center gap-2">
                      <span className="h-1.5 w-24 overflow-hidden rounded-full bg-hairline">
                        <span className="block h-full bg-signal" style={{ width: `${Math.min(100, sig.score)}%` }} />
                      </span>
                      <span className="text-dim">{sig.score}/{draft.min_signal_score}</span>
                    </span>
                  )}
                  {sig.spread_pips !== undefined && <span className="text-dim">spread {sig.spread_pips}p</span>}
                  {sig.atr_pips !== undefined && <span className="text-dim">ATR {sig.atr_pips}p</span>}
                </div>
                {sig.blocked && <p className="mt-1 text-[11px] text-amber">Skipped: {sig.blocked}</p>}
                {sig.reasons && sig.reasons.length > 0 && <p className="mt-1 text-[11px] text-dim">{sig.reasons.join(" · ")}</p>}
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Activity log" eyebrow="Latest first">
        {!status?.events.length ? (
          <p className="text-xs text-dim">Nothing yet.</p>
        ) : (
          <ul className="max-h-72 space-y-1 overflow-y-auto font-mono text-[11px]">
            {status.events.map((e, i) => (
              <li key={`${e.ts}-${i}`} className={e.level === "error" ? "text-danger" : e.level === "warning" ? "text-amber" : "text-dim"}>
                <span className="mr-2 text-dim/70">{new Date(e.ts * 1000).toLocaleTimeString()}</span>{e.message}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

// ------------------------------------------------------------------ Live | Backtest switcher
export function ScalperPanel() {
  const [view, setView] = useState<"live" | "backtest">("live");
  return (
    <div className="space-y-5">
      <div className="flex gap-1 border-b border-hairline">
        {([["live", "Live & settings"], ["backtest", "Backtest"]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`-mb-px border-b-2 px-4 py-2 font-mono text-xs ${view === id ? "border-signal text-signal" : "border-transparent text-dim hover:text-paper"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {view === "live" ? <ScalperLive /> : <ScalperBacktest />}
    </div>
  );
}
