import { useEffect, useState } from "react";

// Mirrors app/engines/session_analysis.py's UTC session windows.
const SESSIONS = [
  { name: "Asian", start: 0, end: 8, color: "#33d6a0" },
  { name: "London", start: 8, end: 16, color: "#f2a33d" },
  { name: "New York", start: 13, end: 21, color: "#ff5c5c" },
] as const;

const RADIUS = 52;
const STROKE = 10;
const CENTER = 64;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function hourToAngle(hour: number): number {
  // 0h at top (12 o'clock), clockwise.
  return (hour / 24) * 360 - 90;
}

function arcPath(startHour: number, endHour: number): string {
  const startAngle = (hourToAngle(startHour) * Math.PI) / 180;
  const endAngle = (hourToAngle(endHour) * Math.PI) / 180;
  const x1 = CENTER + RADIUS * Math.cos(startAngle);
  const y1 = CENTER + RADIUS * Math.sin(startAngle);
  const x2 = CENTER + RADIUS * Math.cos(endAngle);
  const y2 = CENTER + RADIUS * Math.sin(endAngle);
  const largeArc = endHour - startHour > 12 ? 1 : 0;
  return `M ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${x2} ${y2}`;
}

export function SessionClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const utcHour = now.getUTCHours() + now.getUTCMinutes() / 60;
  const markerAngle = (hourToAngle(utcHour) * Math.PI) / 180;
  const markerX = CENTER + RADIUS * Math.cos(markerAngle);
  const markerY = CENTER + RADIUS * Math.sin(markerAngle);

  const activeSessions = SESSIONS.filter((s) => utcHour >= s.start && utcHour < s.end);
  const inOverlap = activeSessions.length > 1;

  return (
    <div className="flex items-center gap-3">
      <svg width={128} height={128} viewBox="0 0 128 128" className="shrink-0">
        <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="var(--color-hairline)" strokeWidth={STROKE} />
        {SESSIONS.map((s) => (
          <path
            key={s.name}
            d={arcPath(s.start, s.end)}
            fill="none"
            stroke={s.color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            opacity={0.85}
          />
        ))}
        {/* Hour ticks every 3h */}
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (hourToAngle(i * 3) * Math.PI) / 180;
          const inner = RADIUS + STROKE / 2 + 2;
          const outer = inner + 4;
          return (
            <line
              key={i}
              x1={CENTER + inner * Math.cos(angle)}
              y1={CENTER + inner * Math.sin(angle)}
              x2={CENTER + outer * Math.cos(angle)}
              y2={CENTER + outer * Math.sin(angle)}
              stroke="var(--color-dim)"
              strokeWidth={1}
            />
          );
        })}
        {/* Live UTC marker */}
        <circle cx={markerX} cy={markerY} r={4.5} fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth={2} />
        <text
          x={CENTER}
          y={CENTER - 4}
          textAnchor="middle"
          className="font-mono"
          fontSize={13}
          fill="var(--color-paper)"
        >
          {now.toISOString().slice(11, 16)}
        </text>
        <text x={CENTER} y={CENTER + 12} textAnchor="middle" className="font-mono" fontSize={8} fill="var(--color-dim)">
          UTC
        </text>
        <circle cx={CENTER} cy={CENTER} r={RADIUS - STROKE} fill="none" strokeWidth={0} style={{ pointerEvents: "none" }} />
        {CIRCUMFERENCE > 0 ? null : null}
      </svg>
      <div className="flex flex-col gap-1.5 text-xs">
        {SESSIONS.map((s) => {
          const active = utcHour >= s.start && utcHour < s.end;
          return (
            <div key={s.name} className="flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: s.color, opacity: active ? 1 : 0.3 }}
              />
              <span className={active ? "text-paper" : "text-dim"} style={{ fontFamily: "var(--font-mono)" }}>
                {s.name}
              </span>
            </div>
          );
        })}
        {inOverlap && (
          <span className="mt-0.5 rounded-sm bg-amber/15 px-1.5 py-0.5 text-[10px] font-medium text-amber">
            OVERLAP ACTIVE
          </span>
        )}
      </div>
    </div>
  );
}
