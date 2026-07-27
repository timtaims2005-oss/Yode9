import type { ReactNode } from "react";

export function ActionBtn({
  children, label, onClick, active,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  active?: "good" | "bad";
}) {
  return (
    <button
      onClick={onClick}
      className={`h-7 w-7 rounded-md flex items-center justify-center hover:bg-accent transition-colors ${
        active === "good" ? "text-emerald-400" : active === "bad" ? "text-primary" : "text-muted-foreground hover:text-foreground"
      }`}
      aria-label={label} title={label}
    >
      {children}
    </button>
  );
}

export function SquareIconBtn({
  children, onClick, label, active,
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative h-8 w-8 sm:h-9 sm:w-9 rounded-xl border flex items-center justify-center transition-colors ${
        active
          ? "bg-primary/15 border-primary/40 text-primary shadow-[0_0_10px_rgba(226,18,39,0.25)]"
          : "bg-background/60 border-border text-muted-foreground hover:text-foreground hover:bg-accent"
      }`}
      aria-label={label} title={label}
    >
      {children}
      {active && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary" />}
    </button>
  );
}

export function ModePill({
  children, active, onClick, title,
}: {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-8 px-2.5 rounded-full border flex items-center gap-1 shrink-0 transition-colors ${
        active
          ? "bg-primary/15 border-primary text-primary shadow-[0_0_12px_rgba(226,18,39,0.35)]"
          : "bg-card/40 border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
      }`}
      title={title}
    >
      {children}
    </button>
  );
}
