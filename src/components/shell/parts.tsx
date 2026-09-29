"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useApp, type Compare } from "@/store/useApp";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function PageHeader({ eyebrow, title, sub, actions }: { eyebrow?: ReactNode; title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-xs text-muted-foreground">{eyebrow}</div>}
        <h1 className="text-xl leading-snug font-bold tracking-tight sm:text-[22px]">{title}</h1>
        {sub && <div className="mt-1 text-[13px] text-muted-foreground">{sub}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CompareToggle() {
  const cmp = useApp((s) => s.cmp);
  const setCmp = useApp((s) => s.setCmp);
  return (
    <ToggleGroup
      value={[cmp]}
      onValueChange={(v) => v[0] && setCmp(v[0] as Compare)}
      variant="outline"
      size="sm"
      spacing={0}
      aria-label="比較の切り替え"
      className="bg-card"
    >
      <ToggleGroupItem value="month" className="px-3 text-xs data-pressed:bg-primary data-pressed:text-primary-foreground">
        先月比
      </ToggleGroupItem>
      <ToggleGroupItem value="year" className="px-3 text-xs data-pressed:bg-primary data-pressed:text-primary-foreground">
        前年比
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

/** ▲▼ の変化表示。unit="%" は変化率、"pt" は差 */
export function Delta({ value, unit = "%", className }: { value: number | null; unit?: "%" | "pt"; className?: string }) {
  if (value == null) return <span className={cn("text-muted-foreground", className)}>比較なし</span>;
  const r = Math.round(value * 10) / 10;
  if (r === 0) return <span className={cn("text-muted-foreground tnum", className)}>± 0{unit}</span>;
  const up = r > 0;
  return (
    <span className={cn("tnum font-medium", up ? "text-up" : "text-down", className)}>
      {up ? "▲" : "▼"} {Math.abs(r).toFixed(1)}
      {unit}
    </span>
  );
}

export function UpdateBadge({ kind, text }: { kind: "live" | "daily"; text?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] whitespace-nowrap text-muted-foreground">
      <span className={cn("size-1.5 rounded-full", kind === "live" ? "bg-live animate-pulse" : "bg-muted-foreground/60")} />
      {text ?? (kind === "live" ? "リアルタイム" : "1日1回更新")}
    </span>
  );
}

export function Section({ title, meta, children, className, bodyClassName }: { title: ReactNode; meta?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cn("rounded-lg border bg-card", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b px-5 py-3">
        <h2 className="text-sm font-bold">{title}</h2>
        {meta}
      </div>
      <div className={cn("px-5 py-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="grid place-items-center px-4 py-10 text-center">
      {icon && <div className="mb-3 grid size-10 place-items-center rounded-full bg-muted text-muted-foreground [&_svg]:size-5">{icon}</div>}
      <p className="text-sm font-medium">{title}</p>
      {children && <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">{children}</p>}
    </div>
  );
}
