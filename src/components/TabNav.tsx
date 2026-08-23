const TABS = [
  { id: "watchlist", label: "Watchlist" },
  { id: "signals", label: "Signals" },
  { id: "analysis", label: "AI Analysis" },
  { id: "chat", label: "Assistant" },
  { id: "account", label: "Account" },
  { id: "performance", label: "Performance" },
  { id: "risk", label: "Risk Calculator" },
  { id: "reports", label: "Reports" },
  { id: "control", label: "Control Center" },
] as const;

export type TabId = (typeof TABS)[number]["id"];

export function TabNav({ active, onChange }: { active: TabId; onChange: (id: TabId) => void }) {
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-hairline px-6">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative shrink-0 px-3 py-3 font-mono text-xs tracking-wide uppercase transition-colors ${
            active === tab.id ? "text-paper" : "text-dim hover:text-paper"
          }`}
        >
          {tab.label}
          {active === tab.id && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-signal" />}
        </button>
      ))}
    </nav>
  );
}

// const TABS = [
//   { id: "watchlist", label: "Watchlist" },
//   { id: "signals", label: "Signals" },
//   { id: "analysis", label: "AI Analysis" },
//   { id: "performance", label: "Performance" },
//   { id: "control", label: "Control Center" },
// ] as const;

// export type TabId = (typeof TABS)[number]["id"];

// export function TabNav({ active, onChange }: { active: TabId; onChange: (id: TabId) => void }) {
//   return (
//     <nav className="flex gap-1 overflow-x-auto border-b border-hairline px-6">
//       {TABS.map((tab) => (
//         <button
//           key={tab.id}
//           onClick={() => onChange(tab.id)}
//           className={`relative shrink-0 px-3 py-3 font-mono text-xs tracking-wide uppercase transition-colors ${
//             active === tab.id ? "text-paper" : "text-dim hover:text-paper"
//           }`}
//         >
//           {tab.label}
//           {active === tab.id && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-signal" />}
//         </button>
//       ))}
//     </nav>
//   );
// }
