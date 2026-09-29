"use client";

/* eslint-disable @next/next/no-img-element */
import { type ReactNode } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fmt, pct, pctText, publicAttrs, yen } from "@/lib/format";
import { aggOf, breakdownOf, foldSmall, projectTotals, reportBudget, sum } from "@/lib/metrics";
import type { CaseData, Donor, Kpi, Project } from "@/data/types";
import { MATSUMOTO_MAP } from "@/data/maps";
import { PHOTO_CREDITS } from "@/data/photos";
import { TrendChart } from "@/components/charts/trend-chart";
import { HBarChart } from "@/components/charts/hbar-chart";
import { GiftPhoto } from "@/components/gift/gift-photo";

export type ReportKind = "mid" | "final";

/** donor は「その企業がその事業で出したギフト」をまとめたもの。coupons はクーポン（ギフト）ごとの内訳 */
export type ReportInput = { c: CaseData; donor: Donor; base: Project; p: Project; kind: ReportKind; coupons: { donor: Donor; p: Project }[] };

/** 報告書で使う数字をまとめて計算する */
export function reportNumbers({ c, donor, base, p, kind }: ReportInput) {
  const t = projectTotals(p);
  const kids = c.kind === "子育て";
  // アンケートはこの事業のものだけを使う。していない事業は survey=false
  const agg = aggOf(c, base.id);
  const survey = !!agg;
  const sat = (agg?.sat as number[]) ?? [0, 0, 0, 0, 0];
  const satN = sum(sat);
  const top2 = pct(sat[3] + sat[4], satN);
  const add = (agg?.add as number[]) ?? [0, 0, 0];
  const addN = sum(add) || 1;
  const dead = pct(add[0], addN);
  const maybe = pct(add[1], addN);
  const notw = pct(add[2], addN);
  // 按分（案A）：事業費に占める貴社の寄附の割合。中間＝予算、期末＝確定した事業費
  const budget = reportBudget(base, kind);
  const giftBudget = budget.amount;
  const budgetBasis = budget.basis;
  const share = Math.min(1, donor.amount / giftBudget);
  // 世帯（観光は利用した会員）で数える成果。枚数・回数には掛けない
  const firstN = base.firstTime != null ? Math.round(t.usedHouseholds * base.firstTime) : null;
  const addUsers = survey ? Math.round(t.usedHouseholds * (add[2] / addN)) : 0;
  // 利用1世帯（観光は1人）あたりの寄附＝貴社の寄附 ÷ 按分した利用世帯
  const usedHouseholdsShare = t.usedHouseholds * share;
  const perHousehold = usedHouseholdsShare >= 1 ? donor.amount / usedHouseholdsShare : null;
  const respRate = pct(satN, projectTotals(base).used);
  // 前年度比：今年・前年とも事業全体の利用枚数（前年は baselines の前年度実績）
  const prevUsed = projectTotals(base).prevYearUsed;
  const yoy = prevUsed ? Math.round(((t.used - prevUsed) / prevUsed) * 100) : null;
  return { t, kids, agg, survey, top2, satN, dead, maybe, notw, giftBudget, budgetBasis, share, firstN, addUsers, usedHouseholdsShare, perHousehold, respRate, prevUsed, yoy };
}

/* ---------------- 紙面の部品 ---------------- */

export function Paper({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <article data-report-doc className={cn("mx-auto max-w-[820px] rounded-md border bg-card shadow-sm", className)}>
      {children}
    </article>
  );
}

function H({ n, children, note }: { n?: string; children: ReactNode; note?: ReactNode }) {
  return (
    <div className="mt-9 mb-3 flex flex-wrap items-baseline gap-x-3 border-b pb-1.5">
      <h3 className="text-[15px] font-bold">
        {n && <span className="mr-2 text-brand tnum">{n}</span>}
        {children}
      </h3>
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
    </div>
  );
}

function Tile({ v, l }: { v: string; l: string }) {
  return (
    <div className="rounded-lg border px-4 py-3">
      <div className="text-[22px] leading-tight font-bold tnum">{v}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{l}</div>
    </div>
  );
}

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <tr className="border-b last:border-b-0">
      <th className="w-[28%] bg-muted/50 px-3 py-2 text-left align-top text-xs font-medium text-muted-foreground">{k}</th>
      <td className="px-3 py-2 text-[13px]">{children}</td>
    </tr>
  );
}

/** 自治体が記入する欄。報告書はアプリでは原案まで作り、記入は書き出した Word の上で行う */
export function Fill({ placeholder, readOnly, preset }: { id?: string; placeholder: string; readOnly?: boolean; rows?: number; preset?: string }) {
  if (preset) return <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{preset}</p>;
  if (readOnly) return <p className="text-[13px] text-muted-foreground">（自治体が記入）</p>;
  return (
    <p data-fill className="rounded-md border border-dashed border-orange/60 bg-orange-soft/40 px-3 py-2.5 text-[13px] text-orange">
      【自治体が記入】{placeholder}
    </p>
  );
}

/** 報告書の場所別：松本は地区を6地域にまとめる */
function placeRows(c: CaseData, rows: [string, number][]) {
  const groups = c.id === "matsumoto" ? MATSUMOTO_MAP.groups : undefined;
  if (!groups) return foldSmall(rows).rows.slice(0, 6);
  const m = new Map<string, number>();
  for (const [k, v] of rows) m.set(groups[k] ?? k, (m.get(groups[k] ?? k) ?? 0) + v);
  return foldSmall([...m.entries()]).rows;
}

/** 受け取った人の内訳（モック：登録項目の分布を受取数に掛ける） */
function attrRows(c: CaseData, received: number): [string, [string, number][]][] {
  const split = (labels: string[], w: number[]) => {
    const tot = w.reduce((a, b) => a + b, 0);
    return labels.map((l, i) => [l, Math.round((received * w[i]) / tot)] as [string, number]);
  };
  if (c.id === "matsumoto")
    return [
      ["お子さんとの間柄", split(["母", "父", "祖父母", "その他"], [68, 24, 7, 1])],
      ["いちばん下のお子さん", split(["0〜2歳", "3〜5歳", "小学生"], [62, 30, 8])],
    ];
  return [
    ["お住まい", split(["さっぽろ圏内", "北海道（圏域の外）", "関東", "中部・近畿", "その他"], [12, 18, 38, 20, 12])],
    ["年代", split(["20代", "30代", "40代", "50代", "60代以上"], [14, 26, 28, 18, 14])],
  ];
}

/* ---------------- KPI の実績 ---------------- */

/** 地域再生計画の KPI の実績値（事業全体の値。モック） */
export function kpiActual(c: CaseData, base: Project, k: Kpi) {
  const t = projectTotals(base);
  const a = aggOf(c, base.id);
  switch (k.actual) {
    case "used":
      // 単位が「世帯」の KPI は利用した世帯、それ以外は利用枚数（件数）
      return k.unit === "世帯" ? t.usedHouseholds : t.used;
    case "received":
      return t.received;
    case "firstTime":
      return base.firstTime != null ? Math.round(t.usedHouseholds * base.firstTime) : null;
    case "tour":
      return base.tour != null ? Math.round(base.tour * 100) : null;
    case "isolation": {
      const v = a?.isolation as number[] | undefined;
      return v ? Math.round(((v[2] + v[3]) / sum(v)) * 100) : null;
    }
    case "satisfaction": {
      const v = a?.sat as number[] | undefined;
      return v ? Math.round(((v[3] + v[4]) / sum(v)) * 100) : null;
    }
  }
}

/** 進み具合（中間）：中間の目安に対して */
function progress(actual: number | null, k: Kpi) {
  if (actual == null) return { label: "集計中", tone: "text-muted-foreground" };
  const r = (actual - k.base) / Math.max(1, k.mid - k.base);
  if (k.mid <= k.base) return { label: actual >= k.mid ? "順調" : "やや遅れ", tone: actual >= k.mid ? "text-up" : "text-orange" };
  if (r >= 1) return { label: "順調", tone: "text-up" };
  if (r >= 0.8) return { label: "おおむね順調", tone: "text-foreground" };
  return { label: "遅れ", tone: "text-orange" };
}

function KpiTable({ c, base, kind }: { c: CaseData; base: Project; kind: ReportKind }) {
  const kpis = base.kpis ?? [];
  if (!kpis.length) return <p className="text-[13px] text-muted-foreground">この事業には、地域再生計画の KPI が登録されていません。</p>;
  return (
    <table className="w-full border text-[13px] tnum [&_td:not(:first-child)]:whitespace-nowrap [&_th]:whitespace-nowrap">
      <thead>
        <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
          <th className="px-3 py-2 font-medium">KPI（地域再生計画）</th>
          <th className="px-3 py-2 text-right font-medium">現状値</th>
          {kind === "mid" && <th className="px-3 py-2 text-right font-medium">中間の目安</th>}
          <th className="px-3 py-2 text-right font-medium">年度の目標</th>
          <th className="px-3 py-2 text-right font-medium">{kind === "mid" ? "9月末の値" : "実績"}</th>
          <th className="px-3 py-2 text-right font-medium">{kind === "mid" ? "進み具合" : "達成率"}</th>
        </tr>
      </thead>
      <tbody>
        {kpis.map((k) => {
          const a = kpiActual(c, base, k);
          // 期末はモックとして中間の値を年度に伸ばした見込み
          const v = a == null ? null : kind === "mid" ? a : k.unit === "%" ? a : Math.round(a * 1.4);
          const pr = progress(v, k);
          const rate = v == null ? null : Math.round((v / k.target) * 100);
          return (
            <tr key={k.name} className="border-b last:border-b-0">
              <td className="px-3 py-2">{k.name}</td>
              <td className="px-3 py-2 text-right">
                {fmt(k.base)}
                {k.unit}
              </td>
              {kind === "mid" && (
                <td className="px-3 py-2 text-right">
                  {fmt(k.mid)}
                  {k.unit}
                </td>
              )}
              <td className="px-3 py-2 text-right">
                {fmt(k.target)}
                {k.unit}
              </td>
              <td className="px-3 py-2 text-right font-bold">{v == null ? "—" : `${fmt(v)}${k.unit}`}</td>
              <td className={cn("px-3 py-2 text-right font-bold", kind === "mid" ? pr.tone : rate != null && rate >= 100 ? "text-up" : "")}>
                {kind === "mid" ? pr.label : rate == null ? "—" : `${rate}%`}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ---------------- 基本の報告書（自動＋自治体の記入） ---------------- */

export function BasicReport(input: ReportInput & { readOnly?: boolean }) {
  const { c, donor, base, p, kind, readOnly } = input;
  const n = reportNumbers(input);
  const isMid = kind === "mid";
  const key = `${c.id}-${donor.name}-${base.id}-${kind}`;
  const ids = input.coupons.map((x) => x.donor.id);
  const voices = c.voices.filter((v) => ids.includes(v.giftId) && !v.hidden);
  const themes = voices.reduce<Record<string, string[]>>((a, v) => ((a[v.theme] ??= []).push(`${v.text}（${publicAttrs(c.id, v.attrs)}）`), a), {});
  const place = breakdownOf(p, "place");
  const unit = c.unit === "世帯" ? "枚" : "件";
  const period = isMid ? "2026年4月1日〜9月30日" : "2026年4月1日〜2027年3月31日";
  const allDonors = [...new Set(c.donors.filter((d) => d.projectId === base.id).map((d) => d.name))].sort((a, b) => a.localeCompare(b, "ja"));
  const donationsTotal = sum(c.donors.filter((d) => d.projectId === base.id).map((d) => d.amount));
  const t0 = projectTotals(base);
  const spent = t0.used * base.unitValue;
  const { prevUsed, yoy } = n;
  const isolationQ = Array.isArray(n.agg?.isolation) ? (n.agg!.isolation as number[]) : null;
  const disclose = `${donor.name}は、${c.muni}の「${base.name}」（${base.plan ?? "地域再生計画"}）に、${donor.donatedOn ?? ""}${yen(donor.amount)}を寄附しました（企業版ふるさと納税）。事業は${isMid ? "2026年9月末までに" : "2026年度に"}${fmt(n.t.received)}${c.unit}に届き、${fmt(n.t.used)}${unit}使われました（事業費に占める同社の寄附の割合 ${pctText(n.share * 100)} で按分すると約${fmt(Math.round(n.t.received * n.share))}${c.unit}）。${n.survey ? `利用者の${pctText(n.top2)}が「満足」「やや満足」と回答し、${pctText(n.notw)}が「このクーポンがなければ利用しなかった」と回答しています。` : ""}`;

  return (
    <Paper>
      <div className="relative h-40 overflow-hidden rounded-t-md">
        <img src={`/city/${c.id}.jpg`} alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/10" />
        <div className="absolute bottom-4 left-8 text-white">
          <p className="text-xs text-white/80">
            {isMid ? "中間報告" : "期末報告"}（{period}）／{c.muni}
          </p>
          <h2 className="mt-1 text-[22px] font-bold">{base.name} 報告書</h2>
          <p className="mt-0.5 text-sm text-white/90">{donor.name} 様</p>
        </div>
      </div>
      <div className="px-6 pb-10 sm:px-10">
        <H n="1">{isMid ? "お礼と概況" : "お礼"}</H>
        <Fill
          id={`${key}-thanks`}
          readOnly={readOnly}
          rows={3}
          placeholder="お礼と概況"
          preset={
            isMid
              ? `このたびは「${base.name}」へのご寄附をいただき、ありがとうございました。上半期は${fmt(n.t.received)}${c.unit}にクーポンが届き、${fmt(n.t.used)}${unit}ご利用いただきました。後半も、必要な家庭に届くよう取り組みます。`
              : `2026年度の「${base.name}」へのご寄附に、心よりお礼申し上げます。1年間の取り組みと成果をご報告します。`
          }
        />

        <H>ハイライト</H>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile v={`${fmt(n.t.received)} ${c.unit}`} l="クーポンが届いた" />
          <Tile v={`${fmt(n.t.used)} ${unit}`} l="使われた" />
          <Tile v={n.survey ? pctText(n.top2) : "—"} l={n.survey ? `満足・やや満足（n=${fmt(n.satN)}）` : "満足度（アンケートなし）"} />
          <Tile v={isMid ? `${voices.length} 件` : yoy != null ? `${yoy >= 0 ? "+" : ""}${yoy}%` : "—"} l={isMid ? "届いた声（公開に同意）" : "利用の前年度比（事業全体）"} />
        </div>
        <p className="mt-2 rounded-md bg-muted/60 px-3 py-2 text-[12px] leading-relaxed">
          数字は事業全体（ほかの寄附企業・市の予算の分を含む）。寄附は事業全体の財源に入るため、貴社の分は事業費に占める寄附の割合
          <b className="mx-1 tnum">{pctText(n.share * 100)}</b>で按分して示します：届いた
          <b className="mx-1 tnum">
            約{fmt(Math.round(n.t.received * n.share))}
            {c.unit}
          </b>
          ・使われた
          <b className="mx-1 tnum">
            約{fmt(Math.round(n.t.used * n.share))}
            {unit}
          </b>
        </p>

        <H n="2">寄附と事業の概要</H>
        <table className="w-full border text-left">
          <tbody>
            <Row k="寄附">
              {donor.donatedOn ?? "—"}　{yen(donor.amount)}（企業版ふるさと納税・受領証の金額と同じ）
            </Row>
            <Row k="地域再生計画">{base.plan ?? "—"}</Row>
            <Row k="事業費と寄附">
              事業費 {yen(base.budget)}（{isMid ? "予算" : "確定は8を参照"}）／寄附の受領額 {yen(donationsTotal)}（全寄附企業）のうち貴社 {yen(donor.amount)}
            </Row>
            <Row k="事業の目標">{base.goal}</Row>
            <Row k="対象">{base.target}</Row>
            <Row k="期間">{base.period}</Row>
            <Row k="届けたギフト">
              <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {input.coupons.map(({ donor: d }) => (
                  <span key={d.id} className="flex items-center gap-2">
                    <GiftPhoto id={d.photo} className="size-9 shrink-0 rounded" />
                    {d.giftName}
                  </span>
                ))}
              </span>
            </Row>
            <Row k="地域の課題">
              <Fill id={`${key}-issue`} readOnly={readOnly} rows={2} placeholder="例：市内の3歳未満児のうち保育園等に通っていない子の割合、子育ての孤立感に関する市民調査の結果など" />
            </Row>
          </tbody>
        </table>

        <H n="3" note={isMid ? "9月末時点。進み具合は中間の目安に対して" : "年度の実績（モックでは見込み）"}>
          {isMid ? "目標と中間の実績" : "目標と実績"}
        </H>
        <KpiTable c={c} base={base} kind={kind} />
        <p className="mt-1.5 text-[11px] text-muted-foreground">KPI は事業全体の値（ほかの寄附企業の分と市の予算の分を含む）。</p>

        <H n="4" note="消し込みの記録から集計">
          直接の結果
        </H>
        <table className="w-full border text-center text-[13px] tnum">
          <thead>
            <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
              <th className="px-2 py-2 font-medium">配布</th>
              <th className="px-2 py-2 font-medium">受取（受取率）</th>
              <th className="px-2 py-2 font-medium">利用した{c.unit}（利用率）</th>
              <th className="px-2 py-2 font-medium">使われた{unit === "枚" ? "枚数" : "件数"}</th>
              <th className="px-2 py-2 font-medium">{n.kids ? "2回以上の利用" : "周遊（2市町村以上）"}</th>
              <th className="px-2 py-2 font-medium">アンケート回答</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-2 py-2">{fmt(p.issued)}</td>
              <td className="px-2 py-2">
                {fmt(n.t.received)}（{pctText(n.t.receiveRate * 100)}）
              </td>
              <td className="px-2 py-2">
                {fmt(n.t.usedHouseholds)}（{pctText(n.t.useRate * 100)}）
              </td>
              <td className="px-2 py-2">{fmt(n.t.used)}</td>
              <td className="px-2 py-2">{Math.round((p.tour ?? p.repeat) * 100)}%</td>
              <td className="px-2 py-2">{n.survey ? `n=${fmt(n.satN)}（回答率 ${pctText(n.respRate)}）` : "なし"}</td>
            </tr>
          </tbody>
        </table>

        <p className="mt-5 mb-1 text-xs font-medium text-muted-foreground">受け取った人の内訳（登録項目の集計・10件未満は出さない）</p>
        <table className="w-full border text-[13px] tnum">
          <tbody>
            {attrRows(c, n.t.received).map(([k, rows]) => (
              <tr key={k} className="border-b last:border-b-0">
                <th className="w-[28%] bg-muted/50 px-3 py-2 text-left text-xs font-medium text-muted-foreground">{k}</th>
                <td className="px-3 py-2">
                  {rows
                    .filter(([, v]) => v >= 10)
                    .map(([a, v]) => `${a} ${fmt(v)}`)
                    .join("　")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-5 mb-1 text-xs font-medium text-muted-foreground">クーポン（券種）ごとの数字・事業全体</p>
        <table className="w-full border text-[13px] tnum">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">クーポン</th>
              <th className="px-3 py-2 text-right font-medium">届いた</th>
              <th className="px-3 py-2 text-right font-medium">使われた</th>
              <th className="px-3 py-2 text-right font-medium">利用率</th>
            </tr>
          </thead>
          <tbody>
            {input.coupons.map(({ donor: d, p: cp }) => {
              const ct = projectTotals(cp);
              return (
                <tr key={d.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2.5">
                      <GiftPhoto id={d.photo} className="size-8 shrink-0 rounded" />
                      {d.giftName}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {fmt(ct.received)}
                    {c.unit}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {fmt(ct.used)}
                    {unit}
                  </td>
                  <td className="px-3 py-2 text-right">{pctText(ct.useRate * 100)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-5 grid gap-6 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">月別の利用（前年度は{c.id === "matsumoto" ? "紙のクーポンの実績" : "前年度の実績"}）</p>
            <TrendChart months={p.months} cur={p.used} prev={p.usedPrev} unit={unit} />
          </div>
          {place && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                {c.id === "matsumoto" ? "利用した世帯の住まい（地域別）" : `使われた場所（${c.placeWord}別）`}（10件未満は「その他」）
              </p>
              <HBarChart rows={placeRows(c, place.rows)} unit={unit} showPct={false} />
              <p className="mt-1 text-[11px] text-muted-foreground">
                {c.id === "matsumoto" ? "会員の登録住所の地区を6地域にまとめた集計。数は使われた枚数" : "加盟店の所在地の市町村で分けた集計。数は使われた件数"}
              </p>
            </div>
          )}
        </div>

        {!isMid && (
          <>
            <H n="5" note="前年度・利用の前と後">
              事業の前と後
            </H>
            <table className="w-full border text-[13px] tnum">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">項目</th>
                  <th className="px-3 py-2 text-right font-medium">前</th>
                  <th className="px-3 py-2 text-right font-medium">後</th>
                  <th className="px-3 py-2 font-medium">データ</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-3 py-2">利用（年度・事業全体）</td>
                  <td className="px-3 py-2 text-right">{prevUsed ? `${fmt(prevUsed)}${unit}` : "—"}</td>
                  <td className="px-3 py-2 text-right font-bold">
                    {fmt(n.t.used)}
                    {unit}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    前年度：{c.id === "matsumoto" ? "紙のクーポンの実績（市の記録）" : "e街の利用実績"}・事業全体／今年度：e街の利用実績・事業全体
                  </td>
                </tr>
                {isolationQ && (
                  <tr>
                    <td className="px-3 py-2">孤立感が「めったにない・たまにある」</td>
                    <td className="px-3 py-2 text-right">
                      <Fill id={`${key}-isolation-before`} readOnly={readOnly} placeholder="事業の前の割合（%）" />
                    </td>
                    <td className="px-3 py-2 text-right font-bold">{kpiActual(c, base, { name: "", unit: "%", base: 0, mid: 0, target: 0, actual: "isolation" })}%</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">前：自治体が記入（市民調査など、出どころを併記）／後：利用後のアンケート（n={fmt(sum(isolationQ))}）</td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}

        <H n={isMid ? "5" : "6"} note="公開に同意した声から、テーマ別に抜粋">
          受け取った人の声
        </H>
        {Object.keys(themes).length === 0 ? (
          <p className="text-[13px] text-muted-foreground">この期間に公開に同意した声はありません。</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(themes).map(([th, list]) => (
              <div key={th}>
                <p className="text-xs font-bold text-muted-foreground">
                  {th}（{list.length}件）
                </p>
                {list.slice(0, 2).map((t) => (
                  <p key={t} className="mt-1 border-l-2 border-orange/60 pl-3 text-[13px] leading-relaxed">
                    「{t.replace(/（[^（]*）$/, "")}」<span className="text-xs text-muted-foreground">{t.match(/（[^（]*）$/)?.[0]}</span>
                  </p>
                ))}
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs font-bold text-muted-foreground">{c.muniShort}の担当課から</p>
        <Fill id={`${key}-muni-voice`} readOnly={readOnly} rows={2} placeholder="担当課のコメント" />

        <H n={isMid ? "6" : "7"} note="転載の可否とクレジット">
          写真
        </H>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {input.coupons.map(({ donor: d }) => (
            <figure key={d.id}>
              <GiftPhoto id={d.photo} className="aspect-[4/3] w-full rounded" />
              <figcaption className="mt-1 text-[11px] text-muted-foreground">
                {d.giftName}（利用場面のイメージ）・転載：{readOnly ? "可（クレジット表記）" : "可／要相談を選ぶ"}
                {PHOTO_CREDITS[d.photo] && `・写真：${PHOTO_CREDITS[d.photo].author}`}
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">本番は、市・事業者が撮った利用場面の写真（写っている人の同意つき）を載せる。</p>

        {isMid ? (
          <>
            <H n="7">見えてきた課題と後半の取り組み</H>
            <Fill id={`${key}-next-half`} readOnly={readOnly} rows={3} placeholder="例：利用の少ない地区への周知、事業者の追加（うまくいかなかった点も書く）" />
            <H n="8">今後の予定</H>
            <Fill id={`${key}-schedule`} readOnly={readOnly} rows={2} preset={"2027年4月：期末報告\n希望があればインパクト評価（別冊）"} placeholder="" />
          </>
        ) : (
          <>
            <H n="8" note="確定した事業費と、寄附の充当">
              事業費と寄附
            </H>
            <table className="w-full border text-[13px] tnum">
              <tbody>
                {(base.funding?.items ?? []).map(([k, v]) => (
                  <tr key={k} className="border-b">
                    <th className="w-[45%] bg-muted/50 px-3 py-2 text-left text-xs font-medium text-muted-foreground">{k}</th>
                    <td className="px-3 py-2 text-right">{yen(v)}</td>
                  </tr>
                ))}
                <tr className="border-b font-bold">
                  <th className="bg-muted/50 px-3 py-2 text-left text-xs">事業費（確定）</th>
                  <td className="px-3 py-2 text-right">{yen(sum((base.funding?.items ?? []).map(([, v]) => v)) || base.budget)}</td>
                </tr>
                <tr className="border-b">
                  <th className="bg-muted/50 px-3 py-2 text-left text-xs font-medium text-muted-foreground">寄附の受領額（全寄附企業）</th>
                  <td className="px-3 py-2 text-right">{yen(donationsTotal)}</td>
                </tr>
                <tr className="border-b">
                  <th className="bg-muted/50 px-3 py-2 text-left text-xs font-medium text-muted-foreground">うち貴社分</th>
                  <td className="px-3 py-2 text-right font-bold">{yen(donor.amount)}</td>
                </tr>
                <tr>
                  <th className="bg-muted/50 px-3 py-2 text-left text-xs font-medium text-muted-foreground">そのほかの財源</th>
                  <td className="px-3 py-2 text-right">
                    {base.funding?.otherSource ?? "—"}　{yen(Math.max(0, (sum((base.funding?.items ?? []).map(([, v]) => v)) || base.budget) - donationsTotal))}
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="mt-1.5 text-[11px] text-muted-foreground">寄附はすべて事業に充当済み（寄附の受領額 ≦ 事業費）。使われた金額（精算データ）：{yen(spent)}。</p>
            <H n="9">外部の検証</H>
            <Fill id={`${key}-review`} readOnly={readOnly} rows={2} placeholder="例：地域再生計画の評価（外部有識者の会議）での意見" />
            <H n="10">次年度の方針</H>
            <Fill id={`${key}-next-year`} readOnly={readOnly} rows={3} placeholder="例：続けるか、目標値、改善点" />
          </>
        )}

        <H n={isMid ? "9" : "11"} note="五十音順。寄附額は各社の了解がある場合だけ">
          この事業を支える企業
        </H>
        <p className="text-[13px] leading-relaxed">{allDonors.join("、")}</p>

        <H n={isMid ? "10" : "12"} note="統合報告書・サステナビリティレポート・有価証券報告書に転記できる文">
          開示用の要約
        </H>
        <div className="relative rounded-md bg-muted/60 p-4 pr-12 text-[13px] leading-relaxed">
          {disclose}
          <button
            type="button"
            aria-label="コピー"
            onClick={() => {
              navigator.clipboard?.writeText(disclose);
              toast("開示用の要約をコピーしました");
            }}
            className="absolute top-3 right-3 grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
          >
            <Copy className="size-4" />
          </button>
        </div>
        <table className="mt-3 w-full border text-[12px]">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-muted-foreground">
              <th className="px-3 py-1.5 font-medium">開示の枠</th>
              <th className="px-3 py-1.5 font-medium">この報告書のどこを使うか</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["GRI 201-1（コミュニティ投資）", "2 寄附（寄附日・金額）"],
              ["GRI 203-1／203-2（間接的な経済インパクト）", "4 直接の結果、KPI の実績"],
              ["GRI 3-3（取り組みの管理・目標）", "3 目標と実績"],
              ["B4SI（インプット／アウトプット／インパクト）", "寄附額／直接の結果／初期成果（インパクト評価）"],
              ["有価証券報告書 サステナビリティ欄（重要性がある場合）", "開示用の要約、3 目標と実績"],
            ].map(([a, b]) => (
              <tr key={a} className="border-b last:border-b-0">
                <td className="px-3 py-1.5">{a}</td>
                <td className="px-3 py-1.5 text-muted-foreground">{b}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <H note="数字の定義と取り方">付録：算定方法とデータ元</H>
        <table className="w-full border text-[12px]">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-muted-foreground">
              <th className="px-3 py-1.5 font-medium">数字</th>
              <th className="px-3 py-1.5 font-medium">定義</th>
              <th className="px-3 py-1.5 font-medium">データ元</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["配布・受取・利用", `集計期間 ${period}。受取＝クーポンを受け取った数、利用＝お店・施設での消し込みの数`, "e街の発行実績・利用実績"],
              ["利用率", `1回以上使った${c.unit} ÷ 受け取った${c.unit}（どちらも${c.unit}で数える）。使われた枚数は内訳として別に示す`, "e街の利用実績（会員ID）"],
              [n.kids ? "受け取った世帯" : "受け取った件数", n.kids ? "世帯単位（1世帯に複数のアカウントがある場合の扱いは、ギフティに確認中）" : "会員（メールアドレス）単位", "e街の会員情報"],
              ["満足度", "5段階の上位2つ（満足・やや満足）の割合", "利用後のアンケート（このサービス）"],
              ["なければ利用しなかった", "共通設問で「利用しなかった」と答えた割合", "利用後のアンケート"],
              [
                "按分",
                `貴社の寄附 ÷ ${n.budgetBasis === "確定" ? "確定した事業費（8 の費目の合計）" : "事業費の予算"}（${yen(n.giftBudget)}）＝${pctText(n.share * 100)}。中間報告は予算、期末報告は確定した事業費で割る`,
                "寄附の受領証・事業費（自治体の記録）",
              ],
              c.id === "matsumoto"
                ? ["利用した世帯の住まい（地域別）", "利用した会員の登録住所の地区を6地域にまとめ、使われた枚数を数えた。店・施設の所在地ではない。10件未満の区分は「その他」", "e街の会員情報（登録住所）× 利用実績"]
                : [`使われた場所（${c.placeWord}別）`, `使われた加盟店の所在地の${c.placeWord}で、使われた件数を数えた。利用者の住まいではない。10件未満の区分は「その他」`, "e街の加盟店の情報 × 利用実績"],
              ["使われた金額", "精算データの合計", "e街の精算データ"],
            ].map(([a, b, d]) => (
              <tr key={a} className="border-b last:border-b-0">
                <td className="px-3 py-1.5 font-medium">{a}</td>
                <td className="px-3 py-1.5">{b}</td>
                <td className="px-3 py-1.5 text-muted-foreground">{d}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          限界：アンケートは答えた人だけの結果で、偏りがありうる。KPI は事業全体の値で、貴社の寄附だけの成果ではない。期末の値は締めた日の値を固定して使う。
        </p>

        <div className="mt-8 grid gap-2 rounded-md border p-4 text-[12px] sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground">公表の可否</p>
            <p className="font-medium">数値・声：可　写真：クレジット表記で可</p>
          </div>
          <div>
            <p className="text-muted-foreground">作成</p>
            <p className="font-medium">{c.muni} 担当課（仮）</p>
          </div>
          <div>
            <p className="text-muted-foreground">確認</p>
            <p className="font-medium">課長（仮）</p>
          </div>
          <div>
            <p className="text-muted-foreground">作成日</p>
            <p className="font-medium tnum">{isMid ? "2026年10月15日" : "2027年4月20日"}</p>
          </div>
        </div>
      </div>
    </Paper>
  );
}
