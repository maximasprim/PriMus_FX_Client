import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getApiBaseUrl, setApiBaseUrl } from "../lib/config";
import { api, ApiError } from "../lib/api";
import type { AISettings } from "../types/api";

function AIProviderSection() {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.aiSettings
      .get()
      .then(setSettings)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load AI settings."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleProviderChange = async (provider: string) => {
    setSaving(true);
    try {
      const updated = await api.aiSettings.update({ provider });
      setSettings(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update provider.");
    } finally {
      setSaving(false);
    }
  };

  const handleModelChange = async (model: string) => {
    setSaving(true);
    try {
      const updated = await api.aiSettings.update({ model });
      setSettings(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update model.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnrichment = async (enabled: boolean) => {
    setSaving(true);
    try {
      const updated = await api.aiSettings.update({ analysis_enrichment_enabled: enabled });
      setSettings(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update setting.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="font-mono text-xs text-dim">Loading AI settings…</p>;
  if (error || !settings) return <p className="font-mono text-xs text-danger">{error ?? "Unavailable"}</p>;

  const current = settings.available_providers.find((p) => p.id === settings.provider);

  return (
    <div className="space-y-3 border-t border-hairline pt-3">
      <span className="block font-mono text-[10px] tracking-widest text-dim uppercase">AI Provider</span>

      <div className="grid grid-cols-3 gap-2">
        {settings.available_providers.map((p) => (
          <button
            key={p.id}
            onClick={() => handleProviderChange(p.id)}
            disabled={saving}
            className={`rounded-sm border px-2 py-1.5 font-mono text-xs capitalize transition-colors disabled:opacity-40 ${
              p.id === settings.provider
                ? "border-signal/40 bg-signal/12 text-signal"
                : "border-hairline text-dim hover:text-paper"
            }`}
          >
            {p.id}
            {!p.has_api_key && <span className="ml-1 text-danger">•</span>}
          </button>
        ))}
      </div>

      {!settings.has_api_key && (
        <p className="text-xs text-danger">
          No API key set for {settings.provider} — add it to the server's .env to actually use this provider.
        </p>
      )}

      {current && (
        <label className="block">
          <span className="mb-1 block font-mono text-[10px] tracking-widest text-dim uppercase">Model</span>
          <select
            value={settings.model ?? current.default_model}
            onChange={(e) => handleModelChange(e.target.value)}
            disabled={saving}
            className="w-full rounded-sm border border-hairline bg-ink px-3 py-2 font-mono text-sm text-paper outline-none focus-visible:border-signal disabled:opacity-40"
          >
            {current.available_models.map((m) => (
              <option key={m} value={m}>
                {m}
                {m === current.default_model ? " (default)" : ""}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="flex items-center justify-between gap-3 pt-1">
        <span className="text-xs text-paper">
          AI-enrich analysis reasoning
          <span className="block text-[10px] text-dim">
            Uses the model above to write the scenario narrative on the AI Analysis page. The confluence score
            itself never changes — it's always the deterministic rule-based score. Off by default; turning this
            on calls the model on every analysis refresh (cached ~3 min per instrument).
          </span>
        </span>
        <input
          type="checkbox"
          checked={settings.analysis_enrichment_enabled}
          onChange={(e) => handleToggleEnrichment(e.target.checked)}
          disabled={saving}
          className="mt-0.5 shrink-0"
        />
      </label>
    </div>
  );
}

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState(getApiBaseUrl());
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");

  const handleTest = async () => {
    setApiBaseUrl(url);
    setTestStatus("testing");
    try {
      await api.health();
      setTestStatus("ok");
    } catch {
      setTestStatus("fail");
    }
  };

  const handleSave = () => {
    setApiBaseUrl(url);
    onClose();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-md border border-hairline bg-panel-raised shadow-2xl">
        <header className="flex items-center justify-between border-b border-hairline px-4 py-3">
          <h2 className="font-display text-sm font-semibold text-paper">Settings</h2>
          <button onClick={onClose} className="text-dim hover:text-paper" aria-label="Close settings">
            <X size={16} />
          </button>
        </header>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
          <div className="space-y-3">
            <span className="block font-mono text-[10px] tracking-widest text-dim uppercase">
              Backend connection
            </span>
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] tracking-widest text-dim uppercase">
                API base URL
              </span>
              <input
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setTestStatus("idle");
                }}
                placeholder="http://127.0.0.1:8000"
                className="w-full rounded-sm border border-hairline bg-ink px-3 py-2 font-mono text-sm text-paper outline-none focus-visible:border-signal"
              />
            </label>
            <p className="text-xs text-dim">
              Point this at wherever your FastAPI backend is deployed. Stored locally in your browser — nothing
              is sent anywhere else.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleTest}
                className="rounded-sm border border-hairline px-3 py-1.5 font-mono text-xs text-paper hover:border-signal hover:text-signal"
              >
                Test connection
              </button>
              {testStatus === "testing" && <span className="font-mono text-xs text-dim">Checking…</span>}
              {testStatus === "ok" && <span className="font-mono text-xs text-signal">Connected</span>}
              {testStatus === "fail" && <span className="font-mono text-xs text-danger">Could not reach backend</span>}
            </div>
          </div>

          <AIProviderSection />
        </div>
        <footer className="flex justify-end gap-2 border-t border-hairline px-4 py-3">
          <button onClick={onClose} className="rounded-sm px-3 py-1.5 font-mono text-xs text-dim hover:text-paper">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-sm bg-signal px-3 py-1.5 font-mono text-xs font-medium text-ink hover:opacity-90"
          >
            Save & reload
          </button>
        </footer>
      </div>
    </div>
  );
}
