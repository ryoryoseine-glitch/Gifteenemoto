import type { Breakdown, CaseData, Donor, Project } from "@/data/types";

/** 企業に出す区分の下限。これ未満は「その他」にまとめる */
export const MIN_CELL = 10;

export const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

export const cumulative = (a: number[]) => {
  let t = 0;
  return a.map((v) => (t += v));
};

/** 1世帯あたりの利用枚数の見積もり（元データがないときだけ使う） */
const usesPerHousehold = (p: Project) => 1 + p.repeat * 1.7;

/** 月ごとの「新しく利用した世帯」。元データがあればその値、なければ枚数から見積もる */
export function householdSeries(p: Project) {
  return p.usedHouseholds ?? p.used.map((v) => Math.round(v / usesPerHousehold(p)));
}

export function projectTotals(p: Project) {
  const received = sum(p.received);
  /** used＝使われた枚数（件数）。利用率には使わない */
  const used = sum(p.used);
  const usedHouseholds = sum(householdSeries(p));
  const last = p.months.length - 1;
  return {
    received,
    used,
    usedHouseholds,
    receiveRate: p.issued ? received / p.issued : 0,
    /** 利用率＝利用した世帯 ÷ 受け取った世帯（単位をそろえる） */
    useRate: received ? usedHouseholds / received : 0,
    thisMonthUsed: p.used[last] ?? 0,
    prevMonthUsed: p.used[last - 1] ?? 0,
    thisMonthReceived: p.received[last] ?? 0,
    prevMonthReceived: p.received[last - 1] ?? 0,
    prevYearReceived: p.receivedPrev ? sum(p.receivedPrev) : null,
    prevYearUsed: p.usedPrev ? sum(p.usedPrev) : null,
  };
}

/** 月末時点の利用率（累計の利用 ÷ 累計の受取） */
export function rateSeries(p: Project) {
  const r = cumulative(p.received);
  const u = cumulative(householdSeries(p));
  return r.map((v, i) => (v ? u[i] / v : 0));
}

export function donorTotal(c: CaseData, projectId: string, name?: string) {
  return sum(c.donors.filter((d) => d.projectId === projectId && (!name || d.name === name)).map((d) => d.amount));
}

/** 10件未満の区分を「その他」にまとめ、件数の多い順に並べる（企業向け） */
export function foldSmall(rows: [string, number][], min = MIN_CELL) {
  const big = rows.filter(([, v]) => v >= min).sort((a, b) => b[1] - a[1]);
  const small = rows.filter(([, v]) => v < min);
  const otherIdx = big.findIndex(([k]) => k === "その他");
  const smallSum = sum(small.map(([, v]) => v));
  let folded = big;
  if (smallSum > 0) {
    if (otherIdx >= 0) {
      folded = big.map(([k, v], i) => [k, i === otherIdx ? v + smallSum : v] as [string, number]);
    } else {
      folded = [...big, ["その他", smallSum] as [string, number]];
    }
  }
  // 「その他」は常に最後
  // まとめた「その他」自体が10件未満なら出さない
  const other = folded.filter(([k, v]) => k === "その他" && v >= min);
  return { rows: [...folded.filter(([k]) => k !== "その他"), ...other], foldedCount: small.length };
}

export function breakdownOf(p: Project, kind: Breakdown["kind"]) {
  return p.breakdowns.find((b) => b.kind === kind) ?? null;
}

/** 変化率（%）。比較できないときは null */
export function change(cur: number, prev: number | null | undefined) {
  if (prev == null || prev === 0) return null;
  return ((cur - prev) / prev) * 100;
}

const FY_MONTHS = ["4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月", "1月", "2月", "3月"];

function sumRows(list: [string, number][][]) {
  const m = new Map<string, number>();
  for (const rows of list) for (const [k, v] of rows) m.set(k, (m.get(k) ?? 0) + v);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

/** 複数のギフト（同じ年度）を1つにまとめる。前年の数字がないギフトが1つでもあれば前年比は出さない */
export function aggregateProjects(ps: Project[], name = "すべてのギフト"): Project {
  const months = FY_MONTHS.filter((m) => ps.some((p) => p.months.includes(m)));
  const at = (p: Project, arr: number[] | null, m: string) => {
    const i = p.months.indexOf(m);
    return i < 0 || !arr ? 0 : arr[i];
  };
  const allPrev = ps.every((p) => p.receivedPrev && p.usedPrev);
  const series = (pick: (p: Project) => number[] | null) => months.map((m) => sum(ps.map((p) => at(p, pick(p), m))));
  const kinds: Breakdown["kind"][] = ["place", "kind"];
  return {
    id: "all",
    name,
    icon: "layers",
    tone: "blue",
    goal: "",
    target: "",
    period: "",
    status: "active",
    budget: sum(ps.map((p) => p.budget)),
    unitValue: ps.length ? Math.round(sum(ps.map((p) => p.unitValue * sum(p.used))) / Math.max(1, sum(ps.map((p) => sum(p.used))))) : 0,
    issued: sum(ps.map((p) => p.issued)),
    months,
    received: series((p) => p.received),
    used: series((p) => p.used),
    usedHouseholds: series((p) => householdSeries(p)),
    receivedPrev: allPrev ? series((p) => p.receivedPrev) : null,
    usedPrev: allPrev ? series((p) => p.usedPrev) : null,
    breakdowns: kinds.map((k) => ({
      key: k,
      label: k,
      kind: k,
      rows: sumRows(ps.map((p) => breakdownOf(p, k)?.rows ?? [])),
    })),
    repeat: 0,
    tour: null,
    firstTime: null,
  };
}

type ExtraMap = Record<string, { received: number; used: number }>;

const addLast = (a: number[], n: number) => (n ? a.map((v, i) => (i === a.length - 1 ? v + n : v)) : a);

/** ギフト1つ分のデータ。事業の数字を weight で按分し、スマホで増えた分を足す（モック） */
export function giftProject(p: Project, d: Donor, extra: ExtraMap = {}): Project {
  const w = d.weight;
  const sc = (a: number[]) => a.map((v) => Math.round(v * w));
  const ex = extra[d.id] ?? { received: 0, used: 0 };
  return {
    ...p,
    issued: Math.round(p.issued * w),
    received: addLast(sc(p.received), ex.received),
    used: addLast(sc(p.used), ex.used),
    usedHouseholds: p.usedHouseholds ? sc(p.usedHouseholds) : undefined,
    receivedPrev: p.receivedPrev ? sc(p.receivedPrev) : null,
    usedPrev: p.usedPrev ? sc(p.usedPrev) : null,
    // 券種別は事業全体の内訳なので、ギフト1つの画面では出さない
    breakdowns: p.breakdowns.filter((b) => b.key !== "ticket").map((b) => ({ ...b, rows: b.rows.map(([k, v]) => [k, Math.round(v * w)] as [string, number]).filter(([, v]) => v > 0) })),
  };
}

/** 事業全体のデータ（スマホで増えた分を足す） */
export function projectWithExtra(p: Project, c: CaseData, extra: ExtraMap = {}): Project {
  const ids = c.donors.filter((d) => d.projectId === p.id).map((d) => d.id);
  const r = sum(ids.map((i) => extra[i]?.received ?? 0));
  const u = sum(ids.map((i) => extra[i]?.used ?? 0));
  return { ...p, received: addLast(p.received, r), used: addLast(p.used, u) };
}

/** 事業のアンケート集計。アンケートをしていない事業は null */
export function aggOf(c: CaseData, projectId: string) {
  const a = c.agg[projectId];
  return a && Array.isArray(a.sat) && sum(a.sat as number[]) > 0 ? a : null;
}

/**
 * 報告書の按分に使う事業費。中間＝予算（project.budget）、期末＝確定した事業費（funding の費目の合計）。
 * 確定の費目がまだないときは予算を使い、basis を「予算」にする。
 */
export function reportBudget(p: Project, kind: "mid" | "final"): { amount: number; basis: "予算" | "確定" } {
  const fixed = sum((p.funding?.items ?? []).map(([, v]) => v));
  return kind === "final" && fixed > 0 ? { amount: fixed, basis: "確定" } : { amount: p.budget, basis: "予算" };
}

/** 企業が支援している事業（案A：寄附の割合で按分）。share＝事業費に占める自社の寄附 */
export type Support = { base: Project; project: Project; amount: number; share: number; coupons: Donor[] };

export function corpSupports(c: CaseData, extra: ExtraMap = {}): Support[] {
  const mine = c.donors.filter((d) => d.name === c.corp.name);
  const ids = [...new Set(mine.map((d) => d.projectId))];
  return ids.map((pid) => {
    const base = c.projects.find((p) => p.id === pid)!;
    const amount = sum(mine.filter((d) => d.projectId === pid).map((d) => d.amount));
    return {
      base,
      project: projectWithExtra(base, c, extra),
      amount,
      share: Math.min(1, amount / base.budget),
      // 事業で配っているクーポン（券種）。企業ごとに分けない
      coupons: c.donors.filter((d) => d.projectId === pid),
    };
  });
}
