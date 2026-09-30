"use client";

import type { CaseData } from "@/data/types";
import { fmt, pctText, yen } from "@/lib/format";
import { ITEMS, itemValues, type ItemKey } from "@/lib/items";
import { useApp } from "@/store/useApp";

/** 社内共有ページ：寄附企業が「社内共有ページに公開」を選んだ項目だけを事業ごとに出す */
export function SharedNumbers({ c, projectIds }: { c: CaseData; projectIds: string[] }) {
  const raw = useApp((s) => s.raw[s.caseId]);
  const shared = useApp((s) => s.sharedItems);
  const compareMode = useApp((s) => s.compareMode);
  const shown = ITEMS.filter((it) => shared[it.key]);
  if (!shown.length || !projectIds.length) return null;
  const cards = projectIds.map((id) => ({ p: c.projects.find((x) => x.id === id)!, v: itemValues(c, raw, id, compareMode) }));
  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold">届いた先の数字</h2>
      <p className="mt-1 text-xs text-muted-foreground">{c.muni}の事業全体の数字。e街の利用の記録と使った直後のアンケートから</p>
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {cards.map(({ p, v }) => (
          <li key={p.id} className="rounded-xl border bg-card p-5">
            <p className="text-[13px] font-bold">{p.name}</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
              {shown.map((it) => {
                const text = shareText(it.key, v);
                if (!text) return null;
                return (
                  <div key={it.key} className={it.key === "where" || it.key === "who" ? "col-span-2" : ""}>
                    <dt className="text-xs text-muted-foreground">{it.label}</dt>
                    <dd className="mt-0.5 text-[20px] leading-snug font-bold tnum">{text}</dd>
                  </div>
                );
              })}
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">アンケート回答 {fmt(v.responses)}件</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function shareText(key: ItemKey, v: ReturnType<typeof itemValues>): string | null {
  const r = (x: { v: number | null } | null | undefined) => (x?.v == null ? null : pctText(x.v));
  switch (key) {
    case "useRate":
      return v.useRate == null ? null : pctText(v.useRate);
    case "given":
      return `${fmt(v.received)}${v.hh}`;
    case "users":
      return `${fmt(v.used)}${v.hh}`;
    case "compare":
      return v.compare && v.compare.before != null ? `${fmt(v.compare.before)} → ${fmt(v.compare.now)}枚（${v.compare.beforeLabel}と比べて）` : null;
    case "where":
      return v.where.length ? v.where.slice(0, 3).map(([k]) => k).join("・") : null;
    case "who":
      return v.who.length ? v.who.map((w) => `${w.value} ${pctText(w.share)}`).join("・") : null;
    case "sat":
      return r(v.sat);
    case "add":
      return r(v.add);
    case "first":
      return r(v.first);
    case "again":
      return r(v.again);
    case "spend":
      return v.spend ? yen(v.spend.v) : null;
  }
}
