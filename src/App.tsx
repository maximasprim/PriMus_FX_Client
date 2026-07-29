import { useState } from "react";
import { TopBar } from "./components/TopBar";
import { TabNav, type TabId } from "./components/TabNav";
import { WatchlistPanel } from "./components/WatchlistPanel";
import { SignalsPanel } from "./components/SignalsPanel";
import { AnalysisPanel } from "./components/AnalysisPanel";
import { PerformancePanel } from "./components/PerformancePanel";
import { ControlCenterPanel } from "./components/ControlCenterPanel";
import { AlertFeed } from "./components/AlertFeed";
import { useApiData } from "./hooks/useApiData";
import { api } from "./lib/api";

function App() {
  const [tab, setTab] = useState<TabId>("watchlist");
  const { data: controlStatus, refetch: refetchControlStatus } = useApiData(
    () => api.tradingControl.status(),
    [],
    10_000
  );

  return (
    <div className="flex h-full flex-col">
      <TopBar status={controlStatus} onStatusChange={refetchControlStatus} />

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <TabNav active={tab} onChange={setTab} />
          <main className="mx-auto w-full max-w-[1400px] flex-1 overflow-y-auto p-6">
            {tab === "watchlist" && <WatchlistPanel />}
            {tab === "signals" && <SignalsPanel />}
            {tab === "analysis" && <AnalysisPanel />}
            {tab === "performance" && <PerformancePanel />}
            {tab === "control" && <ControlCenterPanel />}
          </main>
        </div>
        <div className="hidden lg:block">
          <AlertFeed />
        </div>
      </div>
    </div>
  );
}

export default App;
