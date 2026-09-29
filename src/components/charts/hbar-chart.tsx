"use client";

import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmt, pct } from "@/lib/format";

type Row = { name: string; value: number };

/** 横棒グラフ。棒の先に件数と割合 */
/** showPct＝全体に占める割合を横に出すか（アンケートの回答の割合など、意味があるときだけ） */
export function HBarChart({ rows, unit = "件", color = "var(--chart-1)", showPct = true }: { rows: [string, number][]; unit?: string; color?: string; showPct?: boolean }) {
  const total = rows.reduce((a, [, v]) => a + v, 0);
  const data: Row[] = rows.map(([name, value]) => ({ name, value }));
  const height = data.length * 34 + 8;
  const labelW = Math.min(190, Math.max(64, Math.max(...data.map((d) => d.name.length)) * 12.5 + 12));
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 96, bottom: 0, left: 0 }} barCategoryGap={10}>
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis
            type="category"
            dataKey="name"
            width={labelW}
            tickLine={false}
            axisLine={false}
            tick={({ y, payload }) => (
              <text x={0} y={y} dy={4} fontSize={12} fill="var(--foreground)" textAnchor="start">
                {payload.value}
              </text>
            )}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as Row;
              return (
                <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-sm">
                  <div className="font-medium">{d.name}</div>
                  <div className="tnum text-muted-foreground">
                    {fmt(d.value)}
                    {unit}
                    {showPct && `（${pct(d.value, total)}%）`}
                  </div>
                </div>
              );
            }}
          />
          <Bar
            dataKey="value"
            fill={color}
            radius={[0, 4, 4, 0]}
            barSize={14}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="value"
              position="right"
              content={(p) => {
                const { x = 0, y = 0, width = 0, height = 0, value } = p as { x?: number; y?: number; width?: number; height?: number; value?: number };
                const v = Number(value ?? 0);
                return (
                  <text x={Number(x) + Number(width) + 8} y={Number(y) + Number(height) / 2} dy={4} fontSize={12} className="tnum">
                    <tspan fill="var(--foreground)">
                      {fmt(v)}
                      {showPct ? "" : unit}
                    </tspan>
                    <tspan fill="var(--muted-foreground)" dx={6} display={showPct ? undefined : "none"}>
                      {pct(v, total).toFixed(1)}%
                    </tspan>
                  </text>
                );
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
