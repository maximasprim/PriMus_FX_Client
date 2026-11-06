import { RefreshCw } from "lucide-react";
import { Panel, ErrorState } from "./Panel";
import { StatusBadge } from "./StatusBadge";
import { useApiData } from "../hooks/useApiData";
import { api } from "../lib/api";

function formatMoney(value: number | null | undefined, currency?: string) {
  if (value === null || value === undefined) return "-";
  const symbol = currency === "USD" || !currency ? "$" : `${currency} `;
  return `${symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-hairline bg-panel-raised p-3">
      <p className="font-mono text-[10px] tracking-widest text-dim uppercase">{label}</p>
      <p className="mt-1 font-mono text-sm text-paper">{value}</p>
    </div>
  );
}

export function AccountPanel() {
  const { data, error, loading, refetch } = useApiData(() => api.account.status(), [], 30_000);

  return (
    <Panel
      eyebrow="Broker"
      title="Account"
      action={
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 rounded-sm border border-hairline px-2.5 py-1 font-mono text-[11px] text-dim transition-colors hover:text-paper"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Test Connection
        </button>
      }
    >
      {error && <ErrorState message={error} />}

      {data && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={data.connected ? "signal" : "danger"}>
              {data.connected ? "Connected" : "Not Connected"}
            </StatusBadge>
            <StatusBadge tone="dim">adapter: {data.adapter}</StatusBadge>
            {data.emergency_stop_active && <StatusBadge tone="danger">Emergency Stop Active</StatusBadge>}
            <StatusBadge tone={data.auto_trading_enabled ? "signal" : "dim"}>
              Auto-Trading: {data.auto_trading_enabled ? "On" : "Off"}
            </StatusBadge>
          </div>

          {!data.connected && data.error && <ErrorState message={data.error} />}

          {data.connected && (
            <>
              <div>
                <h4 className="mb-1.5 font-mono text-[10px] tracking-widest text-dim uppercase">
                  Broker
                </h4>
                <p className="text-sm text-paper">{data.broker_name ?? "-"}</p>
                {data.server && <p className="font-mono text-xs text-dim">server: {data.server}</p>}
                {data.account_id && <p className="font-mono text-xs text-dim">account: {data.account_id}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Stat label="Balance" value={formatMoney(data.balance, data.currency)} />
                <Stat label="Equity" value={formatMoney(data.equity, data.currency)} />
                <Stat label="Currency" value={data.currency ?? "-"} />
                <Stat
                  label="Margin Used"
                  value={data.margin_used !== null && data.margin_used !== undefined ? formatMoney(data.margin_used, data.currency) : "N/A"}
                />
                <Stat
                  label="Margin Free"
                  value={data.margin_free !== null && data.margin_free !== undefined ? formatMoney(data.margin_free, data.currency) : "N/A"}
                />
                <Stat label="Leverage" value={data.leverage ? `1:${data.leverage}` : "N/A"} />
                <Stat label="Open Positions" value={String(data.open_positions_count ?? 0)} />
              </div>
            </>
          )}

          <p className="font-mono text-[10px] text-dim">
            {data.adapter === "paper"
              ? "Running on the paper (simulated) adapter - no real capital is at risk. Balance/equity are simulated."
              : "Live broker connection - figures reflect your real account."}
          </p>
        </div>
      )}
    </Panel>
  );
}
