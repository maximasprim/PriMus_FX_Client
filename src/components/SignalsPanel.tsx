import { Panel, EmptyState, ErrorState } from "./Panel";
import { StatusBadge } from "./StatusBadge";
import { toneForDirection, toneForGrade, toneForStatus } from "../lib/tones";
import { useApiData } from "../hooks/useApiData";
import { api } from "../lib/api";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export function SignalsPanel() {
  const { data, error, loading } = useApiData(() => api.signals.list({ limit: 30 }), [], 20_000);

  return (
    <Panel eyebrow="History" title="Signal Dashboard">
      {loading && !data && <p className="font-mono text-xs text-dim">Loading…</p>}
      {error && <ErrorState message={error} />}
      {data && data.length === 0 && (
        <EmptyState label="No signals recorded yet. They'll appear here as the analysis pipeline runs." />
      )}
      {data && data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="border-b border-hairline text-left font-mono text-[10px] tracking-widest text-dim uppercase">
                <th className="pb-2 pr-4 font-medium">Instrument</th>
                <th className="pb-2 pr-4 font-medium">Direction</th>
                <th className="pb-2 pr-4 font-medium">Score</th>
                <th className="pb-2 pr-4 font-medium">Grade</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 pr-4 font-medium">Result</th>
                <th className="pb-2 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {data.map((signal) => (
                <tr key={signal.id} className="border-b border-hairline/60 last:border-0">
                  <td className="py-2.5 pr-4 font-mono text-sm text-paper">{signal.instrument}</td>
                  <td className="py-2.5 pr-4">
                    <StatusBadge tone={toneForDirection(signal.direction)}>{signal.direction}</StatusBadge>
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-sm text-paper">{signal.confluence_score}</td>
                  <td className="py-2.5 pr-4">
                    <StatusBadge tone={toneForGrade(signal.grade)}>{signal.grade}</StatusBadge>
                  </td>
                  <td className="py-2.5 pr-4">
                    <StatusBadge tone={toneForStatus(signal.status)}>{signal.status.replace(/_/g, " ")}</StatusBadge>
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-xs text-dim">{signal.result ?? "-"}</td>
                  <td className="py-2.5 font-mono text-xs text-dim">{timeAgo(signal.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
