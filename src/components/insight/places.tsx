"use client";

import { fmt } from "@/lib/format";
import { breakdownOf, foldSmall, sum } from "@/lib/metrics";
import type { CaseData, Project } from "@/data/types";
import { MATSUMOTO_MAP, SAPPORO_MAP } from "@/data/maps";
import { EmptyState, Section, UpdateBadge } from "@/components/shell/parts";
import { HBarChart } from "@/components/charts/hbar-chart";
import { MapBars } from "@/components/charts/map-bars";

/** 使われた場所：市の形の地図に縦棒＋一覧。企業向けは10件未満を「その他」に */
export function Places({ c, p, mode = "corp" }: { c: CaseData; p: Project; mode?: "corp" | "muni" }) {
  const place = breakdownOf(p, "place");
  const kind = breakdownOf(p, "kind");
  const fold = (rows: [string, number][]) =>
    mode === "corp" ? foldSmall(rows) : { rows: [...rows].sort((a, b) => b[1] - a[1]), foldedCount: 0 };
  const fp = place && place.rows.length ? fold(place.rows) : null;
  const fk0 = kind && kind.rows.length ? fold(kind.rows) : null;
  // 種類が多いときは上位7つ＋その他
  const fk = fk0 && fk0.rows.length > 8 ? { ...fk0, rows: topN(fk0.rows, 7) } : fk0;
  const folded = (fp?.foldedCount ?? 0) + (fk?.foldedCount ?? 0);
  const shape = c.id === "matsumoto" ? MATSUMOTO_MAP : SAPPORO_MAP;
  const unit = c.unit === "世帯" ? "枚" : "件";
  // 地区が多い市（松本）は、一覧も地図と同じ地域にまとめる
  const groups = shape.groups;
  const groupRows = (rows: [string, number][]) => {
    const m = new Map<string, number>();
    for (const [k, v] of rows) m.set(groups?.[k] ?? k, (m.get(groups?.[k] ?? k) ?? 0) + v);
    return [...m.entries()].sort((a, b) => b[1] - a[1]) as [string, number][];
  };
  const listRows = groups && place ? groupRows(place.rows).filter(([, v]) => mode === "muni" || v >= 10) : fp?.rows;
  const members = groups ? Object.entries(groups).reduce<Record<string, string[]>>((a, [d, g]) => ((a[g] ??= []).push(d), a), {}) : null;
  const placeTotal = fp ? sum(fp.rows.map(([, v]) => v)) : 0;
  const onMap = fp ? fp.rows.filter(([k]) => k !== "その他") : [];
  const other = fp?.rows.find(([k]) => k === "その他");

  return (
    <Section
      // 松本は会員の住まい（登録の地区）で数え、さっぽろは使ったお店の市町村で数える（src/lib/derive.ts）
      title={c.id === "matsumoto" ? "使った人の住まい" : "使われた場所"}
      meta={<UpdateBadge kind={mode === "corp" ? "daily" : "live"} text={mode === "corp" ? "1日1回更新・本日 6:00 時点" : undefined} />}
    >
      {!fp && !fk ? (
        <EmptyState title="まだ集計できる利用がありません">利用がたまると、ここに反映されます。</EmptyState>
      ) : (
        <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          {fp && (
            <div>
              <h4 className="mb-2 text-[13px] font-medium text-muted-foreground">
                {shape.groups ? "地域別" : `${c.placeWord}別`}<span className="mx-2 font-normal">{c.id === "matsumoto" ? "棒の高さ＝その地域に住む人が使った数" : "棒の高さ＝その市町村のお店で使われた数"}</span>
              </h4>
              <MapBars
                shape={shape}
                rows={shape.groups && place ? place.rows : onMap}
                minBar={mode === "corp" ? 10 : 0}
                unit={unit}
                total={placeTotal}
                label={`${c.placeWord}別-${p.id}`}
              />
              {shape.groups && <p className="mt-1 text-center text-xs text-muted-foreground">棒は地区を6つの地域にまとめたもの。細い線が地区の区切り（仮）</p>}
              {other && !shape.groups && (
                <p className="mt-2 text-center text-xs text-muted-foreground tnum">
                  地図にない「その他」：{fmt(other[1])}
                  {unit}
                </p>
              )}
            </div>
          )}
          <div className="space-y-6">
            {fp && (
              <div>
                <h4 className="mb-2 text-[13px] font-medium text-muted-foreground">{groups ? "地域別の一覧" : `${c.placeWord}別の一覧`}</h4>
                <HBarChart rows={listRows ?? []} unit={unit} showPct={false} />
                {members && (
                  <dl className="mt-3 space-y-1 text-[11px] leading-relaxed text-muted-foreground">
                    {Object.entries(members).map(([g, ds]) => (
                      <div key={g} className="flex gap-2">
                        <dt className="w-24 shrink-0 font-medium">{g}</dt>
                        <dd>{ds.join("・")}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            )}
            {fk && (
              <div>
                <h4 className="mb-2 text-[13px] font-medium text-muted-foreground">{c.kindWord}別</h4>
                <HBarChart rows={fk.rows} unit={unit} showPct={false} />
              </div>
            )}
          </div>
        </div>
      )}
      <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
        {mode === "corp"
          ? `10件未満の区分は「その他」にまとめ、まとめても10件未満なら表示しません${folded > 0 ? `（今回 ${folded}区分が該当）` : ""}。店ごとの地図や店名は出しません。`
          : "自治体の画面では10件未満の区分もそのまま表示します（企業の画面では「その他」にまとめます）。"}
        地区の境目は仮です。
      </p>
    </Section>
  );
}

function topN(rows: [string, number][], n: number): [string, number][] {
  const sorted = rows.filter(([k]) => k !== "その他").sort((a, b) => b[1] - a[1]);
  const rest = sum(sorted.slice(n).map(([, v]) => v)) + sum(rows.filter(([k]) => k === "その他").map(([, v]) => v));
  return [...sorted.slice(0, n), ["その他", rest]];
}
