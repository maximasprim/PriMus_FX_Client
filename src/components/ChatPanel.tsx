import { useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { Panel, ErrorState, EmptyState } from "./Panel";
import type { ChatEntry } from "../hooks/useChat";

const SUGGESTIONS = [
  "What's the current setup on EUR/USD?",
  "Any open positions right now?",
  "What's the trading control status?",
];

function ChatBubble({ entry }: { entry: ChatEntry }) {
  const isUser = entry.message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] space-y-1.5 rounded-md px-3 py-2 text-sm leading-relaxed ${
          isUser
            ? "bg-signal/12 text-paper"
            : "border border-hairline bg-panel-raised text-paper"
        }`}
      >
        <p className="whitespace-pre-wrap">{entry.message.content}</p>
        {entry.actions && entry.actions.length > 0 && (
          <div className="mt-1 space-y-1 border-t border-hairline/60 pt-1.5">
            {entry.actions.map((action, i) => (
              <p key={i} className="font-mono text-[10px] tracking-wide text-dim">
                ⚡ {action.summary}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ChatPanel({
  entries,
  sending,
  error,
  onSend,
  onReset,
}: {
  entries: ChatEntry[];
  sending: boolean;
  error: string | null;
  onSend: (content: string) => void;
  onReset: () => void;
}) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [entries, sending]);

  const submit = () => {
    if (!draft.trim() || sending) return;
    onSend(draft);
    setDraft("");
  };

  return (
    <Panel
      eyebrow="Live"
      title="Trading Assistant"
      action={
        <span className="flex items-center gap-3 font-mono text-[10px] text-dim">
          <span className="flex items-center gap-1.5">
            <Sparkles size={12} />
            Can place &amp; close trades - with your confirmation
          </span>
          {entries.length > 0 && (
            <button onClick={onReset} className="text-dim underline decoration-dotted hover:text-paper">
              Clear
            </button>
          )}
        </span>
      }
      className="flex h-full min-h-0 flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-2">
          {entries.length === 0 ? (
            <div className="space-y-3">
              <EmptyState label="Ask about a setup, your open positions, or tell the assistant to enter or close a trade." />
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => onSend(s)}
                    className="rounded-sm border border-hairline px-2.5 py-1 font-mono text-[11px] text-dim transition-colors hover:text-signal"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            entries.map((entry, i) => <ChatBubble key={i} entry={entry} />)
          )}
          {sending && <p className="font-mono text-[11px] text-dim">Thinking…</p>}
        </div>

        {error && (
          <div className="mt-2">
            <ErrorState message={error} />
          </div>
        )}

        <div className="mt-3 flex items-center gap-2 border-t border-hairline pt-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Ask the assistant, or tell it to enter/close a trade…"
            className="flex-1 rounded-sm border border-hairline bg-panel-raised px-3 py-2 text-sm text-paper placeholder:text-dim focus:border-signal/40 focus:outline-none"
          />
          <button
            onClick={submit}
            disabled={sending || !draft.trim()}
            className="flex items-center gap-1.5 rounded-sm border border-signal/40 bg-signal/12 px-3 py-2 font-mono text-xs text-signal transition-opacity disabled:opacity-40"
          >
            <Send size={14} />
            Send
          </button>
        </div>
        <p className="mt-2 font-mono text-[10px] text-dim">
          The assistant will always state the exact trade details and ask you to confirm before placing or
          closing anything - it never trades without that confirmation.
        </p>
      </div>
    </Panel>
  );
}
