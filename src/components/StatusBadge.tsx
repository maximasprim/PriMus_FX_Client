import type { ReactNode } from "react";
import type { Tone } from "../lib/tones";

const TONE_CLASSES: Record<Tone, string> = {
  signal: "bg-signal/12 text-signal border-signal/30",
  amber: "bg-amber/12 text-amber border-amber/30",
  danger: "bg-danger/12 text-danger border-danger/30",
  dim: "bg-white/5 text-dim border-hairline",
};

export function StatusBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[11px] font-medium tracking-wide uppercase ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
