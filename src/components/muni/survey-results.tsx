"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { fmt, pct, pctText } from "@/lib/format";
import { aggOf, projectTotals, projectWithExtra, sum } from "@/lib/metrics";
import type { Question } from "@/data/types";
import { useApp, useCase, useExtra } from "@/store/useApp";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, Section, UpdateBadge } from "@/components/shell/parts";
import { HBarChart } from "@/components/charts/hbar-chart";
import { VoicesGrid } from "@/components/insight/voices-grid";

/** ⑦ アンケートの結果：設問ごとの集計と、受け取った人の声 */
export function SurveyResults() {
  const c = useCase();
  const extra = useExtra();
  const caseId = useApp((s) => s.caseId);
  const chosen = useApp((s) => s.muniProject[caseId]);
  const setProject = useApp((s) => s.setMuniProject);
  const withSurvey = c.projects.filter((p) => aggOf(c, p.id));
  const main = withSurvey.find((p) => p.id === chosen) ?? withSurvey[0];
  const agg = aggOf(c, main.id)!;
  const used = projectTotals(projectWithExtra(main, c, extra)).used;
  const sat = (agg.sat as number[] | undefined) ?? [0, 0, 0, 0, 0];
  const answered = sum(sat);
  const top2 = pct(sat[3] + sat[4], answered);
  const add = (agg.add as number[] | undefined) ?? [0, 0, 0];
  const notWithout = pct(add[2], sum(add));
  const notWithoutWide = pct(add[2] + add[1], sum(add));
  const qs = c.questions.filter((q) => q.type !== "text");
  const items = withSurvey.map((p) => ({ value: p.id, label: p.name }));
  const noSurvey = c.projects.filter((p) => !aggOf(c, p.id));

  return (
    <div>
      <PageHeader
        eyebrow={c.muni}
        title="アンケートの結果"
        sub={
          <>
            事業ごとの集計・設問は
            <Link href="/muni/settings" className="mx-1 text-link hover:underline">
              設定 → アンケート
            </Link>
            で変更
          </>
        }
        actions={
          <>
            <Select items={items} value={main.id} onValueChange={(v) => v && setProject(v as string)}>
              <SelectTrigger className="min-w-[220px] bg-card" aria-label="事業の切り替え">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false} align="end">
                {items.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <UpdateBadge kind="live" />
          </>
        }
      />
      {noSurvey.length > 0 && (
        <p className="-mt-3 mb-4 text-xs text-muted-foreground">アンケートをしていない事業：{noSurvey.map((p) => p.name).join("、")}</p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="回答数" value={fmt(answered)} note={`回答率 ${pctText(pct(answered, used))}（利用 ${fmt(used)}回のうち）`} />
        <Stat label="満足・やや満足" value={pctText(top2)} note="5段階の上位2つの割合（観光庁DMOの定義）" />
        <Stat
          label={c.kind === "観光" ? "ギフトがなければ来なかった（追加性）" : "クーポンがなければ利用しなかった（追加性）"}
          value={pctText(notWithout)}
          note={`「たぶん」も含めると ${pctText(notWithoutWide)}。比較：地域振興券 32%・定額給付金 25%・プレミアム付商品券 35.7%（内閣府 交付金の効果検証）`}
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {qs.map((q) => (
          <Section
            key={q.id}
            title={q.text}
            meta={
              q.locked ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Lock className="size-3" />
                  共通設問
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground">{q.share ? "企業の報告書に入れる" : "自治体だけ"}</span>
              )
            }
          >
            <Agg q={q} data={agg[q.id]} />
          </Section>
        ))}
      </div>

      <div className="mt-8">
        <VoicesGrid key={main.id} c={c} projectIds={[main.id]} showGift mode="muni" />
      </div>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3.5">
      <div className="text-[13px] text-muted-foreground">{label}</div>
      <div className="mt-1 text-[26px] leading-tight font-bold tnum">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{note}</div>
    </div>
  );
}

function Agg({ q, data }: { q: Question; data: number[] | Record<string, number> | undefined }) {
  if (!data || (Array.isArray(data) ? sum(data) : sum(Object.values(data))) === 0)
    return <p className="py-6 text-center text-xs text-muted-foreground">まだ回答がありません</p>;
  if (q.type === "scale" && Array.isArray(data)) {
    const total = sum(data);
    return (
      <>
        <p className="mb-3 text-[13px]">
          満足・やや満足 <b className="tnum">{pctText(pct(data[3] + data[4], total))}</b>
          <span className="ml-2 text-xs text-muted-foreground tnum">回答 {fmt(total)}</span>
        </p>
        <HBarChart
          rows={[
            ["5 満足", data[4]],
            ["4", data[3]],
            ["3", data[2]],
            ["2", data[1]],
            ["1 不満", data[0]],
          ]}
          unit="人"
        />
      </>
    );
  }
  if (q.type === "yen" && Array.isArray(data)) {
    const [total, n] = data;
    return (
      <div className="grid grid-cols-3 gap-3 py-2 text-center">
        <div>
          <div className="text-xs text-muted-foreground">1人あたり平均</div>
          <div className="text-[22px] font-bold tnum">{fmt(Math.round(total / Math.max(1, n)))}円</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">合計</div>
          <div className="text-[22px] font-bold tnum">{fmt(Math.round(total / 10000))}万円</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">回答</div>
          <div className="text-[22px] font-bold tnum">{fmt(n)}</div>
        </div>
        <p className="col-span-3 text-left text-xs text-muted-foreground">実際に払った分だけを聞いている（予定は含めない）。「なければ来なかった」人の分は、報告書で新規の消費として数える。</p>
      </div>
    );
  }
  if (q.type === "choice" && Array.isArray(data)) return <HBarChart rows={(q.opts ?? []).map((o, i) => [o, data[i] ?? 0])} unit="人" />;
  if (!Array.isArray(data)) return <HBarChart rows={Object.entries(data).sort((a, b) => b[1] - a[1])} unit="人" />;
  return null;
}
