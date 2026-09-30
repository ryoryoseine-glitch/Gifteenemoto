import type { CaseData } from "@/data/types";
import type { RawData } from "@/data/raw/types";
import { analyze } from "@/lib/analysis";
import { TODAY, addDays, periodStats, periodsOf, rangeLabel } from "@/lib/period";
import { MIN_CELL } from "@/lib/metrics";

/**
 * 報告に使う項目（根拠：自治体の効果検証5件から「効果」だけを抜き出したもの）。
 * e街の発行〜消し込みの記録で出す6つと、使った直後のアンケートで取る項目。
 */
export type ItemKey = "useRate" | "given" | "users" | "where" | "who" | "compare" | "sat" | "add" | "first" | "again" | "spend";

export type ItemDef = { key: ItemKey; label: string; from: "e街の記録" | "アンケート"; cite: string };

export const ITEMS: ItemDef[] = [
  { key: "given", label: "配布した世帯", from: "e街の記録", cite: "三鷹市 p.68・四日市市 p.46" },
  { key: "users", label: "使用済み世帯", from: "e街の記録", cite: "世田谷区 p.3" },
  { key: "useRate", label: "利用率", from: "e街の記録", cite: "三鷹市 p.68・四日市市 p.46" },
  { key: "where", label: "どこで使われたか", from: "e街の記録", cite: "目黒区 p.3" },
  { key: "who", label: "誰に届いたか", from: "e街の記録", cite: "世田谷区 p.4〜5・目黒区 p.5" },
  { key: "compare", label: "比較（利用の数）", from: "e街の記録", cite: "世田谷区 p.3・三鷹市 p.68" },
  { key: "sat", label: "満足・やや満足", from: "アンケート", cite: "世田谷区 p.3" },
  { key: "add", label: "なければ利用しなかった", from: "アンケート", cite: "四日市市 p.110・目黒区 p.5" },
  { key: "first", label: "初めて利用した", from: "アンケート", cite: "目黒区 p.4・三鷹市 p.103" },
  { key: "again", label: "また利用したい", from: "アンケート", cite: "世田谷区 p.6・神奈川県 p.42" },
  { key: "spend", label: "ギフト以外に払った金額（1人あたり）", from: "アンケート", cite: "神奈川県 p.41〜42・世田谷区 p.2" },
];

/** 社内共有ページに最初から出す項目 */
export const DEFAULT_SHARED: Record<string, boolean> = { useRate: true, users: true, sat: true, add: true, again: true };

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : null);

/** 比較の相手。前年度は前年度実績（自治体が登録）の同じ月 */
export type CompareMode = "lastYear" | "prevQuarter" | "prevMonth";
export const COMPARE_OPTIONS: { value: CompareMode; label: string }[] = [
  { value: "lastYear", label: "前年度の同じ期間" },
  { value: "prevQuarter", label: "前の3か月" },
  { value: "prevMonth", label: "前の月" },
];

function compareOf(c: CaseData, raw: RawData, projectId: string, mode: CompareMode) {
  const p = c.projects.find((x) => x.id === projectId)!;
  const short = (l: string) => l.replace(/^\d+年/, "");
  if (mode === "lastYear") {
    const months = periodsOf(p, 1);
    if (!months.length) return null;
    const cur = { from: months[0].from, to: addDays(TODAY, 1) };
    const labels = months.map((m) => `${Number(m.from.slice(5, 7))}月`);
    const fy = Number(months[0].from.slice(0, 4)) - (Number(months[0].from.slice(5, 7)) < 4 ? 1 : 0);
    const base = raw.baselines.filter((b) => b.projectId === projectId && b.fiscalYear === fy - 1 && labels.includes(b.month));
    if (!base.length) return { nowLabel: `今年度 ${short(rangeLabel(cur.from, cur.to))}`, beforeLabel: "前年度", now: periodStats(c, raw, projectId, cur).uses, before: null };
    return {
      nowLabel: `今年度 ${labels[0]}〜${labels[labels.length - 1]}`,
      beforeLabel: "前年度の同じ期間",
      now: periodStats(c, raw, projectId, cur).uses,
      before: base.reduce((a, b) => a + b.used, 0),
    };
  }
  const pers = periodsOf(p, mode === "prevQuarter" ? 3 : 1);
  const cur = pers[pers.length - 1];
  const prev = pers[pers.length - 2];
  if (!cur) return null;
  return {
    nowLabel: short(cur.label),
    beforeLabel: prev ? short(prev.label) : "前の期間",
    now: periodStats(c, raw, projectId, cur).uses,
    before: prev ? periodStats(c, raw, projectId, prev).uses : null,
  };
}

/** クーポン（券種）で絞った元データ。チケット → 利用 → アンケートの順にたどる。前年度実績は事業単位なので外す */
export function rawForCoupon(raw: RawData, couponId: string | null): RawData {
  if (!couponId) return raw;
  const tickets = raw.tickets.filter((t) => t.couponTypeId === couponId);
  const ids = new Set(tickets.map((t) => t.ticketId));
  const redemptions = raw.redemptions.filter((r) => ids.has(r.ticketId));
  const rids = new Set(redemptions.map((r) => r.redemptionId));
  return { ...raw, tickets, redemptions, surveyResponses: raw.surveyResponses.filter((s) => rids.has(s.redemptionId)), baselines: [] };
}

export function itemValues(c: CaseData, raw: RawData, projectId: string, compareMode: CompareMode = "lastYear") {
  const hh = c.kind === "観光" ? "人" : "世帯";
  const { funnel, rows: whoRows } = analyze(c, raw, projectId, c.reg[0]?.key ?? "");
  const whoKnown = whoRows.filter((r) => r.value !== "ひもづけなし" && r.value !== "回答なし");
  const whoTotal = whoKnown.reduce((a, r) => a + r.receivedHH, 0);
  const who = whoKnown
    .filter((r) => r.receivedHH >= MIN_CELL)
    .sort((a, b) => b.receivedHH - a.receivedHH)
    .slice(0, 3)
    .map((r) => ({ value: r.value, share: whoTotal ? Math.round((r.receivedHH / whoTotal) * 1000) / 10 : 0 }));
  const resp = raw.surveyResponses.filter((s) => s.projectId === projectId);
  const n = resp.length;
  // 設問ごとの答えの分布（合計100%）。5段階は 5 → 1 の順
  const dist = (q: string) => {
    const def = c.questions.find((x) => x.id === q);
    const vs = resp.map((r) => r.answers[q]).filter((v) => v !== undefined);
    const labels = def?.type === "scale" ? ["5", "4", "3", "2", "1"] : (def?.opts ?? []);
    return labels.map((l) => ({ label: l, pct: pct(vs.filter((v) => String(v) === l).length, vs.length) ?? 0 }));
  };
  const share = (q: string, test: (v: unknown) => boolean) => {
    const vs = resp.map((r) => r.answers[q]).filter((v) => v !== undefined);
    return { v: pct(vs.filter(test).length, vs.length), n: vs.length, dist: dist(q) };
  };
  const addQ = c.questions.find((q) => q.id === "add");
  const firstQ = c.questions.find((q) => q.id === "first" || q.id === "firstvisit");
  const spends = resp.map((r) => r.answers.spend).filter((v): v is number => typeof v === "number");

  // どこで使われたか：加盟店の種類ごとの利用（枚）
  const tickets = new Set(raw.tickets.filter((t) => t.projectId === projectId).map((t) => t.ticketId));
  const shop = new Map(raw.shops.map((s) => [s.shopId, s]));
  const where = new Map<string, number>();
  for (const r of raw.redemptions) if (tickets.has(r.ticketId)) where.set(shop.get(r.shopId)?.category ?? "その他", (where.get(shop.get(r.shopId)?.category ?? "その他") ?? 0) + r.count);
  const whereRows = [...where.entries()].sort((a, b) => b[1] - a[1]);



  return {
    hh,
    responses: n,
    useRate: pct(funnel.usedHH, funnel.receivedHH),
    received: funnel.receivedHH,
    used: funnel.usedHH,
    where: whereRows,
    who,
    compare: compareOf(c, raw, projectId, compareMode),
    sat: share("sat", (v) => typeof v === "number" && v >= 4),
    add: addQ ? share("add", (v) => v === addQ.opts?.[addQ.opts.length - 1]) : null,
    first: firstQ ? share(firstQ.id, (v) => v === firstQ.opts?.[0]) : null,
    again: c.questions.some((q) => q.id === "again") ? share("again", (v) => typeof v === "number" && v >= 4) : null,
    spend: spends.length ? { v: Math.round(spends.reduce((a, b) => a + b, 0) / spends.length), n: spends.length } : null,
  };
}
