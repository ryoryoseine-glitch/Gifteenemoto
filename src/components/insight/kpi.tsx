"use client";

import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmt } from "@/lib/format";
import { MIN_CELL } from "@/lib/metrics";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function Kpi({
  label,
  hint,
  value,
  unit,
  delta,
  deltaNote,
  spark,
  foot,
  hideSmall = true,
}: {
  label: string;
  hint: string;
  value: number | string;
  unit?: string;
  delta?: ReactNode;
  deltaNote?: string;
  spark?: ReactNode;
  foot?: ReactNode;
  hideSmall?: boolean;
}) {
  const hidden = hideSmall && typeof value === "number" && value < MIN_CELL;
  return (
    <div className="flex flex-col rounded-lg border bg-card px-4 pt-3.5 pb-3">
      <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
        {label}
        <Tooltip>
          <TooltipTrigger render={<button type="button" aria-label={`${label}の定義`} className="text-muted-foreground/70 hover:text-foreground" />}>
            <Info className="size-3.5" />
          </TooltipTrigger>
          <TooltipContent>{hint}</TooltipContent>
        </Tooltip>
      </div>
      {hidden ? (
        <div className="mt-2 text-sm text-muted-foreground">10件未満のため表示しません</div>
      ) : (
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-[26px] leading-tight font-bold tracking-tight tnum">{typeof value === "number" ? fmt(value) : value}</span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>
      )}
      {delta && (
        <div className="mt-0.5 flex items-center gap-1.5 text-xs">
          {delta}
          {deltaNote && <span className="text-muted-foreground">{deltaNote}</span>}
        </div>
      )}
      <div className="mt-auto pt-3">{spark ?? foot}</div>
    </div>
  );
}

export function KpiGrid({ children, count }: { children: ReactNode; count: number }) {
  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", count >= 4 && "lg:grid-cols-4", count === 3 && "lg:grid-cols-3")}>{children}</div>
  );
}
