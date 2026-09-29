import type { CaseData } from "@/data/types";
import type { Member, RawData } from "@/data/raw/types";
import { MATSUMOTO_MAP } from "@/data/maps";

/**
 * e街で取れる「発行 → 受け取り → 利用」の数と、アンケート（giftee Survey）の回答を、
 * 会員情報（登録項目）で分けて見るための集計。会員IDでひもづかない行は「ひもづけなし」に入る。
 */

export type Funnel = {
  issued: number;
  received: number;
  used: number;
  answered: number;
  receivedHH: number;
  usedHH: number;
  /** 会員情報とひもづいた利用の割合 % */
  linked: number;
};

export type AttrRow = { value: string; receivedHH: number; usedHH: number; useRate: number; answered: number; satTop2: number | null };

/** 分けられる項目（登録項目から）。松本の地区は6地域に、子どもの人数はいちばん下の子の区分にまとめる */
export function attrOptions(c: CaseData) {
  return c.reg.map((r) => ({
    key: r.key,
    label: r.key === "area" ? "お住まいの地域（地区を6つにまとめる）" : r.key === "kids" ? "いちばん下のお子さん" : r.label,
  }));
}

function attrValue(c: CaseData, key: string, m: Member | undefined): string {
  if (!m) return "ひもづけなし";
  const v = m.answers[key] ?? "";
  if (key === "kids") {
    const bands = c.reg.find((r) => r.key === "kids")?.bands ?? [];
    const i = v.split(",").findIndex((n) => Number(n) > 0);
    return bands[i] ?? "回答なし";
  }
  if (key === "area" && c.id === "matsumoto") return MATSUMOTO_MAP.groups?.[v] ?? (v || "回答なし");
  return v || "回答なし";
}

export function analyze(c: CaseData, raw: RawData, projectId: string, key: string) {
  const tourism = c.kind === "観光";
  const member = new Map(raw.members.map((m) => [m.memberId, m]));
  const hhOf = (id: string) => (tourism ? id : (member.get(id)?.householdId ?? id));
  const tickets = raw.tickets.filter((t) => t.projectId === projectId);
  const ticketIds = new Set(tickets.map((t) => t.ticketId));
  const reds = raw.redemptions.filter((r) => ticketIds.has(r.ticketId));
  const resp = raw.surveyResponses.filter((s) => s.projectId === projectId);

  const recvHH = new Map<string, string>(); // 世帯 → 代表の会員
  for (const t of tickets) if (t.receivedAt && t.memberId && !recvHH.has(hhOf(t.memberId))) recvHH.set(hhOf(t.memberId), t.memberId);
  const usedHH = new Map<string, string>();
  for (const r of reds) if (!usedHH.has(hhOf(r.memberId))) usedHH.set(hhOf(r.memberId), r.memberId);

  const funnel: Funnel = {
    issued: tickets.length,
    received: tickets.filter((t) => t.receivedAt).length,
    used: reds.reduce((a, r) => a + r.count, 0),
    answered: resp.length,
    receivedHH: recvHH.size,
    usedHH: usedHH.size,
    linked: reds.length ? Math.round((reds.filter((r) => member.has(r.memberId)).length / reds.length) * 1000) / 10 : 0,
  };

  const rows = new Map<string, { r: number; u: number; a: number; sat: number[] }>();
  const row = (v: string) => rows.get(v) ?? rows.set(v, { r: 0, u: 0, a: 0, sat: [] }).get(v)!;
  for (const id of recvHH.values()) row(attrValue(c, key, member.get(id))).r++;
  for (const id of usedHH.values()) row(attrValue(c, key, member.get(id))).u++;
  for (const s of resp) {
    const x = row(attrValue(c, key, member.get(s.memberId)));
    x.a++;
    if (typeof s.answers.sat === "number") x.sat.push(s.answers.sat);
  }
  // 選択肢の順（登録項目の順）で並べる
  const order = key === "area" && c.id === "matsumoto" ? Object.keys(MATSUMOTO_MAP.groupAnchors ?? {}) : key === "kids" ? (c.reg.find((r) => r.key === "kids")?.bands ?? []) : (c.reg.find((r) => r.key === key)?.opts ?? []);
  const rank = (v: string) => {
    const i = order.indexOf(v);
    return i < 0 ? order.length + (v === "ひもづけなし" ? 2 : 1) : i;
  };
  const attrRows: AttrRow[] = [...rows.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]))
    .map(([value, x]) => ({
      value,
      receivedHH: x.r,
      usedHH: x.u,
      useRate: x.r ? Math.round((x.u / x.r) * 1000) / 10 : 0,
      answered: x.a,
      satTop2: x.sat.length ? Math.round((x.sat.filter((v) => v >= 4).length / x.sat.length) * 1000) / 10 : null,
    }));
  return { funnel, rows: attrRows };
}
