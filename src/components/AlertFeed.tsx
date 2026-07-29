import { Radio } from "lucide-react";
import { useAlertFeed } from "../hooks/useAlertFeed";
import { EmptyState } from "./Panel";
import { StatusBadge } from "./StatusBadge";
import { toneForGrade } from "../lib/tones";

export function AlertFeed() {
  const { status, alerts } = useAlertFeed();

  return (
    <aside className="flex h-full w-full flex-col border-l border-hairline bg-panel lg:w-80">
      <header className="flex items-center justify-between border-b border-hairline px-4 py-3">
        <div className="flex items-center gap-2">
          <Radio size={14} className={status === "open" ? "text-signal" : "text-dim"} />
          <h2 className="font-display text-sm font-semibold text-paper">Live Feed</h2>
        </div>
        <span
          className={`font-mono text-[10px] uppercase ${
            status === "open" ? "text-signal" : status === "connecting" ? "text-amber" : "text-dim"
          }`}
        >
          {status}
        </span>
      </header>
      <div className="flex-1 overflow-y-auto p-3">
        {alerts.length === 0 ? (
          <EmptyState label="No alerts yet. Confirmed setups and system events will stream in here live." />
        ) : (
          <div className="space-y-2">
            {alerts.map((alert, i) => (
              <div key={i} className="rounded-sm border border-hairline bg-panel-raised p-2.5">
                {alert.setup && (
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <StatusBadge tone={toneForGrade(alert.setup.grade)}>{alert.setup.grade}</StatusBadge>
                    <span className="font-mono text-xs text-paper">{alert.setup.instrument}</span>
                  </div>
                )}
                <p className="whitespace-pre-line font-mono text-[11px] leading-snug text-dim">
                  {alert.message.length > 200 ? `${alert.message.slice(0, 200)}…` : alert.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
