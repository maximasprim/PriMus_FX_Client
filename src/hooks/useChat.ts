import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { ChatMessage, ChatToolAction } from "../types/api";

export interface ChatEntry {
  message: ChatMessage;
  actions?: ChatToolAction[];
}

const STORAGE_KEY = "primus-chat-history-v1";

function loadStoredEntries(): ChatEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Owns the chat conversation (kept in App.tsx so it survives switching tabs)
 * and talks to POST /api/chat/message. The backend is stateless - we resend
 * the full message history on every turn (see lib/api.ts + Server's
 * app/services/chat_agent_service.py). History is additionally persisted to
 * localStorage so it survives a page refresh.
 */
export function useChat() {
  const [entries, setEntries] = useState<ChatEntry[]>(loadStoredEntries);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // Storage full/unavailable - conversation still works for this session.
    }
  }, [entries]);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || sending) return;

      const userEntry: ChatEntry = { message: { role: "user", content: trimmed } };
      const history = [...entries, userEntry];
      setEntries(history);
      setSending(true);
      setError(null);

      try {
        const response = await api.chat.sendMessage(history.map((e) => e.message));
        setEntries((prev) => [
          ...prev,
          { message: { role: "assistant", content: response.reply }, actions: response.actions },
        ]);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not reach the trading assistant.");
      } finally {
        setSending(false);
      }
    },
    [entries, sending]
  );

  const reset = useCallback(() => {
    setEntries([]);
    setError(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return { entries, sending, error, sendMessage, reset };
}
