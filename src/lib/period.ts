import type { CaseData, Project } from "@/data/types";
import type { RawData } from "@/data/raw/types";
import { RAW_NOW, monthKeyOf, projectMonthKeys } from "@/data/raw/calendar";
import { voiceAttrs } from "@/lib/derive";
import { publicAttrs } from "@/lib/format";

/**
 * 報告の期間ごとの数字。元データ（e街の発行・利用の明細＋このサービスのアンケート）から、
 * 期間を区切って数える。月は "2026-07" の形で比べる。
 */

/** 報告の期間。from は含む・to は含まない（どちらも "YYYY-MM-DD"） */
export type Period = { key: string; label: string; from: string; to: string; partial: boolean };

const nextMonth = (k: string) => {
  const [y, m] = k.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
};
const monthLabel = (k: string) => `${Number(k.slice(5))}月`;

/** 事業の期間を span か月ごとに区切る（今より後の期間は出さない） */
export function periodsOf(p: Project, span: 1 | 3): Period[] {
  const keys = projectMonthKeys(p);
  const now = monthKeyOf(RAW_NOW);
  const out: Period[] = [];
  for (let i = 0; i < keys.length; i += span) {
    const ks = keys.slice(i, i + span);
    if (ks[0] > now) break;
    const last = ks[ks.length - 1];
    const label = ks.length === 1 ? `${ks[0].slice(0, 4)}年${monthLabel(ks[0])}` : `${ks[0].slice(0, 4)}年${monthLabel(ks[0])}〜${monthLabel(last)}`;
    out.push({ key: ks[0], label, from: `${ks[0]}-01`, to: `${nextMonth(last)}-01`, partial: last >= now });
  }
  return out;
}

export type PeriodStats = {
  /** この期間に初めて受け取った世帯 */
  newReceived: number;
  /** この期間に初めて利用した世帯 */
  newUsed: number;
  /** この期間の利用（枚） */
  uses: number;
  /** この期間のアンケート回答数 */
  responses: number;
  /** 満足・やや満足（5段階の上位2つ）の割合 % */
  satTop2: number | null;
  /** 「このクーポンがなければ利用しなかった」の割合 % */
  notWithout: number | null;
  /** 初めて利用した割合 % */
  first: number | null;
  /** また利用したい（5段階の上位2つ）の割合 % */
  again: number | null;
  /** 期間の終わりまでの累計 */
  totalReceived: number;
  totalUsed: number;
  /** 利用率（累計）＝利用した世帯 ÷ 受け取った世帯 % */
  useRate: number;
};

const inRange = (iso: string, from: string, to: string) => {
  const k = iso.slice(0, 10);
  return k >= from && k < to;
};

export function periodStats(c: CaseData, raw: RawData, projectId: string, per: Pick<Period, "from" | "to">): PeriodStats {
  const tourism = c.kind === "観光";
  const hh = new Map(raw.members.map((m) => [m.memberId, tourism ? m.memberId : m.householdId]));
  const hhOf = (memberId: string) => hh.get(memberId) ?? memberId;
  const ticketProject = new Map(raw.tickets.map((t) => [t.ticketId, t.projectId]));

  // 世帯ごとの「初めて」の月
  const firstRecv = new Map<string, string>();
  for (const t of raw.tickets) {
    if (t.projectId !== projectId || !t.receivedAt || !t.memberId) continue;
    const k = hhOf(t.memberId);
    const cur = firstRecv.get(k);
    if (!cur || t.receivedAt < cur) firstRecv.set(k, t.receivedAt);
  }
  const firstUse = new Map<string, string>();
  let uses = 0;
  for (const r of raw.redemptions) {
    if (ticketProject.get(r.ticketId) !== projectId) continue;
    const k = hhOf(r.memberId);
    const cur = firstUse.get(k);
    if (!cur || r.usedAt < cur) firstUse.set(k, r.usedAt);
    if (inRange(r.usedAt, per.from, per.to)) uses += r.count;
  }
  const count = (m: Map<string, string>, from: string) => [...m.values()].filter((v) => inRange(v, from, per.to)).length;

  const resp = raw.surveyResponses.filter((s) => s.projectId === projectId && inRange(s.answeredAt, per.from, per.to));
  const satQ = c.questions.find((q) => q.id === "sat");
  const addQ = c.questions.find((q) => q.id === "add");
  const sats = satQ ? resp.map((s) => s.answers.sat).filter((v): v is number => typeof v === "number") : [];
  const adds = addQ ? resp.map((s) => s.answers.add).filter((v): v is string => typeof v === "string") : [];
  const lastOpt = addQ?.opts?.[addQ.opts.length - 1];
  const firstQ = c.questions.find((q) => q.id === "first" || q.id === "firstvisit");
  const firsts = firstQ ? resp.map((s) => s.answers[firstQ.id]).filter((v): v is string => typeof v === "string") : [];
  const agains = resp.map((s) => s.answers.again).filter((v): v is number => typeof v === "number");
  const rate = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : null);

  const totalReceived = count(firstRecv, "0000-00");
  const totalUsed = count(firstUse, "0000-00");
  return {
    newReceived: count(firstRecv, per.from),
    newUsed: count(firstUse, per.from),
    uses,
    responses: resp.length,
    satTop2: sats.length ? Math.round((sats.filter((v) => v >= 4).length / sats.length) * 1000) / 10 : null,
    notWithout: adds.length ? Math.round((adds.filter((v) => v === lastOpt).length / adds.length) * 1000) / 10 : null,
    first: rate(firsts.filter((v) => v === firstQ?.opts?.[0]).length, firsts.length),
    again: rate(agains.filter((v) => v >= 4).length, agains.length),
    totalReceived,
    totalUsed,
    useRate: totalReceived ? Math.round((totalUsed / totalReceived) * 1000) / 10 : 0,
  };
}

/** 期間中に公開に同意した声（企業に見せる形にぼかした属性つき）。新しい順 */
export function periodVoices(c: CaseData, raw: RawData, projectId: string, per: Pick<Period, "from" | "to">, hidden: Record<string, boolean> = {}) {
  const member = new Map(raw.members.map((m) => [m.memberId, m]));
  return raw.surveyResponses
    .filter((s) => s.projectId === projectId && s.publish && s.comment.trim() && !hidden[s.responseId] && inRange(s.answeredAt, per.from, per.to))
    .sort((a, b) => (a.answeredAt < b.answeredAt ? 1 : -1))
    .map((s) => ({ id: s.responseId, text: s.comment.trim(), attrs: publicAttrs(c.id, voiceAttrs(c, member.get(s.memberId))), at: s.answeredAt }));
}

/* ---------------- 自由な期間 ---------------- */

const DAY = 86_400_000;
const toMs = (d: string) => Date.parse(`${d}T00:00:00Z`);
const fromMs = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (d: string, n: number) => fromMs(toMs(d) + n * DAY);
/** モックの「今日」 */
export const TODAY = RAW_NOW.slice(0, 10);

/** 日付の表示。to は含まない日 */
export function rangeLabel(from: string, to: string) {
  const last = addDays(to, -1);
  const f = (d: string, withYear: boolean) => `${withYear ? `${Number(d.slice(0, 4))}年` : ""}${Number(d.slice(5, 7))}月${Number(d.slice(8, 10))}日`;
  return `${f(from, true)}〜${f(last, last.slice(0, 4) !== from.slice(0, 4))}`;
}

/** 同じ長さの、すぐ前の期間 */
export function previousRange(from: string, to: string) {
  const len = Math.round((toMs(to) - toMs(from)) / DAY);
  return { from: addDays(from, -len), to: from };
}
