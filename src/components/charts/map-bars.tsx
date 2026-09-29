"use client";

import { useMemo, useState } from "react";
import { Delaunay } from "d3-delaunay";
import type { MapShape } from "@/data/maps";
import { fmt } from "@/lib/format";

type Props = {
  /** これ未満の地域は棒を立てない（企業向けは10） */
  minBar?: number;
  shape: MapShape;
  /** 地図に立てる区分（「その他」は含めない） */
  rows: [string, number][];
  unit: string;
  total: number;
  label: string;
};

/** 市の形の上に、区分ごとの縦棒を立てる */
export function MapBars({ shape, rows, unit, label, minBar = 0 }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  const [, , W, H] = shape.viewBox.split(" ").map(Number);
  // 地区→地域にまとめる地図（松本）では、棒は地域ごと
  const grouped = !!shape.groups;
  const groupOf = (name: string) => shape.groups?.[name] ?? name;
  const value = new Map<string, number>();
  for (const [k, v] of rows) value.set(grouped ? groupOf(k) : k, (value.get(grouped ? groupOf(k) : k) ?? 0) + v);
  if (grouped) for (const [k, v] of [...value]) if (v < minBar) value.delete(k);
  const max = Math.max(...value.values(), 1);

  const barMax = Math.min(H, W) * 0.2;
  const barW = Math.max(W, H) * 0.03;
  const fs = Math.max(W, H) * 0.024;

  // 市の中を地区に分ける（seeds がある場合）。境目は仮
  const districts = useMemo(() => {
    if (!shape.seeds) return null;
    const names = Object.keys(shape.seeds);
    const pts = names.map((n) => shape.seeds![n]);
    const v = Delaunay.from(pts).voronoi([0, 0, W, H]);
    return names.map((n, i) => ({ name: n, d: v.renderCell(i), cx: pts[i][0], cy: pts[i][1] }));
  }, [shape, W, H]);

  const anchors = shape.groupAnchors
    ? Object.entries(shape.groupAnchors).map(([name, [cx, cy]]) => ({ name, d: "", cx, cy }))
    : (districts ?? shape.regions.map((r) => ({ name: r.name, d: r.d, cx: r.cx, cy: r.cy })));
  const clipId = `clip-${label}`;
  const hv = hover ? value.get(hover) : undefined;
  const ha = anchors.find((a) => a.name === hover);

  const fillFor = (name: string) => {
    if (!value.has(name)) return "var(--muted)";
    return hover === name ? "color-mix(in oklab, var(--chart-1) 28%, var(--card))" : "color-mix(in oklab, var(--chart-1) 12%, var(--card))";
  };

  return (
    <div className="relative mx-auto" style={{ maxWidth: (460 * W) / H }}>
      <svg viewBox={shape.viewBox} className="block h-auto w-full" role="img" aria-label={`${label}の地図と棒グラフ`}>
        {districts ? (
          <>
            <defs>
              <clipPath id={clipId}>
                {shape.regions.map((r) => (
                  <path key={r.name} d={r.d} />
                ))}
              </clipPath>
            </defs>
            <g clipPath={`url(#${clipId})`}>
              {districts.map((d) => (
                <path key={d.name} d={d.d} fill={fillFor(groupOf(d.name))} stroke="var(--card)" strokeWidth={grouped ? 1.5 : 3} />
              ))}
            </g>
            {shape.regions.map((r) => (
              <path key={r.name} d={r.d} fill="none" stroke="var(--border)" strokeWidth={2} />
            ))}
          </>
        ) : (
          shape.regions.map((r) => (
            <path key={r.name} d={r.d} fill={fillFor(r.name)} stroke="var(--card)" strokeWidth={3} strokeLinejoin="round" />
          ))
        )}

        {/* 棒 */}
        {anchors
          .filter((a) => value.has(a.name))
          .sort((a, b) => a.cy - b.cy)
          .map((a) => {
            const v = value.get(a.name)!;
            const h = Math.max(6, (v / max) * barMax);
            const on = hover === a.name;
            return (
              <g
                key={a.name}
                onMouseEnter={() => setHover(a.name)}
                onMouseLeave={() => setHover(null)}
                className="cursor-default"
              >
                <rect x={a.cx - barW * 1.6} y={a.cy - h - fs * 2} width={barW * 3.2} height={h + fs * 3.6} fill="transparent" />
                <ellipse cx={a.cx} cy={a.cy} rx={barW * 0.95} ry={barW * 0.32} fill="var(--foreground)" opacity={0.12} />
                <path
                  d={`M${a.cx - barW / 2},${a.cy} V${a.cy - h + barW / 2} a${barW / 2},${barW / 2} 0 0 1 ${barW},0 V${a.cy} Z`}
                  fill={on ? "var(--chart-2)" : "var(--chart-1)"}
                />
                <text
                  x={a.cx}
                  y={a.cy - h - fs * 0.5}
                  textAnchor="middle"
                  fontSize={fs}
                  fontWeight={700}
                  fill="var(--foreground)"
                  stroke="var(--card)"
                  strokeWidth={fs * 0.25}
                  paintOrder="stroke"
                  className="tnum"
                >
                  {fmt(v)}
                </text>
                <text
                  x={a.cx}
                  y={a.cy + fs * 1.35}
                  textAnchor="middle"
                  fontSize={fs * 0.9}
                  fill="var(--muted-foreground)"
                  stroke="var(--card)"
                  strokeWidth={fs * 0.25}
                  paintOrder="stroke"
                >
                  {a.name}
                </text>
              </g>
            );
          })}
      </svg>
      {ha && hv != null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border bg-popover px-3 py-2 text-xs shadow-sm"
          style={{ left: `${(ha.cx / W) * 100}%`, top: `calc(${(ha.cy / H) * 100}% - 8px)` }}
        >
          <div className="font-medium">{ha.name}</div>
          <div className="tnum text-muted-foreground">
            {fmt(hv)}
            {unit}
          </div>
        </div>
      )}
    </div>
  );
}
