export type Tone = "signal" | "amber" | "danger" | "dim";

export function toneForGrade(grade: string): Tone {
  if (grade === "A+" || grade === "A") return "signal";
  if (grade === "B") return "amber";
  return "dim";
}

export function toneForDirection(direction: string): Tone {
  if (direction === "BUY") return "signal";
  if (direction === "SELL") return "danger";
  if (direction === "WAIT") return "amber";
  return "dim";
}

export function toneForStatus(status: string): Tone {
  if (status === "CONFIRMED" || status === "COMPLETED") return "signal";
  if (status === "SETUP_FORMING" || status === "ENTRY_ZONE_REACHED") return "amber";
  if (status === "INVALIDATED") return "danger";
  return "dim";
}
