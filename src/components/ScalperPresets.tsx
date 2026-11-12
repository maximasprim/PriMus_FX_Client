import { useState } from "react";
import { Check, Pencil, Save, Trash2 } from "lucide-react";
import { Panel, ErrorState } from "./Panel";
import { api, describeApiError } from "../lib/api";
import { useApiData } from "../hooks/useApiData";
import type { PresetInfo, ScalperConfig } from "../types/api";

const labelOf = (k: string) => k.replace(/_/g, " ");

function facts(v: Partial<ScalperConfig>): string[] {
  const out: string[] = [];
  if (v.instruments) out.push(v.instruments.join(" + "));
  if (v.entry_style) out.push(v.entry_style.replace("_", " "));
  if (v.min_signal_score !== undefined) out.push(`score ≥ ${v.min_signal_score}`);
  if (v.fixed_lot !== undefined && v.lot_mode !== "risk_pct") out.push(`${v.fixed_lot} lots`);
  if (v.tp_atr_mult !== undefined && v.sl_atr_mult !== undefined) out.push(`target ${v.tp_atr_mult}× / stop ${v.sl_atr_mult}× ATR`);
  if (v.max_concurrent_positions !== undefined) out.push(`max ${v.max_concurrent_positions} open`);
  if (v.max_hold_seconds) out.push(`hold ≤ ${Math.round(v.max_hold_seconds / 60)} min`);
  if (v.session_max_loss_pct) out.push(`stop at -${v.session_max_loss_pct}%`);
  return out;
}

export function ScalperPresets({
  hasUnsavedEdits, running, onApplied,
}: {
  hasUnsavedEdits: boolean;
  running: boolean;
  onApplied: (config: ScalperConfig) => void;
}) {
  const { data, error, refetch } = useApiData(() => api.scalper.presets.list(), [], 4000);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);

  const act = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setMessage(null);
    try {
      await fn();
    } catch (e) {
      setMessage({ kind: "error", text: describeApiError(e) });
    } finally {
      setBusy(null);
      refetch();
    }
  };

  const apply = (p: PresetInfo) => {
    if (hasUnsavedEdits && !window.confirm("You have unsaved changes in the settings below. Using a preset replaces them. Continue?")) return;
    return act(`apply-${p.id}`, async () => {
      const res = await api.scalper.presets.apply(p.id);
      onApplied(res.config);
      const shown = res.changed.slice(0, 6).map((c) => `${labelOf(c.key)}: ${JSON.stringify(c.from)} → ${JSON.stringify(c.to)}`).join(" · ");
      setMessage({
        kind: "ok",
        text: `“${p.name}” is now active.${res.changed.length ? ` Changed: ${shown}${res.changed.length > 6 ? ` … and ${res.changed.length - 6} more` : ""}.` : " Nothing needed changing."}` +
          (res.applied_live ? " New trades use it from now on; trades already open keep the exit rules they were opened with." : ""),
      });
    });
  };

  if (error && !data) return <ErrorState message={error} />;
  const active = data?.active;

  return (
    <Panel title="Setting presets" eyebrow="One click to switch the whole scalper">
      <p className="text-[11px] leading-snug text-dim">
        A preset is a saved set of rules (pairs, entry style, targets, lot size, stop rules…). Pick one and the whole scalper follows it for every
        new trade; each trade is stamped with the preset it was opened under, so the History tab shows which settings made which results.
        Presets never change the simulation/MT5 switch or the real-money switch. The starter presets are examples, <b className="text-paper">not
        proven profit settings</b>.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-sm border border-hairline bg-ink/40 px-3 py-2 font-mono text-xs">
        <span className="text-dim">Using now:</span>
        <span className="text-paper">{active ? active.name : "Custom settings (no preset)"}</span>
        {active?.modified && (
          <span className="rounded-sm bg-amber/15 px-1.5 py-0.5 text-[10px] text-amber" title={`Edited: ${active.changed_keys.map(labelOf).join(", ")}`}>
            edited since applied
          </span>
        )}
        {active?.modified && !active.id.startsWith("builtin-") && (
          <button disabled={!!busy} onClick={() => act("upd", async () => { await api.scalper.presets.updateFromCurrent(active.id); setMessage({ kind: "ok", text: "Preset updated with your current settings." }); })}
            className="ml-auto rounded-sm border border-hairline px-2 py-1 text-[11px] text-paper hover:border-signal disabled:opacity-40">
            Save my edits to this preset
          </button>
        )}
      </div>

      {message && (
        <p className={`mt-3 rounded-sm border px-3 py-2 text-xs ${message.kind === "ok" ? "border-signal/30 bg-signal/10 text-signal" : "border-danger/30 bg-danger/10 text-danger"}`}>
          {message.text}
        </p>
      )}

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {(data?.presets ?? []).map((p) => {
          const isActive = active?.id === p.id;
          return (
            <div key={p.id} className={`flex flex-col rounded-md border p-3 ${isActive ? "border-signal/50 bg-signal/5" : "border-hairline bg-ink/30"}`}>
              <div className="flex items-start justify-between gap-2">
                {renaming?.id === p.id ? (
                  <form className="flex flex-1 gap-1" onSubmit={(e) => { e.preventDefault(); act("ren", async () => { await api.scalper.presets.rename(p.id, renaming.name); setRenaming(null); }); }}>
                    <input autoFocus value={renaming.name} maxLength={60} onChange={(e) => setRenaming({ id: p.id, name: e.target.value })}
                      className="min-w-0 flex-1 rounded-sm border border-hairline bg-ink px-2 py-1 font-mono text-xs text-paper outline-none focus-visible:border-signal" />
                    <button className="rounded-sm border border-hairline px-2 text-xs text-paper hover:border-signal" aria-label="Save name"><Check size={12} /></button>
                  </form>
                ) : (
                  <h3 className="font-display text-sm font-semibold text-paper">{p.name}</h3>
                )}
                {isActive && <span className="shrink-0 rounded-sm bg-signal/15 px-1.5 py-0.5 font-mono text-[10px] text-signal">ACTIVE</span>}
              </div>
              {p.description && <p className="mt-1 text-[11px] leading-snug text-dim">{p.description}</p>}
              <div className="mt-2 flex flex-wrap gap-1">
                {facts(p.values).map((f) => <span key={f} className="rounded-sm border border-hairline/70 px-1.5 py-0.5 font-mono text-[10px] text-dim">{f}</span>)}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button disabled={!!busy} onClick={() => apply(p)}
                  className="rounded-sm bg-signal px-3 py-1.5 font-mono text-xs font-medium text-ink hover:opacity-90 disabled:opacity-40">
                  {isActive && !active?.modified ? "Re-apply" : isActive ? "Reset to this preset" : "Use this preset"}
                </button>
                {!p.builtin && (
                  <>
                    <button disabled={!!busy} onClick={() => setRenaming({ id: p.id, name: p.name })} className="flex items-center gap-1 rounded-sm px-2 py-1.5 font-mono text-[11px] text-dim hover:text-paper"><Pencil size={11} /> Rename</button>
                    <button disabled={!!busy} onClick={() => window.confirm(`Delete the preset “${p.name}”?`) && act("del", async () => { await api.scalper.presets.remove(p.id); })}
                      className="flex items-center gap-1 rounded-sm px-2 py-1.5 font-mono text-[11px] text-danger hover:bg-danger/10"><Trash2 size={11} /> Delete</button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 border-t border-hairline pt-3">
        {!saving ? (
          <button onClick={() => setSaving(true)} className="flex items-center gap-1.5 rounded-sm border border-hairline px-3 py-1.5 font-mono text-xs text-paper hover:border-signal">
            <Save size={12} /> Save my current settings as a new preset…
          </button>
        ) : (
          <form className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => { e.preventDefault(); act("save", async () => { const r = await api.scalper.presets.create(name); setName(""); setSaving(false); setMessage({ kind: "ok", text: `Saved “${r.preset.name}”. You can switch back to it any time.` }); }); }}>
            <input autoFocus value={name} maxLength={60} placeholder="Name, e.g. London session" onChange={(e) => setName(e.target.value)}
              className="w-64 rounded-sm border border-hairline bg-ink px-3 py-1.5 font-mono text-xs text-paper outline-none focus-visible:border-signal" />
            <button disabled={!name.trim() || !!busy} className="rounded-sm bg-signal px-3 py-1.5 font-mono text-xs font-medium text-ink hover:opacity-90 disabled:opacity-40">Save</button>
            <button type="button" onClick={() => { setSaving(false); setName(""); }} className="px-2 py-1.5 font-mono text-xs text-dim hover:text-paper">Cancel</button>
            {hasUnsavedEdits && <span className="text-[11px] text-amber">Apply your unsaved edits first, or they won’t be included.</span>}
          </form>
        )}
        {running && <p className="mt-2 text-[11px] text-dim">The bot is running: switching presets now only affects trades it opens from here on.</p>}
      </div>
    </Panel>
  );
}
