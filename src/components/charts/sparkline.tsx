"use client";

import { Area, AreaChart, Line, ResponsiveContainer, YAxis } from "recharts";

/** カードの下に置く小さな推移。今年度＝面、前年度＝グレーの線 */
export function Sparkline({ cur, prev, height = 40 }: { cur: number[]; prev?: number[] | null; height?: number }) {
  const data = cur.map((v, i) => ({ i, cur: v, prev: prev?.[i] ?? null }));
  const max = Math.max(...cur, ...(prev ?? []), 0);
  return (
    <div style={{ height }} aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 2, left: 4 }}>
          <YAxis hide domain={[0, max * 1.05]} />
          {prev && <Line dataKey="prev" type="monotone" stroke="var(--chart-prev)" strokeWidth={1.5} dot={false} isAnimationActive={false} />}
          <Area
            dataKey="cur"
            type="monotone"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="var(--chart-1)"
            fillOpacity={0.1}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
