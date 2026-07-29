import { useState } from "react";
import { X } from "lucide-react";
import { getApiBaseUrl, setApiBaseUrl } from "../lib/config";
import { api } from "../lib/api";

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
          <h2 className="font-display text-sm font-semibold text-paper">Backend connection</h2>
          <button onClick={onClose} className="text-dim hover:text-paper" aria-label="Close settings">
            <X size={16} />
          </button>
        </header>
        <div className="space-y-3 p-4">
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] tracking-widest text-dim uppercase">API base URL</span>
            <input
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setTestStatus("idle");
              }}
              placeholder="http://localhost:8000"
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
