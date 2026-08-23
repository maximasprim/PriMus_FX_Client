import { useState } from "react";
import { Settings2, TrendingDown, TrendingUp } from "lucide-react";
import { Panel, ErrorState } from "./Panel";
import { StatusBadge } from "./StatusBadge";
import { toneForConfidence, toneForGrade } from "../lib/tones";
import { useApiData } from "../hooks/useApiData";
import { api, ApiError } from "../lib/api";

const INSTRUMENTS = ["EUR/USD", "GBP/USD", "XAU/USD"];
const CLOSE_FRACTIONS = [
  { label: "25%", value: 0.25 },
  { label: "50%", value: 0.5 },
  { label: "100%", value: 1.0 },
];

type Tone = "signal" | "danger" | "dim";

function InstrumentCard({ instrument }: { instrument: string }) {
  const { data, error, loading } = useApiData(() => api.markets.get(instrument), [instrument], 60_000);
  const { data: analysis, refetch: refetchAnalysis } = useApiData(
    () => api.analysis.get(instrument),
    [instrument],
    120_000
  );

  const [actionPending, setActionPending] = useState<"enter" | "close" | "modify" | null>(null);
  const [actionMessage, setActionMessage] = useState<{ tone: Tone; text: string } | null>(null);

  // Two-step confirm: clicking Enter/Close the first time only opens this
  // inline confirmation — nothing is sent to the broker until the user
  // explicitly confirms, same pattern as the chat assistant.
  const [pendingAction, setPendingAction] = useState<"enter" | "close" | null>(null);
  const [closeFraction, setCloseFraction] = useState(1.0);

  const [modifyOpen, setModifyOpen] = useState(false);
  const [newStopLoss, setNewStopLoss] = useState("");
  const [newTakeProfit, setNewTakeProfit] = useState("");

  const bullish = data?.market_bias.includes("Bullish");
  const bearish = data?.market_bias.includes("Bearish");

  const confirmEnter = async () => {
    setPendingAction(null);
    setActionPending("enter");
    setActionMessage(null);
    try {
      const res = await api.execution.manualEnter(instrument, true);
      if (res.execution?.executed) {
        setActionMessage({
          tone: "signal",
          text: `Entered ${res.setup.direction} — order ${res.execution.broker_order_id ?? ""}`,
        });
      } else {
        setActionMessage({
          tone: "dim",
          text: res.execution?.failure?.reason ?? "Could not enter — no confirmed setup.",
        });
      }
      refetchAnalysis();
    } catch (err) {
      setActionMessage({ tone: "danger", text: err instanceof ApiError ? err.message : "Enter failed." });
    } finally {
      setActionPending(null);
    }
  };

  const confirmClose = async () => {
    setPendingAction(null);
    setActionPending("close");
    setActionMessage(null);
    try {
      const res = await api.execution.manualClose(instrument, true, closeFraction);
      const closed = res.closed.filter((c) => c.closed);
      if (closed.length > 0) {
        const partial = closed.some((c) => c.partial);
        setActionMessage({
          tone: "signal",
          text: partial
            ? `Closed ${Math.round(closeFraction * 100)}% of the position on ${instrument}.`
            : `Closed ${closed.length} position(s) on ${instrument}.`,
        });
      } else if (res.closed.length > 0) {
        setActionMessage({ tone: "danger", text: res.closed[0].reason ?? "Close failed." });
      } else {
        setActionMessage({ tone: "dim", text: "No open position to close." });
      }
    } catch (err) {
      setActionMessage({ tone: "danger", text: err instanceof ApiError ? err.message : "Close failed." });
    } finally {
      setActionPending(null);
      setCloseFraction(1.0);
    }
  };

  const submitModify = async () => {
    const sl = newStopLoss.trim() ? Number(newStopLoss) : null;
    const tp = newTakeProfit.trim() ? Number(newTakeProfit) : null;
    if (sl === null && tp === null) return;

    setActionPending("modify");
    setActionMessage(null);
    try {
      const res = await api.execution.manualModify(instrument, sl, tp);
      const ok = res.modified.filter((m) => m.modified);
      if (ok.length > 0) {
        setActionMessage({ tone: "signal", text: `Updated stop/target on ${instrument}.` });
        setModifyOpen(false);
        setNewStopLoss("");
        setNewTakeProfit("");
      } else {
        setActionMessage({ tone: "dim", text: res.modified[0]?.reason ?? "Nothing to modify." });
      }
    } catch (err) {
      setActionMessage({ tone: "danger", text: err instanceof ApiError ? err.message : "Modify failed." });
    } finally {
      setActionPending(null);
    }
  };

  return (
    <div className="rounded-md border border-hairline bg-panel-raised p-4">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="font-display text-base font-semibold text-paper">{instrument}</h3>
          {data && (
            <p className="font-mono text-xs text-dim">
              bid {data.current_price.bid.toFixed(instrument.includes("XAU") ? 2 : 5)} / ask{" "}
              {data.current_price.ask.toFixed(instrument.includes("XAU") ? 2 : 5)}
            </p>
          )}
        </div>
        {bullish && <TrendingUp size={18} className="text-signal" />}
        {bearish && <TrendingDown size={18} className="text-danger" />}
      </div>

      {loading && !data && <p className="font-mono text-xs text-dim">Loading…</p>}
      {error && <ErrorState message={error} />}

      {data && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge tone={bullish ? "signal" : bearish ? "danger" : "dim"}>{data.market_bias}</StatusBadge>
            <StatusBadge tone="dim">{data.market_regime}</StatusBadge>
          </div>
          {data.latest_structure_event && (
            <p className="font-mono text-[11px] text-dim">latest: {data.latest_structure_event}</p>
          )}
        </div>
      )}

      {analysis && (
        <>
          <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3">
            <span className="font-mono text-[10px] tracking-widest text-dim uppercase">Confluence</span>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-hairline">
                <div className="h-full rounded-full bg-signal" style={{ width: `${analysis.confluence_score}%` }} />
              </div>
              <span className="font-mono text-xs text-paper">{analysis.confluence_score}</span>
              <StatusBadge tone={toneForGrade(analysis.grade)}>{analysis.grade}</StatusBadge>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-widest text-dim uppercase">Outlook</span>
            <StatusBadge tone={toneForConfidence(analysis.confidence_level)}>
              {analysis.confidence_level} confidence
            </StatusBadge>
          </div>
          <p className="mt-1 text-xs leading-snug text-paper/80">{analysis.scenario.primary_scenario}</p>
        </>
      )}

      <div className="mt-3 border-t border-hairline pt-3">
        {pendingAction === "enter" ? (
          <div className="rounded-sm border border-signal/40 bg-signal/8 p-2.5">
            <p className="font-mono text-[11px] text-paper">
              Enter {analysis?.direction ?? ""} on {instrument} now?
            </p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={confirmEnter}
                className="flex-1 rounded-sm border border-signal/40 bg-signal/20 py-1 font-mono text-[11px] text-signal"
              >
                Confirm
              </button>
              <button
                onClick={() => setPendingAction(null)}
                className="flex-1 rounded-sm border border-hairline py-1 font-mono text-[11px] text-dim"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : pendingAction === "close" ? (
          <div className="rounded-sm border border-danger/40 bg-danger/8 p-2.5">
            <p className="font-mono text-[11px] text-paper">Close how much of the {instrument} position?</p>
            <div className="mt-2 flex gap-1.5">
              {CLOSE_FRACTIONS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setCloseFraction(f.value)}
                  className={`flex-1 rounded-sm border py-1 font-mono text-[11px] ${
                    closeFraction === f.value
                      ? "border-danger/60 bg-danger/25 text-danger"
                      : "border-hairline text-dim"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <button
                onClick={confirmClose}
                className="flex-1 rounded-sm border border-danger/40 bg-danger/20 py-1 font-mono text-[11px] text-danger"
              >
                Confirm
              </button>
              <button
                onClick={() => {
                  setPendingAction(null);
                  setCloseFraction(1.0);
                }}
                className="flex-1 rounded-sm border border-hairline py-1 font-mono text-[11px] text-dim"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setPendingAction("enter")}
              disabled={actionPending !== null}
              className="flex-1 rounded-sm border border-signal/40 bg-signal/12 px-2.5 py-1.5 font-mono text-[11px] tracking-wide text-signal uppercase transition-opacity disabled:opacity-40"
            >
              {actionPending === "enter" ? "Entering…" : "Enter"}
            </button>
            <button
              onClick={() => setPendingAction("close")}
              disabled={actionPending !== null}
              className="flex-1 rounded-sm border border-danger/40 bg-danger/12 px-2.5 py-1.5 font-mono text-[11px] tracking-wide text-danger uppercase transition-opacity disabled:opacity-40"
            >
              {actionPending === "close" ? "Closing…" : "Close"}
            </button>
            <button
              onClick={() => setModifyOpen((v) => !v)}
              disabled={actionPending !== null}
              title="Adjust stop-loss / take-profit"
              className="rounded-sm border border-hairline px-2.5 py-1.5 text-dim transition-colors hover:text-paper disabled:opacity-40"
            >
              <Settings2 size={14} />
            </button>
          </div>
        )}

        {modifyOpen && pendingAction === null && (
          <div className="mt-2 rounded-sm border border-hairline bg-panel p-2.5">
            <p className="mb-2 font-mono text-[10px] tracking-widest text-dim uppercase">Adjust Open Position</p>
            <div className="flex gap-2">
              <input
                value={newStopLoss}
                onChange={(e) => setNewStopLoss(e.target.value)}
                placeholder="New stop loss"
                inputMode="decimal"
                className="w-1/2 rounded-sm border border-hairline bg-panel-raised px-2 py-1 font-mono text-[11px] text-paper placeholder:text-dim focus:border-signal/40 focus:outline-none"
              />
              <input
                value={newTakeProfit}
                onChange={(e) => setNewTakeProfit(e.target.value)}
                placeholder="New take profit"
                inputMode="decimal"
                className="w-1/2 rounded-sm border border-hairline bg-panel-raised px-2 py-1 font-mono text-[11px] text-paper placeholder:text-dim focus:border-signal/40 focus:outline-none"
              />
            </div>
            <button
              onClick={submitModify}
              disabled={actionPending !== null || (!newStopLoss.trim() && !newTakeProfit.trim())}
              className="mt-2 w-full rounded-sm border border-hairline py-1 font-mono text-[11px] text-paper transition-opacity disabled:opacity-40"
            >
              {actionPending === "modify" ? "Updating…" : "Update Stop / Target"}
            </button>
          </div>
        )}
      </div>

      {actionMessage && (
        <p
          className={`mt-2 font-mono text-[11px] leading-snug ${
            actionMessage.tone === "signal"
              ? "text-signal"
              : actionMessage.tone === "danger"
                ? "text-danger"
                : "text-dim"
          }`}
        >
          {actionMessage.text}
        </p>
      )}
    </div>
  );
}

export function WatchlistPanel() {
  return (
    <Panel eyebrow="Live" title="Market Watchlist">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {INSTRUMENTS.map((instrument) => (
          <InstrumentCard key={instrument} instrument={instrument} />
        ))}
      </div>
      <p className="mt-4 font-mono text-[10px] text-dim">
        Bias and outlook reflect the current price-structure read, not a price forecast. No trade is guaranteed
        to win. Enter/Close require an explicit confirm step and only ever act when a confirmed setup or open
        position exists; every safety gate (risk limits, news risk, emergency stop) still applies.
      </p>
    </Panel>
  );
}

// import { TrendingDown, TrendingUp } from "lucide-react";
// import { Panel, ErrorState } from "./Panel";
// import { StatusBadge } from "./StatusBadge";
// import { toneForGrade } from "../lib/tones";
// import { useApiData } from "../hooks/useApiData";
// import { api } from "../lib/api";

// const INSTRUMENTS = ["EUR/USD", "GBP/USD", "XAU/USD"];

// function InstrumentCard({ instrument }: { instrument: string }) {
//   const { data, error, loading } = useApiData(() => api.markets.get(instrument), [instrument], 60_000 /**15_000**/);
//   const { data: analysis } = useApiData(() => api.analysis.get(instrument), [instrument], 120_000 /**30_000**/);

//   const bullish = data?.market_bias.includes("Bullish");
//   const bearish = data?.market_bias.includes("Bearish");

//   return (
//     <div className="rounded-md border border-hairline bg-panel-raised p-4">
//       <div className="mb-3 flex items-start justify-between">
//         <div>
//           <h3 className="font-display text-base font-semibold text-paper">{instrument}</h3>
//           {data && (
//             <p className="font-mono text-xs text-dim">
//               bid {data.current_price.bid.toFixed(instrument.includes("XAU") ? 2 : 5)} / ask{" "}
//               {data.current_price.ask.toFixed(instrument.includes("XAU") ? 2 : 5)}
//             </p>
//           )}
//         </div>
//         {bullish && <TrendingUp size={18} className="text-signal" />}
//         {bearish && <TrendingDown size={18} className="text-danger" />}
//       </div>

//       {loading && !data && <p className="font-mono text-xs text-dim">Loading…</p>}
//       {error && <ErrorState message={error} />}

//       {data && (
//         <div className="space-y-2">
//           <div className="flex flex-wrap gap-1.5">
//             <StatusBadge tone={bullish ? "signal" : bearish ? "danger" : "dim"}>{data.market_bias}</StatusBadge>
//             <StatusBadge tone="dim">{data.market_regime}</StatusBadge>
//           </div>
//           {data.latest_structure_event && (
//             <p className="font-mono text-[11px] text-dim">latest: {data.latest_structure_event}</p>
//           )}
//         </div>
//       )}

//       {analysis && (
//         <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3">
//           <span className="font-mono text-[10px] tracking-widest text-dim uppercase">Confluence</span>
//           <div className="flex items-center gap-2">
//             <div className="h-1.5 w-20 overflow-hidden rounded-full bg-hairline">
//               <div
//                 className="h-full rounded-full bg-signal"
//                 style={{ width: `${analysis.confluence_score}%` }}
//               />
//             </div>
//             <span className="font-mono text-xs text-paper">{analysis.confluence_score}</span>
//             <StatusBadge tone={toneForGrade(analysis.grade)}>{analysis.grade}</StatusBadge>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// export function WatchlistPanel() {
//   return (
//     <Panel eyebrow="Live" title="Market Watchlist">
//       <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
//         {INSTRUMENTS.map((instrument) => (
//           <InstrumentCard key={instrument} instrument={instrument} />
//         ))}
//       </div>
//     </Panel>
//   );
// }
