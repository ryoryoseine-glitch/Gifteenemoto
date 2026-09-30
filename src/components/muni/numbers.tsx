"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmt, pctText, yen } from "@/lib/format";
import { analyze, attrOptions } from "@/lib/analysis";
import { ITEMS, itemValues, type ItemKey } from "@/lib/items";
import { useApp, useCase } from "@/store/useApp";
import { PageHeader, Section } from "@/components/shell/parts";
import { VoicesGrid } from "@/components/insight/voices-grid";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** 自治体：決めた項目の数字と声（giftee Survey のダッシュボードを流用する想定）。項目ごとに社内共有ページに出すかを選ぶ */
export function Numbers() {
  const c = useCase();
  const raw = useApp((s) => s.raw[s.caseId]);
  const shared = useApp((s) => s.sharedItems);
  const toggle = useApp((s) => s.toggleSharedItem);
  const [pid, setPid] = useState(c.projects.find((p) => p.status === "active")?.id ?? c.projects[0].id);
  const projectId = c.projects.some((p) => p.id === pid) ? pid : c.projects[0].id;
  const v = itemValues(c, raw, projectId);
  const attrs = attrOptions(c);
  const [attr, setAttr] = useState(attrs[0]?.key ?? "");
  const attrKey = attrs.some((a) => a.key === attr) ? attr : attrs[0].key;
  const who = analyze(c, raw, projectId, attrKey).rows.filter((r) => r.value !== "ひもづけなし");
  const whoMax = Math.max(1, ...who.map((r) => r.receivedHH));
  const whereMax = Math.max(1, ...v.where.map(([, n]) => n));
  const items = c.projects.map((p) => ({ value: p.id, label: p.name }));
  const hh = v.hh;

  const value: Record<ItemKey, { main: string; foot: string } | null> = {
    useRate: v.useRate == null ? null : { main: pctText(v.useRate), foot: `利用した${hh} ${fmt(v.used)} ÷ 受け取った${hh} ${fmt(v.received)}` },
    unused: { main: `${fmt(v.unused)}${hh}`, foot: `受け取ったが、まだ使っていない${hh}` },
    users: { main: `${fmt(v.used)}${hh}`, foot: "一度でも消し込みがあった" },
    where: null,
    who: null,
    compare: v.compare ? { main: `${fmt(v.compare.now)}${hh}`, foot: `新しく利用した${hh}。${v.compare.prevLabel} ${fmt(v.compare.before)}${hh}` } : null,
    sat: v.sat.v == null ? null : { main: pctText(v.sat.v), foot: `5段階の上位2つ（回答 ${fmt(v.sat.n)}）` },
    add: v.add?.v == null ? null : { main: pctText(v.add.v), foot: `回答 ${fmt(v.add.n)}` },
    first: v.first?.v == null ? null : { main: pctText(v.first.v), foot: `回答 ${fmt(v.first.n)}` },
    again: v.again?.v == null ? null : { main: pctText(v.again.v), foot: `5段階の上位2つ（回答 ${fmt(v.again.n)}）` },
    spend: v.spend ? { main: yen(v.spend.v), foot: `回答の合計 ÷ 回答数（${fmt(v.spend.n)}）` } : null,
  };
  const tiles = ITEMS.filter((it) => it.key !== "where" && it.key !== "who" && value[it.key]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={`${c.muni}・giftee Survey のダッシュボードを流用する想定`}
        title="数字と声"
        sub="e街の発行〜消し込みの記録と、使った直後のアンケートの結果。チェックした項目が寄附企業の社内共有ページに出る"
        actions={
          <Select items={items} value={projectId} onValueChange={(x) => x && setPid(x as string)}>
            <SelectTrigger className="min-w-[260px] bg-card" aria-label="事業">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {items.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((it) => {
          const x = value[it.key]!;
          return (
            <li key={it.key} className="flex flex-col rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13px] font-medium">{it.label}</p>
                <SourceTag from={it.from} />
              </div>
              <p className="mt-1 text-[26px] leading-tight font-bold tnum">{x.main}</p>
              <p className="mt-0.5 flex-1 text-xs text-muted-foreground">{x.foot}</p>
              <ShareToggle on={!!shared[it.key]} onClick={() => toggle(it.key)} />
            </li>
          );
        })}
      </ul>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title={<span className="flex items-center gap-2">誰に届いたか <SourceTag from="e街の記録" /></span>} meta={<ShareToggle on={!!shared.who} onClick={() => toggle("who")} compact />} bodyClassName="p-0">
          <div className="flex flex-wrap gap-1.5 border-b px-5 py-2.5">
            {attrs.map((a) => (
              <button
                key={a.key}
                type="button"
                aria-pressed={a.key === attrKey}
                onClick={() => setAttr(a.key)}
                className={a.key === attrKey ? "rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-primary-foreground" : "rounded-full border px-3 py-0.5 text-xs text-muted-foreground hover:text-foreground"}
              >
                {a.label}
              </button>
            ))}
          </div>
          <Bars rows={who.map((r) => [r.value, r.receivedHH])} max={whoMax} unit={hh} />
          <p className="border-t px-5 py-2 text-xs text-muted-foreground">受け取った{hh}を会員情報の登録項目で分けたもの</p>
        </Section>
        <Section title={<span className="flex items-center gap-2">どこで使われたか <SourceTag from="e街の記録" /></span>} meta={<ShareToggle on={!!shared.where} onClick={() => toggle("where")} compact />} bodyClassName="p-0">
          <Bars rows={v.where.slice(0, 8)} max={whereMax} unit="枚" />
          <p className="border-t px-5 py-2 text-xs text-muted-foreground">消し込みのあった加盟店の種類ごと</p>
        </Section>
      </div>

      <Section title={<span className="flex items-center gap-2">声 <SourceTag from="アンケート" /></span>} meta={<span className="text-xs text-muted-foreground">公開に同意した声は社内共有ページに出る。不適切なものは「企業に出さない」</span>}>
        <VoicesGrid c={c} projectIds={[projectId]} showGift mode="muni" pageSize={6} />
      </Section>
    </div>
  );
}

function SourceTag({ from }: { from: string }) {
  return (
    <span className={cn("shrink-0 rounded px-1.5 py-px text-[10px] font-bold", from === "アンケート" ? "bg-orange-soft text-orange" : "bg-brand-soft text-brand")}>{from}</span>
  );
}

function ShareToggle({ on, onClick, compact }: { on: boolean; onClick: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      onClick={onClick}
      className={cn("inline-flex items-center gap-1.5 self-start text-xs", !compact && "mt-3 border-t pt-2.5 self-stretch", on ? "font-bold text-brand" : "text-muted-foreground")}
    >
      <span className={cn("grid size-4 place-items-center rounded border", on ? "border-brand bg-brand text-white" : "border-muted-foreground/50")}>{on && <Check className="size-3" />}</span>
      社内共有ページに出す
    </button>
  );
}

function Bars({ rows, max, unit }: { rows: [string, number][]; max: number; unit: string }) {
  return (
    <ul className="space-y-1.5 px-5 py-3 text-[13px]">
      {rows.map(([k, n]) => (
        <li key={k} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3">
          <span className="truncate">{k}</span>
          <span className="h-2 rounded-full bg-brand/70" style={{ width: `${Math.max(2, (n / max) * 100)}%` }} />
          <span className="text-right tnum text-muted-foreground">
            {fmt(n)}
            {unit}
          </span>
        </li>
      ))}
    </ul>
  );
}
