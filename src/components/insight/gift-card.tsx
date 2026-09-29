"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmt, pctText, yen } from "@/lib/format";
import { projectTotals } from "@/lib/metrics";
import type { Project } from "@/data/types";
import { GiftCollage, GiftPhoto } from "@/components/gift/gift-photo";

/** 選べるギフトカード（写真＋利用率）。企業・自治体のダッシュボードで使う */
export function GiftCard({
  selected,
  onClick,
  photoIds,
  muni,
  title,
  sub,
  amountLabel = "寄附",
  amount,
  project,
  unit,
}: {
  /** onClick がないときは見るだけのカード（押せない） */
  selected?: boolean;
  onClick?: () => void;
  photoIds: string[];
  muni: string;
  title: string;
  sub: string;
  amountLabel?: string;
  amount: number | null;
  project: Project;
  unit: string;
}) {
  const t = projectTotals(project);
  const closed = project.status === "closed";
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      {...(onClick ? { type: "button" as const, role: "radio", "aria-checked": !!selected, onClick } : {})}
      className={cn(
        "group relative flex w-[74%] shrink-0 snap-start flex-col overflow-hidden rounded-xl border bg-card text-left sm:w-auto",
        onClick && "transition-all hover:-translate-y-0.5 hover:shadow-md",
        selected ? "border-primary ring-2 ring-primary/70" : onClick && "hover:border-foreground/20",
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {photoIds.length > 1 ? (
          <GiftCollage ids={photoIds} className="absolute inset-0 gap-px" />
        ) : (
          <GiftPhoto id={photoIds[0]} className={cn("absolute inset-0 size-full transition-transform duration-300 group-hover:scale-[1.03]", closed && "grayscale-[60%]")} />
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent" />
        <div className="absolute bottom-2 left-3 flex gap-1.5">
          <span className="rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-[#232323]">{muni}</span>
          {closed && <span className="rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">終了</span>}
        </div>
        {selected && (
          <span className="absolute top-2.5 right-2.5 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground shadow">
            <Check className="size-4" strokeWidth={3} />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col px-3.5 pt-2.5 pb-3">
        <div className="truncate text-xs text-link">{sub}</div>
        <div className="mt-0.5 line-clamp-2 text-[15px] leading-snug font-bold">{title}</div>
        <div className="mt-auto pt-3">
          <div className="flex items-baseline justify-between text-xs text-muted-foreground">
            <span>利用率</span>
            <span className="text-[17px] font-bold text-foreground tnum">{pctText(t.useRate * 100)}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--chart-track)]">
            <div className="h-full rounded-full bg-[var(--chart-1)]" style={{ width: `${t.useRate * 100}%` }} />
          </div>
          <div className="mt-2 flex justify-between gap-2 text-xs text-muted-foreground tnum">
            {amount != null && (
              <span className="truncate">
                {amountLabel} {yen(amount)}
              </span>
            )}
            <span className="ml-auto whitespace-nowrap">
              {fmt(t.received)}
              {unit}に届いた
            </span>
          </div>
        </div>
      </div>
    </Tag>
  );
}

export function GiftCardRow({ children, label, selectable = true }: { children: React.ReactNode; label: string; selectable?: boolean }) {
  return (
    <div
      role={selectable ? "radiogroup" : "list"}
      aria-label={label}
      className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pt-1 pb-2 sm:mx-0 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] sm:overflow-visible sm:px-0 sm:pb-0"
    >
      {children}
    </div>
  );
}
