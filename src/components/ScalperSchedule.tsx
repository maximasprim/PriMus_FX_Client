import { useEffect, useMemo, useState } from "react";
import { Play, Plus, Save, Trash2 } from "lucide-react";
import { Panel, ErrorState } from "./Panel";
import { api, describeApiError } from "../lib/api";
import { useApiData } from "../hooks/useApiData";
import type { ScheduleSlot, ScheduleView } from "../types/api";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const deviceTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

function newSlot(): ScheduleSlot {
  return {
    id: Math.random().toString(16).slice(2, 10), name: "Daily session", enabled: true, time: "15:30", days: [0, 1, 2, 3, 4],
    duration_minutes: 60, profit_target_money: 0, close_positions_at_end: true, require_market_open: true,
    preset_id: null, last_run_date: null, last_result: null,
  };
}

function countdown(sec: number): string {
  if (sec < 60) return "in under a minute";
  const m = Math.floor(sec / 60);
  if (m < 60) return `in ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `in ${h}h ${m % 60}m`;
  return `in ${Math.floor(h / 24)} days`;
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start justify-between gap-3">
      <span className="text-xs text-paper">{label}{hint && <span className="block text-[10px] leading-snug text-dim">{hint}</span>}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 shrink-0" />
    </label>
  );
}

function Num({ label, hint, value, onChange, min = 0, max, step = 1 }: { label: string; hint?: string; value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number }) {
  const [text, setText] = useState(String(value));
  useEffect(() => { if (Number(text) !== value) setText(String(value)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [value]);
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-paper">{label}</span>
      <input type="number" inputMode="decimal" min={min} max={max} step={step} value={text}
        onChange={(e) => { setText(e.target.value); const n = Number(e.target.value); if (e.target.value !== "" && !Number.isNaN(n)) onChange(n); }}
        className="w-full rounded-sm border border-hairline bg-ink px-3 py-2 font-mono text-sm text-paper outline-none focus-visible:border-signal" />
      {hint && <span className="mt-1 block text-[10px] leading-snug text-dim">{hint}</span>}
    </label>
  );
}

function SlotCard({ slot, presets, onChange, onRemove }: {
  slot: ScheduleSlot; presets: { id: string; name: string }[]; onChange: (s: ScheduleSlot) => void; onRemove: () => void;
}) {
  const set = <K extends keyof ScheduleSlot>(k: K, v: ScheduleSlot[K]) => onChange({ ...slot, [k]: v });
  const endsAt = useMemo(() => {
    if (!slot.duration_minutes) return null;
    const [h, m] = slot.time.split(":").map(Number);
    const total = (h * 60 + m + slot.duration_minutes) % 1440;
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }, [slot.time, slot.duration_minutes]);
  const noLimit = !slot.duration_minutes && !slot.profit_target_money;

  return (
    <div className={`rounded-md border p-4 ${slot.enabled ? "border-hairline bg-panel" : "border-hairline/50 bg-panel/50 opacity-70"}`}>
      <div className="flex flex-wrap items-center gap-3">
        <input value={slot.name} maxLength={40} onChange={(e) => set("name", e.target.value)} aria-label="Session name"
          className="min-w-0 flex-1 rounded-sm border border-transparent bg-transparent px-1 py-1 font-display text-sm font-semibold text-paper outline-none hover:border-hairline focus-visible:border-signal" />
        <label className="flex items-center gap-2 font-mono text-xs text-dim"><input type="checkbox" checked={slot.enabled} onChange={(e) => set("enabled", e.target.checked)} /> On</label>
        <button onClick={onRemove} className="flex items-center gap-1 rounded-sm px-2 py-1 font-mono text-[11px] text-danger hover:bg-danger/10"><Trash2 size={12} /> Remove</button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs text-paper">Start time</span>
          <input type="time" value={slot.time} onChange={(e) => e.target.value && set("time", e.target.value)}
            className="w-full rounded-sm border border-hairline bg-ink px-3 py-2 font-mono text-sm text-paper outline-none focus-visible:border-signal" />
          <span className="mt-1 block text-[10px] text-dim">In the timezone chosen above.</span>
        </label>
        <Num label="Run for (minutes)" value={slot.duration_minutes} max={1440} onChange={(v) => set("duration_minutes", Math.round(v))}
          hint={endsAt ? `Stops at ${endsAt}. 0 = no time limit.` : "0 = no time limit."} />
        <Num label="Stop when up (profit target)" value={slot.profit_target_money} step={0.5} onChange={(v) => set("profit_target_money", v)}
          hint="In account currency, counting open trades. 0 = off." />
      </div>

      <div className="mt-3">
        <span className="mb-1 block text-xs text-paper">Days</span>
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map((d, i) => {
            const on = slot.days.includes(i);
            return (
              <button key={d} type="button" aria-pressed={on}
                onClick={() => set("days", on ? slot.days.filter((x) => x !== i) : [...slot.days, i].sort())}
                className={`rounded-sm border px-2.5 py-1 font-mono text-xs ${on ? "border-signal/40 bg-signal/12 text-signal" : "border-hairline text-dim hover:text-paper"}`}>
                {d}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Toggle label="Only start if the market is open" hint="If it's closed (weekend/holiday) that day's run is skipped." checked={slot.require_market_open} onChange={(v) => set("require_market_open", v)} />
        <Toggle label="Close the bot's trades when the session ends" hint="Off = they stay open with their own stop-loss / take-profit." checked={slot.close_positions_at_end} onChange={(v) => set("close_positions_at_end", v)} />
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs text-paper">Settings to use</span>
          <select value={slot.preset_id ?? ""} onChange={(e) => set("preset_id", e.target.value || null)}
            className="w-full rounded-sm border border-hairline bg-ink px-3 py-2 font-mono text-sm text-paper outline-none focus-visible:border-signal">
            <option value="">Whatever settings are active at the time</option>
            {presets.map((p) => <option key={p.id} value={p.id}>Apply preset: {p.name}</option>)}
          </select>
        </label>
      </div>

      {noLimit && <p className="mt-3 text-[11px] text-amber">No time limit and no profit target: this session only ends when a loss rule stops it or you stop it by hand.</p>}
      <div className="mt-3 border-t border-hairline/60 pt-2 font-mono text-[11px]">
        {slot.next_run && slot.enabled
          ? <span className="text-paper">Next start: {new Date(slot.next_run.at).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })} <span className="text-dim">({countdown(slot.next_run.in_seconds)})</span></span>
          : <span className="text-dim">{slot.enabled ? "Next start: shows once the schedule is switched on and saved." : "This session is switched off."}</span>}
        {slot.last_result && <div className="mt-1 text-dim">Last run{slot.last_run_date ? ` (${slot.last_run_date})` : ""}: {slot.last_result}</div>}
      </div>
    </div>
  );
}

export function ScalperSchedule() {
  const { data, error, refetch } = useApiData<ScheduleView>(() => api.scalper.schedule.get(), [], 5000);
  const { data: presetData } = useApiData(() => api.scalper.presets.list(), []);
  const [draft, setDraft] = useState<{ enabled: boolean; timezone: string; slots: ScheduleSlot[] } | null>(null);
  const [savedJson, setSavedJson] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [limits, setLimits] = useState({ duration_minutes: 60, profit_target_money: 0, close_positions_at_end: true });

  useEffect(() => {
    if (data && !draft) {
      const d = { enabled: data.enabled, timezone: data.timezone, slots: data.slots };
      setDraft(d);
      setSavedJson(JSON.stringify(strip(d)));
    }
  }, [data, draft]);

  const dirty = draft ? JSON.stringify(strip(draft)) !== savedJson : false;
  const timezones = useMemo(() => {
    try { return (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone"); } catch { return []; }
  }, []);
  const presetOptions = (presetData?.presets ?? []).map((p) => ({ id: p.id, name: p.name }));

  const save = async () => {
    if (!draft) return;
    setBusy(true); setMessage(null);
    try {
      const res = await api.scalper.schedule.save(strip(draft));
      const d = { enabled: res.enabled, timezone: res.timezone, slots: res.slots };
      setDraft(d); setSavedJson(JSON.stringify(strip(d)));
      setMessage({ kind: "ok", text: res.enabled ? "Schedule saved and ON. The backend must stay running on the PC with MT5 open at the start time." : "Schedule saved (currently OFF)." });
      refetch();
    } catch (e) {
      setMessage({ kind: "error", text: describeApiError(e) });
    } finally { setBusy(false); }
  };

  const startNow = async () => {
    setBusy(true); setMessage(null);
    try {
      await api.scalper.startTimed(limits);
      setMessage({ kind: "ok", text: "Started with your limits. Watch it on the Live & settings tab." });
      refetch();
    } catch (e) {
      setMessage({ kind: "error", text: describeApiError(e) });
    } finally { setBusy(false); }
  };

  if (error && !data) return <ErrorState message={error} />;
  if (!draft || !data) return <p className="font-mono text-xs text-dim">Loading schedule…</p>;

  const plan = data.plan;
  return (
    <div className="space-y-5">
      {plan && (
        <Panel>
          <p className="text-sm text-paper">
            <span className="mr-2 rounded-sm bg-signal/15 px-2 py-0.5 font-mono text-xs text-signal">SESSION RUNNING</span>
            “{plan.label || plan.source}”
            {plan.ends_at ? <> - ends at {new Date(plan.ends_at * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</> : null}
            {plan.profit_target_money > 0 ? <> - stops when up {plan.profit_target_money.toFixed(2)}</> : null}
            {plan.close_positions_at_end ? " - closes its trades at the end" : " - leaves trades open at the end"}.
          </p>
        </Panel>
      )}

      <Panel title="Daily schedule" eyebrow="Start the scalper automatically">
        <p className="text-[11px] leading-snug text-dim">
          Set a time and the scalper starts by itself each day (on the days you pick), runs for the time or profit target you set, then stops.
          A scheduled start goes through exactly the same safety checks as the Start button, and it is OFF until you switch it on here.
          If the backend isn’t running, or MT5 isn’t ready, within {data.grace_minutes} minutes of the start time, that day is marked “missed” and
          <b className="text-paper"> not</b> started late. The backend has to be running on the Windows PC, with MT5 open and logged in.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="flex items-center gap-2 rounded-sm border border-hairline bg-ink/40 px-3 py-2 font-mono text-xs text-paper">
            <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} />
            Schedule is {draft.enabled ? <b className="text-signal">ON</b> : <b className="text-dim">OFF</b>}
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-paper">Timezone for the start times</span>
            <input list="tzlist" value={draft.timezone} onChange={(e) => setDraft({ ...draft, timezone: e.target.value })}
              className="w-56 rounded-sm border border-hairline bg-ink px-3 py-2 font-mono text-sm text-paper outline-none focus-visible:border-signal" />
            <datalist id="tzlist">{timezones.map((z) => <option key={z} value={z} />)}</datalist>
          </label>
          {draft.timezone !== deviceTz() && (
            <button type="button" onClick={() => setDraft({ ...draft, timezone: deviceTz() })} className="rounded-sm border border-hairline px-3 py-2 font-mono text-xs text-paper hover:border-signal">
              Use this device’s timezone ({deviceTz()})
            </button>
          )}
          <div className="font-mono text-[11px] text-dim">
            <div>Time there now: {new Date(data.now_local).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })}</div>
            <div>Market: {data.market_open == null ? "unknown" : data.market_open ? <span className="text-signal">open</span> : <span className="text-amber">closed{data.market_reason ? ` - ${data.market_reason}` : ""}</span>}</div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {draft.slots.length === 0 && <p className="text-xs text-dim">No sessions yet. Add one, for example 15:30 on weekdays for 90 minutes.</p>}
          {draft.slots.map((s) => (
            <SlotCard key={s.id} slot={liveSlot(s, data)} presets={presetOptions}
              onChange={(ns) => setDraft({ ...draft, slots: draft.slots.map((x) => (x.id === s.id ? ns : x)) })}
              onRemove={() => setDraft({ ...draft, slots: draft.slots.filter((x) => x.id !== s.id) })} />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button disabled={draft.slots.length >= 6} onClick={() => setDraft({ ...draft, slots: [...draft.slots, newSlot()] })}
            className="flex items-center gap-1.5 rounded-sm border border-hairline px-3 py-1.5 font-mono text-xs text-paper hover:border-signal disabled:opacity-40">
            <Plus size={12} /> Add a session
          </button>
          <div className="flex items-center gap-2">
            {dirty && <span className="font-mono text-xs text-amber">Unsaved changes</span>}
            <button disabled={!dirty || busy} onClick={() => setDraft(JSON.parse(JSON.stringify({ enabled: data.enabled, timezone: data.timezone, slots: data.slots })))}
              className="rounded-sm px-3 py-1.5 font-mono text-xs text-dim hover:text-paper disabled:opacity-30">Discard</button>
            <button disabled={!dirty || busy} onClick={save}
              className="flex items-center gap-1.5 rounded-sm bg-signal px-4 py-1.5 font-mono text-xs font-medium text-ink hover:opacity-90 disabled:opacity-40">
              <Save size={12} /> Save schedule
            </button>
          </div>
        </div>
        {message && (
          <p className={`mt-3 rounded-sm border px-3 py-2 text-xs ${message.kind === "ok" ? "border-signal/30 bg-signal/10 text-signal" : "border-danger/30 bg-danger/10 text-danger"}`}>{message.text}</p>
        )}
      </Panel>

      <Panel title="Start now with limits" eyebrow="One-off run">
        <p className="text-[11px] leading-snug text-dim">Start the scalper right now for a set time and/or until it’s up a set amount, then it stops by itself. Same safety checks as the Start button.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Num label="Run for (minutes)" value={limits.duration_minutes} max={1440} onChange={(v) => setLimits({ ...limits, duration_minutes: Math.round(v) })} hint="0 = no time limit." />
          <Num label="Stop when up" value={limits.profit_target_money} step={0.5} onChange={(v) => setLimits({ ...limits, profit_target_money: v })} hint="0 = off." />
          <div className="flex items-end"><Toggle label="Close trades at the end" checked={limits.close_positions_at_end} onChange={(v) => setLimits({ ...limits, close_positions_at_end: v })} /></div>
        </div>
        <button disabled={busy} onClick={startNow} className="mt-3 flex items-center gap-1.5 self-start rounded-sm bg-signal px-4 py-2 font-mono text-xs font-medium text-ink hover:opacity-90 disabled:opacity-40">
          <Play size={14} /> Start now
        </button>
      </Panel>
    </div>
  );
}

/** The slot as edited, plus the server-owned fields (next start, last result) from the latest poll. */
function liveSlot(s: ScheduleSlot, data: ScheduleView): ScheduleSlot {
  const sv = data.slots.find((x) => x.id === s.id);
  return { ...s, next_run: sv?.next_run, last_result: sv ? sv.last_result : s.last_result, last_run_date: sv ? sv.last_run_date : s.last_run_date };
}

/** What gets saved: the editable fields only (the server owns the run history and next-run times). */
function strip(d: { enabled: boolean; timezone: string; slots: ScheduleSlot[] }) {
  return {
    enabled: d.enabled, timezone: d.timezone,
    slots: d.slots.map(({ id, name, enabled, time, days, duration_minutes, profit_target_money, close_positions_at_end, require_market_open, preset_id }) =>
      ({ id, name, enabled, time, days, duration_minutes, profit_target_money, close_positions_at_end, require_market_open, preset_id })),
  };
}
