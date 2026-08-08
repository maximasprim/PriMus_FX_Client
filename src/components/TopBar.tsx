import { useState } from "react";
import { Settings, ShieldAlert, Zap } from "lucide-react";
import { SessionClock } from "./SessionClock";
import { StatusBadge } from "./StatusBadge";
import { SettingsModal } from "./SettingsModal";
import { api } from "../lib/api";
import type { TradingControlStatus } from "../types/api";

const ACTOR = "dashboard-user"; // TODO: replace with real auth identity once multi-user support exists

export function TopBar({
  status,
  onStatusChange,
}: {
  status: TradingControlStatus | null;
  onStatusChange: () => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const autoTradingOn = status?.auto_trading_enabled ?? false;
  const emergencyStop = status?.emergency_stop_active ?? false;

  const handleToggleAutoTrading = async () => {
    if (autoTradingOn) return; // disabling happens via mode switch / emergency stop, not this button
    if (!confirming) {
      setBusy(true);
      try {
        await api.tradingControl.requestEnableAutoTrading(ACTOR);
        setConfirming(true);
      } finally {
        setBusy(false);
      }
      return;
    }
    setBusy(true);
    try {
      await api.tradingControl.confirmEnableAutoTrading(ACTOR);
      onStatusChange();
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  const handleEmergencyStop = async () => {
    setBusy(true);
    try {
      if (emergencyStop) {
        await api.tradingControl.clearEmergencyStop(ACTOR);
      } else {
        await api.tradingControl.stopNewTrades(ACTOR);
      }
      onStatusChange();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-hairline bg-ink/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-6 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-signal/12 text-signal">
              <Zap size={16} />
            </div>
            <div>
              <h1 className="font-display text-sm font-semibold tracking-tight text-paper">
                PriMus Confluence Analyst
              </h1>
              <p className="font-mono text-[10px] text-dim">EUR/USD · GBP/USD · XAU/USD</p>
            </div>
          </div>

          <div className="hidden items-center gap-6 lg:flex">
            <SessionClock />
          </div>

          <div className="flex items-center gap-3">
            {status && (
              <StatusBadge tone={status.global_mode === "FULL_AUTO" ? "signal" : "dim"}>
                {status.global_mode.replace("_", " ")}
              </StatusBadge>
            )}

            <button
              disabled={busy || autoTradingOn}
              onClick={handleToggleAutoTrading}
              title={autoTradingOn ? "Auto-trading is on — switch global mode to turn it off" : undefined}
              className={`rounded-sm border px-3 py-1.5 font-mono text-xs font-medium transition-colors disabled:cursor-not-allowed ${
                autoTradingOn
                  ? "border-signal/40 bg-signal/12 text-signal"
                  : confirming
                    ? "border-amber bg-amber/15 text-amber"
                    : "border-hairline text-dim hover:border-paper hover:text-paper"
              }`}
            >
              {autoTradingOn ? "AUTO-TRADING: ON" : confirming ? "CONFIRM ENABLE?" : "AUTO-TRADING: OFF"}
            </button>

            <button
              disabled={busy}
              onClick={handleEmergencyStop}
              className={`flex items-center gap-1.5 rounded-sm border px-3 py-1.5 font-mono text-xs font-medium transition-colors disabled:cursor-not-allowed ${
                emergencyStop
                  ? "border-danger bg-danger/15 text-danger"
                  : "border-hairline text-dim hover:border-danger hover:text-danger"
              }`}
            >
              <ShieldAlert size={13} />
              {emergencyStop ? "STOPPED — RESUME" : "STOP NEW TRADES"}
            </button>

            <button
              onClick={() => setSettingsOpen(true)}
              className="text-dim hover:text-paper"
              aria-label="Settings"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>
      </header>
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </>
  );
}
