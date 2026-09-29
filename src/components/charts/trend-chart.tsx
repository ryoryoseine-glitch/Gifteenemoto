"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmt } from "@/lib/format";

/** 月別の推移。今年度＝青の線、前年度＝グレーの線 */
export function TrendChart({ months, cur, prev, unit }: { months: string[]; cur: number[]; prev: number[] | null; unit: string }) {
  const data = months.map((m, i) => ({ m, cur: cur[i], prev: prev?.[i] ?? null }));
  return (
    <div>
      <div className="mb-2 flex gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-[var(--chart-1)]" />
          今年度
        </span>
        {prev && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded bg-[var(--chart-prev)]" />
            前年度
          </span>
        )}
      </div>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="m" tickLine={false} axisLine={{ stroke: "var(--border)" }} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
            <YAxis
              width={44}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              tickFormatter={(v: number) => fmt(v)}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ stroke: "var(--border)" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as { cur: number; prev: number | null };
                return (
                  <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-sm">
                    <div className="mb-1 font-medium">{label}</div>
                    <div className="flex items-center gap-2 tnum">
                      <span className="h-0.5 w-3 bg-[var(--chart-1)]" />
                      今年度 {fmt(d.cur)}
                      {unit}
                    </div>
                    {d.prev != null && (
                      <div className="flex items-center gap-2 text-muted-foreground tnum">
                        <span className="h-0.5 w-3 bg-[var(--chart-prev)]" />
                        前年度 {fmt(d.prev)}
                        {unit}
                      </div>
                    )}
                  </div>
                );
              }}
            />
            {prev && <Line dataKey="prev" stroke="var(--chart-prev)" strokeWidth={2} dot={false} isAnimationActive={false} />}
            <Line
              dataKey="cur"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={{ r: 4, fill: "var(--chart-1)", stroke: "var(--card)", strokeWidth: 2 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
