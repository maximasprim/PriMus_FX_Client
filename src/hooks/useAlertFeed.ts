import { useEffect, useRef, useState } from "react";
import { getApiKey, getWsBaseUrl } from "../lib/config";
import type { WsAlertPayload } from "../types/api";

export type ConnectionStatus = "connecting" | "open" | "closed";

export function useAlertFeed(maxItems = 50) {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [alerts, setAlerts] = useState<WsAlertPayload[]>([]);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      setStatus("connecting");
      ws = new WebSocket(`${getWsBaseUrl()}/ws/alerts?token=${encodeURIComponent(getApiKey())}`);

      ws.onopen = () => setStatus("open");
      ws.onclose = () => {
        setStatus("closed");
        if (!cancelled) {
          reconnectTimer.current = setTimeout(connect, 3000);
        }
      };
      ws.onerror = () => ws?.close();
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as WsAlertPayload;
          setAlerts((prev) => [payload, ...prev].slice(0, maxItems));
        } catch {
          // ignore malformed frames
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      ws?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxItems]);

  return { status, alerts };
}
