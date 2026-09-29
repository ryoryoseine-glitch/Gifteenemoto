"use client";

import { fmt, pctText, yen } from "@/lib/format";
import { giftProject, projectTotals, sum } from "@/lib/metrics";
import { useCase, useExtra } from "@/store/useApp";
import { PageHeader, Section } from "@/components/shell/parts";
import { GiftPhoto } from "@/components/gift/gift-photo";
import { Badge } from "@/components/ui/badge";

/** 支援企業の情報：どの企業が、どのギフトに、いくら寄附しているか */
export function Sponsors() {
  const c = useCase();
  const extra = useExtra();
  const names = [...new Set(c.donors.map((d) => d.name))];
  return (
    <div>
      <PageHeader eyebrow={c.muni} title="支援企業の情報" sub={`寄附企業 ${names.length}社・寄附の合計 ${yen(sum(c.donors.map((d) => d.amount)))}`} />
      <div className="space-y-5">
        {names.map((n) => {
          const ds = c.donors.filter((d) => d.name === n);
          const isViewer = n === c.corp.name;
          return (
            <Section
              key={n}
              title={
                <span className="flex flex-wrap items-center gap-2">
                  {n}
                  {isViewer && <Badge variant="secondary">企業ダッシュボード利用中</Badge>}
                </span>
              }
              meta={<span className="text-[13px] font-bold tnum">{yen(sum(ds.map((d) => d.amount)))}</span>}
              bodyClassName="p-0"
            >
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-5 py-2 font-normal">ギフト</th>
                    <th className="hidden px-3 py-2 font-normal sm:table-cell">事業</th>
                    <th className="px-3 py-2 text-right font-normal">寄附額</th>
                    <th className="px-3 py-2 text-right font-normal">届いた数</th>
                    <th className="px-5 py-2 text-right font-normal">利用率</th>
                  </tr>
                </thead>
                <tbody>
                  {ds.map((d) => {
                    const base = c.projects.find((p) => p.id === d.projectId)!;
                    const t = projectTotals(giftProject(base, d, extra));
                    return (
                      <tr key={d.id} className="border-b last:border-b-0">
                        <td className="px-5 py-2.5">
                          <span className="flex items-center gap-3">
                            <GiftPhoto id={d.photo} className="size-10 shrink-0 rounded-md" />
                            <span className="font-medium">{d.giftName}</span>
                          </span>
                        </td>
                        <td className="hidden px-3 py-2.5 text-muted-foreground sm:table-cell">
                          {base.name}
                          {base.status === "closed" && "（終了）"}
                        </td>
                        <td className="px-3 py-2.5 text-right tnum">{yen(d.amount)}</td>
                        <td className="px-3 py-2.5 text-right tnum">
                          {fmt(t.received)}
                          {c.unit}
                        </td>
                        <td className="px-5 py-2.5 text-right tnum">{pctText(t.useRate * 100)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Section>
          );
        })}
      </div>
    </div>
  );
}
