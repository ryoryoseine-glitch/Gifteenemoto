import type { CaseData } from "@/data/types";
import type { RawData } from "@/data/raw/types";
import { analyze } from "@/lib/analysis";
import { periodStats, periodsOf } from "@/lib/period";
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
  { key: "compare", label: "前の期間との比較", from: "e街の記録", cite: "世田谷区 p.3・三鷹市 p.68" },
  { key: "sat", label: "満足・やや満足", from: "アンケート", cite: "世田谷区 p.3" },
  { key: "add", label: "なければ利用しなかった", from: "アンケート", cite: "四日市市 p.110・目黒区 p.5" },
  { key: "first", label: "初めて利用した", from: "アンケート", cite: "目黒区 p.4・三鷹市 p.103" },
  { key: "again", label: "また利用したい", from: "アンケート", cite: "世田谷区 p.6・神奈川県 p.42" },
  { key: "spend", label: "ギフト以外に払った金額（1人あたり）", from: "アンケート", cite: "神奈川県 p.41〜42・世田谷区 p.2" },
];

/** 社内共有ページに最初から出す項目 */
export const DEFAULT_SHARED: Record<string, boolean> = { useRate: true, users: true, sat: true, add: true, again: true };

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : null);

export function itemValues(c: CaseData, raw: RawData, projectId: string) {
  const p = c.projects.find((x) => x.id === projectId)!;
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
  const share = (q: string, test: (v: unknown) => boolean) => {
    const vs = resp.map((r) => r.answers[q]).filter((v) => v !== undefined);
    return { v: pct(vs.filter(test).length, vs.length), n: vs.length };
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

  // 前の期間との比較：3か月ごと、利用した世帯（新しく）
  const pers = periodsOf(p, 3);
  const cur = pers[pers.length - 1];
  const prev = pers[pers.length - 2];
  const now = cur ? periodStats(c, raw, projectId, cur) : null;
  const before = prev ? periodStats(c, raw, projectId, prev) : null;

  return {
    hh,
    responses: n,
    useRate: pct(funnel.usedHH, funnel.receivedHH),
    received: funnel.receivedHH,
    used: funnel.usedHH,
    where: whereRows,
    who,
    compare: now && before ? { label: cur.label.replace(/^\d+年/, ""), prevLabel: prev.label.replace(/^\d+年/, ""), now: now.newUsed, before: before.newUsed } : null,
    sat: share("sat", (v) => typeof v === "number" && v >= 4),
    add: addQ ? share("add", (v) => v === addQ.opts?.[addQ.opts.length - 1]) : null,
    first: firstQ ? share(firstQ.id, (v) => v === firstQ.opts?.[0]) : null,
    again: c.questions.some((q) => q.id === "again") ? share("again", (v) => typeof v === "number" && v >= 4) : null,
    spend: spends.length ? { v: Math.round(spends.reduce((a, b) => a + b, 0) / spends.length), n: spends.length } : null,
  };
}
