import { useApiData } from "../hooks/useApiData";
import { api } from "../lib/api";
import { StatusBadge } from "./StatusBadge";

export function MarketStatusBadge() {
  const { data } = useApiData(() => api.marketHours.status(), [], 60_000);

  if (!data) return null;

  return (
    <span title={data.reason ?? undefined}>
      <StatusBadge tone={data.open ? "signal" : "dim"}>{data.open ? "Market Open" : "Market Closed"}</StatusBadge>
    </span>
  );
}
