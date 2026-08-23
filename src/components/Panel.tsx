import type { ReactNode } from "react";

export function Panel({
  title,
  eyebrow,
  action,
  children,
  className = "",
}: {
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-md border border-hairline bg-panel ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between border-b border-hairline px-4 py-3">
          <div>
            {eyebrow && (
              <div className="font-mono text-[10px] tracking-widest text-dim uppercase">{eyebrow}</div>
            )}
            {title && <h2 className="font-display text-sm font-semibold text-paper">{title}</h2>}
          </div>
          {action}
        </header>
      )}
      <div className="flex flex-1 min-h-0 flex-col p-4">{children}</div>
    </section>
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-10 text-center">
      <p className="font-mono text-xs text-dim">{label}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 font-mono text-xs text-danger">
      {message}
    </div>
  );
}
