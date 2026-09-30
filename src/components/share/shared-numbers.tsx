"use client";

import type { CaseData } from "@/data/types";
import { fmt, pctText, yen } from "@/lib/format";
import { ITEMS, itemValues, type ItemKey } from "@/lib/items";
import { useApp } from "@/store/useApp";

type V = ReturnType<typeof itemValues>;

/** 寄附した事業をまとめる：世帯・枚数は合計、割合は回答数（利用率は配布した世帯）で重みをつける */
function combine(vs: V[]) {
  const sumOf = (f: (v: V) => number) => vs.reduce((a, v) => a + f(v), 0);
  const weighted = (pick: (v: V) => { v: number | null; n: number } | null) => {
    const xs = vs.map(pick).filter((x): x is { v: number; n: number } => !!x && x.v != null && x.n > 0);
    const n = xs.reduce((a, x) => a + x.n, 0);
    return n ? xs.reduce((a, x) => a + x.v * x.n, 0) / n : null;
  };
  const received = sumOf((v) => v.received);
  const used = sumOf((v) => v.used);
  const where = new Map<string, number>();
  for (const v of vs) for (const [k, n] of v.where) where.set(k, (where.get(k) ?? 0) + n);
  const cmp = vs.map((v) => v.compare).filter((x): x is NonNullable<V["compare"]> => !!x && x.before != null);
  return {
    hh: vs[0]?.hh ?? "世帯",
    given: received,
    users: used,
    useRate: received ? (used / received) * 100 : null,
    where: [...where.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k),
    who: vs[0]?.who ?? [],
    compare: cmp.length ? { now: cmp.reduce((a, x) => a + x.now, 0), before: cmp.reduce((a, x) => a + (x.before ?? 0), 0), label: cmp[0].beforeLabel } : null,
    sat: weighted((v) => v.sat),
    add: weighted((v) => v.add),
    first: weighted((v) => v.first),
    again: weighted((v) => v.again),
    spend: weighted((v) => v.spend),
  };
}

export type SharedStat = { key: ItemKey; label: string; value: string; wide: boolean };

/** 社内共有ページの写真の上に並べる、寄附企業が「社内共有ページに公開」を選んだ数字 */
export function useSharedStats(c: CaseData, projectIds: string[]): SharedStat[] {
  const raw = useApp((s) => s.raw[s.caseId]);
  const shared = useApp((s) => s.sharedItems);
  const compareMode = useApp((s) => s.compareMode);
  if (!projectIds.length) return [];
  const x = combine(projectIds.map((id) => itemValues(c, raw, id, compareMode)));
  const p = (v: number | null) => (v == null ? null : pctText(Math.round(v * 10) / 10));
  const text = (key: ItemKey): string | null => {
    switch (key) {
      case "given":
        return `${fmt(x.given)}${x.hh}`;
      case "users":
        return `${fmt(x.users)}${x.hh}`;
      case "useRate":
        return p(x.useRate);
      case "compare":
        return x.compare && x.compare.before ? `${x.compare.now >= x.compare.before ? "+" : ""}${Math.round(((x.compare.now - x.compare.before) / x.compare.before) * 100)}%` : null;
      case "where":
        return x.where.length ? x.where.join("・") : null;
      case "who":
        return x.who.length ? x.who.map((w) => `${w.value} ${pctText(w.share)}`).join("・") : null;
      case "sat":
        return p(x.sat);
      case "add":
        return p(x.add);
      case "first":
        return p(x.first);
      case "again":
        return p(x.again);
      case "spend":
        return x.spend == null ? null : yen(Math.round(x.spend));
    }
  };
  const label = (key: ItemKey, base: string) => (key === "compare" && x.compare ? `利用の数（${x.compare.label}と比べて）` : base);
  const out: SharedStat[] = [];
  for (const it of ITEMS) {
    if (!shared[it.key]) continue;
    const value = text(it.key);
    if (value) out.push({ key: it.key, label: label(it.key, it.label), value, wide: it.key === "where" || it.key === "who" });
  }
  return out;
}
