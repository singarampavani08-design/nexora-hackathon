import type { ReactNode, CSSProperties } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TYPE_META, type Contact, type MemoryType } from "@/lib/types";

/** Friendly loading / error banner shared by all data-backed pages. */
export function StatusBanner({ loading, error }: { loading?: boolean; error?: string | null }) {
  if (error) {
    return (
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
      </div>
    );
  }
  if (loading) {
    return (
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-border bg-secondary/60 px-4 py-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> Loading your data…
      </div>
    );
  }
  return null;
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return <div className={`animate-shimmer rounded-2xl ${className}`} />;
}

export function Avatar({ contact, size = 40 }: { contact: Contact; size?: number }) {
  const initials = contact.name.split(" ").map((p) => p[0]).join("");
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full font-display font-semibold text-primary-foreground"
      style={{ width: size, height: size, fontSize: size * 0.36, background: `linear-gradient(135deg, oklch(0.6 0.17 ${contact.hue}), oklch(0.5 0.2 ${contact.hue + 50}))` }}
    >
      {initials}
    </div>
  );
}

export function TypeBadge({ type }: { type: MemoryType }) {
  const m = TYPE_META[type];
  return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", m.cls)}>{m.label}</span>;
}

export function Relevance({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2" title={`Relevance ${value}%`}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-brand" style={{ width: `${value}%` }} />
      </div>
      <span className="text-[11px] tabular-nums text-muted-foreground">{value}%</span>
    </div>
  );
}

export function Card({ className, children, style }: { className?: string; children: ReactNode; style?: CSSProperties }) {
  return <div className={cn("glass rounded-2xl p-5", className)} style={style}>{children}</div>;
}

export function PageHeader({ eyebrow, title, desc, action }: { eyebrow: string; title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 animate-fade-up">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold md:text-4xl">{title}</h1>
        {desc && <p className="mt-2 max-w-2xl text-muted-foreground">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

export const btnPrimary = "inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground glow transition hover:brightness-110 disabled:opacity-50";
export const btnGhost = "inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/60 px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-accent";
export const inputCls = "w-full rounded-xl border border-input bg-secondary/60 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";
