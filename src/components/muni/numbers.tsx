"use client";

import { Fragment, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmt, pctText, yen } from "@/lib/format";
import { analyze, attrOptions } from "@/lib/analysis";
import { ALL_COUPONS, COMPARE_OPTIONS, ITEMS, itemValues, withAllCoupons, type CompareMode, type ItemKey } from "@/lib/items";
import { CASE_OPTIONS } from "@/data";
import type { CaseId } from "@/data/types";
import { MIN_CELL } from "@/lib/metrics";
import { useApp, useCase } from "@/store/useApp";
import { PageHeader, Section } from "@/components/shell/parts";
import { VoicesGrid } from "@/components/insight/voices-grid";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** 自治体：決めた項目の数字と声（giftee Survey のダッシュボードを流用する想定）。企業のダッシュボード（mode="corp"）では、項目ごとに社内共有ページに公開するかを選ぶ */
export function Numbers({ mode = "muni" }: { mode?: "muni" | "corp" }) {
  const c = useCase();
  const corp = mode === "corp";
  // 企業は自社が寄附した事業だけ
  const mine = new Set(c.donors.filter((d) => d.name === c.corp.name).map((d) => d.projectId));
  const projects = corp ? c.projects.filter((p) => mine.has(p.id)) : c.projects;
  const raw = useApp((s) => s.raw[s.caseId]);
  const shared = useApp((s) => s.sharedItems);
  const toggle = useApp((s) => s.toggleSharedItem);
  const [pid, setPid] = useState<string>(ALL_COUPONS);
  const projectId = pid === ALL_COUPONS || projects.some((p) => p.id === pid) ? pid : projects[0].id;
  const compareMode = useApp((s) => s.compareMode);
  const setCompareMode = useApp((s) => s.setCompareMode);
  // 1段目は事業（子育て支援・観光支援）、2段目はその下のクーポン
  const cases = useApp((s) => s.cases);
  const setCase = useApp((s) => s.setCase);
  const businessItems = (corp ? CASE_OPTIONS.filter((o) => o.value === c.id) : CASE_OPTIONS).map((o) => ({ value: o.value, label: `${cases[o.value].kind}支援事業（${cases[o.value].muniShort}）` }));
  // 「すべてのクーポン」はその事業の中のクーポン全部（企業は自社が寄附したものの全部）
  const all = pid === ALL_COUPONS;
  const scoped = all ? withAllCoupons(c, raw, projects.map((p) => p.id)) : { c, raw };
  const rawF = scoped.raw;
  const v = itemValues(scoped.c, rawF, projectId, compareMode);
  const attrs = attrOptions(c);
  const [attr, setAttr] = useState(attrs[0]?.key ?? "");
  const attrKey = attrs.some((a) => a.key === attr) ? attr : attrs[0].key;
  // 企業には10件未満の区分を出さない
  const who = analyze(scoped.c, rawF, projectId, attrKey).rows.filter((r) => r.value !== "ひもづけなし" && (!corp || r.receivedHH >= MIN_CELL));
  const whoMax = Math.max(1, ...who.map((r) => r.receivedHH));
  const whereMax = Math.max(1, ...v.where.map(([, n]) => n));
  const items = [{ value: ALL_COUPONS, label: "すべてのクーポン" }, ...projects.map((p) => ({ value: p.id, label: p.status === "closed" ? `${p.name}（終了）` : p.name }))];
  const hh = v.hh;

  const value: Record<ItemKey, { main: string; foot: string; dist?: { label: string; pct: number }[] } | null> = {
    useRate: v.useRate == null ? null : { main: pctText(v.useRate), foot: `使用済み${hh} ${fmt(v.used)} ÷ 配布した${hh} ${fmt(v.received)}` },
    given: { main: `${fmt(v.received)}${hh}`, foot: `クーポンを受け取った${hh}` },
    users: { main: `${fmt(v.used)}${hh}`, foot: "一度でも消し込みがあった" },
    where: null,
    who: null,
    compare: v.compare
      ? {
          main: v.compare.before ? `${v.compare.now >= v.compare.before ? "+" : ""}${Math.round(((v.compare.now - v.compare.before) / v.compare.before) * 100)}%` : "—",
          foot: `${v.compare.nowLabel} ${fmt(v.compare.now)}枚・${v.compare.beforeLabel} ${v.compare.before == null ? "データなし" : `${fmt(v.compare.before)}枚`}`,
        }
      : null,
    sat: v.sat.v == null ? null : { main: pctText(v.sat.v), foot: `5段階の4と5の合計（回答 ${fmt(v.sat.n)}）`, dist: v.sat.dist },
    add: v.add?.v == null ? null : { main: pctText(v.add.v), foot: `「利用しなかった」を選んだ割合（回答 ${fmt(v.add.n)}）`, dist: v.add.dist },
    first: v.first?.v == null ? null : { main: pctText(v.first.v), foot: `「初めて」を選んだ割合（回答 ${fmt(v.first.n)}）`, dist: v.first.dist },
    again: v.again?.v == null ? null : { main: pctText(v.again.v), foot: `5段階の4と5の合計（回答 ${fmt(v.again.n)}）`, dist: v.again.dist },
    spend: v.spend ? { main: yen(v.spend.v), foot: `回答の合計 ÷ 回答数（${fmt(v.spend.n)}）` } : null,
  };
  const tiles = ITEMS.filter((it) => it.key !== "where" && it.key !== "who" && value[it.key]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={corp ? `${c.corp.name}` : `${c.muni}・giftee Survey のダッシュボードを流用する想定`}
        title={corp ? "寄附した事業の数字と声" : "数字と声"}
        sub={
          corp
            ? `${c.muni}のクーポン全体の数字。チェックした項目を社内共有ページに公開`
            : "e街の発行〜消し込みの記録と、使った直後のアンケートの結果。寄附企業のダッシュボードにも同じ数字が出る"
        }
        actions={
          <div className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-xs text-muted-foreground">
              事業
              <Select items={businessItems} value={c.id} onValueChange={(x) => x && setCase(x as CaseId)}>
                <SelectTrigger className="min-w-[220px] bg-card" aria-label="事業">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {businessItems.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              クーポン
              <Select items={items} value={projectId} onValueChange={(x) => x && setPid(x as string)}>
                <SelectTrigger className="min-w-[260px] bg-card" aria-label="クーポン">
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
            </label>
          </div>
        }
      />

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[720px] text-[13px]">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-5 py-2 font-normal">項目</th>
              <th className="px-3 py-2 text-right font-normal">数字</th>
              <th className="px-3 py-2 font-normal">内訳</th>
              {corp && <th className="px-5 py-2 font-normal">社内共有ページに公開</th>}
            </tr>
          </thead>
          <tbody>
            {tiles.map((it, i) => {
              const x = value[it.key]!;
              const head = i === 0 || tiles[i - 1].from !== it.from;
              return (
                <Fragment key={it.key}>
                  {head && (
                    <tr className="border-b bg-muted/50">
                      <td colSpan={corp ? 4 : 3} className="px-5 py-1.5 text-xs font-bold text-muted-foreground">
                        {it.from === "アンケート" ? "使った直後のアンケートから" : "e街の発行〜消し込みの記録から"}
                      </td>
                    </tr>
                  )}
                  <tr className="border-b last:border-b-0">
                    <td className="px-5 py-2.5 font-medium">{it.label}</td>
                    <td className="px-3 py-2.5 text-right text-[18px] font-bold whitespace-nowrap tnum">{x.main}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {it.key === "compare" && (
                        <select
                          id="compare-mode"
                          value={compareMode}
                          onChange={(e) => setCompareMode(e.target.value as CompareMode)}
                          aria-label="比較の相手"
                          className="mr-2 h-7 rounded-md border bg-card px-1.5 text-xs text-foreground"
                        >
                          {COMPARE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}と比べる
                            </option>
                          ))}
                        </select>
                      )}
                      {x.foot}
                      {x.dist && <Dist rows={x.dist} />}
                    </td>
                    {corp && (
                      <td className="px-5 py-2.5">
                        <ShareToggle on={!!shared[it.key]} onClick={() => toggle(it.key)} compact label="公開" />
                      </td>
                    )}
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-5">
        <Section title={<span className="flex items-center gap-2">誰に届いたか <SourceTag from="e街の記録" /></span>} meta={corp ? <ShareToggle on={!!shared.who} onClick={() => toggle("who")} compact /> : undefined} bodyClassName="p-0">
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
          <p className="border-t px-5 py-2 text-xs text-muted-foreground">受け取った{hh}を会員情報の登録項目で分けたもの{corp && "。10件未満の区分は出さない"}</p>
        </Section>
        <Section title={<span className="flex items-center gap-2">どこで使われたか <SourceTag from="e街の記録" /></span>} meta={corp ? <ShareToggle on={!!shared.where} onClick={() => toggle("where")} compact /> : undefined} bodyClassName="p-0">
          <Bars rows={v.where.slice(0, 8)} max={whereMax} unit="枚" />
          <p className="border-t px-5 py-2 text-xs text-muted-foreground">消し込みのあった加盟店の種類ごと</p>
        </Section>
      </div>

      <Section title={<span className="flex items-center gap-2">声 <SourceTag from="アンケート" /></span>} meta={<span className="text-xs text-muted-foreground">{corp ? "公開に同意した声だけ。属性はぼかして表示。「社内共有ページに出さない」にチェックした声は社員に見えない" : "不適切なものは「企業に出さない」にチェック。企業のダッシュボードと社内共有ページから消える"}</span>}>
        <VoicesGrid c={c} projectIds={all ? projects.map((p) => p.id) : [projectId]} showGift mode={corp ? "corp" : "muni"} pageSize={6} />
      </Section>
    </div>
  );
}

function SourceTag({ from }: { from: string }) {
  return (
    <span className={cn("shrink-0 rounded px-1.5 py-px text-[10px] font-bold", from === "アンケート" ? "bg-orange-soft text-orange" : "bg-brand-soft text-brand")}>{from}</span>
  );
}

function ShareToggle({ on, onClick, compact, label = "社内共有ページに公開" }: { on: boolean; onClick: () => void; compact?: boolean; label?: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      onClick={onClick}
      className={cn("inline-flex items-center gap-1.5 self-start text-xs", !compact && "mt-3 border-t pt-2.5 self-stretch", on ? "font-bold text-brand" : "text-muted-foreground")}
    >
      <span className={cn("grid size-4 place-items-center rounded border", on ? "border-brand bg-brand text-white" : "border-muted-foreground/50")}>{on && <Check className="size-3" />}</span>
      {label}
    </button>
  );
}

function Bars({ rows, max, unit }: { rows: [string, number][]; max: number; unit: string }) {
  return (
    <ul className="space-y-1.5 px-5 py-3 text-[13px]">
      {rows.map(([k, n]) => (
        <li key={k} className="grid grid-cols-[minmax(0,14rem)_1fr_6rem] items-center gap-4">
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

/** 設問の答えの分布（合計100%）。帯と数字で出す */
function Dist({ rows }: { rows: { label: string; pct: number }[] }) {
  const tones = ["bg-brand", "bg-brand/70", "bg-brand/45", "bg-brand/25", "bg-brand/12"];
  return (
    <div className="mt-1.5 max-w-md">
      <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
        {rows.map((r, i) => (
          <span key={r.label} className={tones[i] ?? "bg-brand/10"} style={{ width: `${r.pct}%` }} />
        ))}
      </div>
      <p className="mt-1 flex flex-wrap gap-x-2.5 text-[11px] tnum">
        {rows.map((r) => (
          <span key={r.label}>
            {r.label} {pctText(r.pct)}
          </span>
        ))}
      </p>
    </div>
  );
}
