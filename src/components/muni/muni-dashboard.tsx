"use client";

import { useEffect, useMemo } from "react";
import { ArrowRight, Building2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";
import { fmt, pctText, yen } from "@/lib/format";
import { breakdownOf, change, donorTotal, giftProject, projectTotals, projectWithExtra, sum } from "@/lib/metrics";
import type { CaseData, Donor, Project } from "@/data/types";
import { useApp, useCase, useExtra, type Extra } from "@/store/useApp";
import { CompareToggle, Delta, PageHeader, Section, UpdateBadge } from "@/components/shell/parts";
import { GiftCard, GiftCardRow } from "@/components/insight/gift-card";
import { VoicesGrid } from "@/components/insight/voices-grid";
import { Places } from "@/components/insight/places";
import { PhotoCredits } from "@/components/gift/gift-photo";
import { DataSources } from "@/components/insight/data-status";
import { TrendChart } from "@/components/charts/trend-chart";
import { HBarChart } from "@/components/charts/hbar-chart";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function MuniDashboard() {
  const c = useCase();
  const extra = useExtra();
  const caseId = useApp((s) => s.caseId);
  const projectId = useApp((s) => s.muniProject[caseId]) ?? "all";
  const setProject = useApp((s) => s.setMuniProject);

  // ?project=m1 で開いたときはその事業を選ぶ（共有・確認用）
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("project")) setProject(q.get("project")!);
  }, [setProject]);

  const projects = useMemo(() => c.projects.map((p) => projectWithExtra(p, c, extra)), [c, extra]);
  const base = c.projects.find((p) => p.id === projectId) ?? null;
  const project = projects.find((p) => p.id === projectId) ?? null;
  const gifts = base ? c.donors.filter((d) => d.projectId === base.id).map((d) => ({ donor: d, project: giftProject(base, d, extra) })) : [];

  const items = [{ value: "all", label: "すべての事業" }, ...c.projects.map((p) => ({ value: p.id, label: p.name + (p.status === "closed" ? "（終了）" : "") }))];

  return (
    <div>
      <PageHeader
        eyebrow={c.muni}
        title="ダッシュボード"
        sub="配っているギフトと、その使われ方・受け取った人の声"
        actions={
          <>
            <Select items={items} value={projectId} onValueChange={(v) => v && setProject(v as string)}>
              <SelectTrigger className="min-w-[240px] bg-card lg:hidden" aria-label="事業の切り替え">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false} align="end" className="min-w-[320px]">
                {items.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <CompareToggle />
          </>
        }
      />

      {!project || !base ? (
        <AllProjects c={c} projects={projects} onPick={setProject} extra={extra} />
      ) : (
        <>
          <div className="mb-6 rounded-lg border bg-card px-5 py-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-lg font-bold">{base.name}</h2>
              {base.status === "closed" ? <Badge variant="secondary">終了</Badge> : <Badge>実施中</Badge>}
              <span className="text-[13px] text-muted-foreground">{base.period}</span>
            </div>
            <p className="mt-1 text-[13px] text-muted-foreground">
              事業目標：{base.goal}　対象：{base.target}
            </p>
          </div>
          <div className="mb-3 flex flex-wrap items-baseline gap-2">
            <h3 className="text-sm font-bold">
              この事業で配っているクーポン<span className="ml-2 font-normal text-muted-foreground tnum">{gifts.length}種</span>
            </h3>
          </div>
          <GiftCardRow label="この事業で配っているギフト" selectable={false}>
            {gifts.map((g) => (
              <GiftCard
                key={g.donor.id}
                photoIds={[g.donor.photo]}
                muni={c.muniShort}
                title={g.donor.giftName}
                sub="券種"
                amount={null}
                project={g.project}
                unit={c.unit}
              />
            ))}
          </GiftCardRow>

          <Detail c={c} base={base} p={project} donor={null} donors={gifts.map((g) => g.donor)} />
          <div className="mt-6 space-y-4">
            <DataSources />
            <PhotoCredits ids={gifts.map((g) => g.donor.photo)} />
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- すべての事業 ---------------- */

function AllProjects({ c, projects, onPick, extra }: { c: CaseData; projects: Project[]; onPick: (id: string) => void; extra: Extra }) {
  const cmp = useApp((s) => s.cmp);
  return (
    <div className="space-y-8">
      <div>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-bold">
            すべての事業のクーポン<span className="ml-2 text-[13px] font-normal text-muted-foreground tnum">{c.donors.length}種</span>
          </h2>
          <span className="text-xs text-muted-foreground">事業ごとの詳しい数字は、左の事業名か下の表から</span>
        </div>
        <GiftCardRow label="すべての事業のギフト" selectable={false}>
          {c.donors.map((d) => {
            const base = c.projects.find((p) => p.id === d.projectId)!;
            return (
              <GiftCard
                key={d.id}
                photoIds={[d.photo]}
                muni={c.muniShort}
                title={d.giftName}
                sub={base.name}
                amount={null}
                project={giftProject(base, d, extra)}
                unit={c.unit}
              />
            );
          })}
        </GiftCardRow>
      </div>

      <Section title="事業の一覧" meta={<UpdateBadge kind="live" />} bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-[13px]">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-5 py-2.5 font-normal">事業</th>
                <th className="px-3 py-2.5 text-right font-normal">配布</th>
                <th className="px-3 py-2.5 text-right font-normal">受取率</th>
                <th className="px-3 py-2.5 text-right font-normal">利用率</th>
                <th className="px-3 py-2.5 text-right font-normal">{cmp === "month" ? "今月の利用（先月比）" : "利用の累計（前年比）"}</th>
                <th className="px-3 py-2.5 text-right font-normal">{c.kind === "観光" ? "周遊" : "2回以上の利用"}</th>
                <th className="px-5 py-2.5 text-right font-normal">企業の寄附</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const t = projectTotals(p);
                const closed = p.status === "closed";
                const cur = cmp === "month" ? t.thisMonthUsed : t.used;
                const prev = cmp === "month" ? t.prevMonthUsed : t.prevYearUsed;
                return (
                  <tr key={p.id} onClick={() => onPick(p.id)} className="cursor-pointer border-b transition-colors last:border-b-0 hover:bg-muted/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 font-medium">
                        {p.name}
                        {closed && <Badge variant="secondary">終了</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">{p.period}</div>
                    </td>
                    <td className="px-3 py-3 text-right tnum">{fmt(p.issued)}</td>
                    <td className="px-3 py-3 text-right tnum">{pctText(t.receiveRate * 100)}</td>
                    <td className="px-3 py-3 text-right tnum">{pctText(t.useRate * 100)}</td>
                    <td className="px-3 py-3 text-right tnum">
                      {closed ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          {fmt(cur)}
                          <Delta value={change(cur, prev)} className="w-16 text-right" />
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right tnum">{Math.round((p.tour ?? p.repeat) * 100)}%</td>
                    <td className="px-5 py-3 text-right tnum">{yen(donorTotal(c, p.id))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

/* ---------------- ギフト（または事業全体）の分析 ---------------- */

function Detail({ c, base, p, donor, donors }: { c: CaseData; base: Project; p: Project; donor: Donor | null; donors: Donor[] }) {
  const cmp = useApp((s) => s.cmp);
  const t = projectTotals(p);
  const closed = p.status === "closed";
  const cur = cmp === "month" ? t.thisMonthUsed : t.used;
  const prev = cmp === "month" ? t.prevMonthUsed : t.prevYearUsed;
  const useDelta = closed ? null : change(cur, prev);
  const shop = breakdownOf(p, "shop");
  const repeatLabel = c.kind === "観光" ? "周遊（2市町村以上）" : "2回以上の利用";
  const repeat = p.tour ?? p.repeat;
  const sponsors = donor ? [donor] : donors;

  const steps = [
    { label: "配布", value: p.issued, note: `${c.unit}`, ratio: 1 },
    { label: "受取", value: t.received, note: `受取率 ${pctText(t.receiveRate * 100)}`, ratio: t.receiveRate },
    { label: "利用した世帯", value: t.usedHouseholds, note: `利用率 ${pctText(t.useRate * 100)}・使われた ${fmt(t.used)}${c.unit === "世帯" ? "枚" : "件"}`, ratio: t.usedHouseholds / (p.issued || 1) },
  ];

  return (
    <div className="mt-8 space-y-6">
      <div className="border-b pb-2">
        <h3 className="text-sm font-bold">{donor ? donor.giftName : "この事業の使われ方"}</h3>
      </div>

      {/* 利用状況 */}
      <Section title="利用状況" meta={<UpdateBadge kind="live" />}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.label} className="relative rounded-lg bg-muted/60 px-4 py-3">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="mt-0.5 text-[24px] leading-tight font-bold tnum">{fmt(s.value)}</div>
              <div className="text-xs text-muted-foreground tnum">{s.note}</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--chart-track)]">
                <div className="h-full rounded-full bg-[var(--chart-1)]" style={{ width: `${Math.min(100, s.ratio * 100)}%` }} />
              </div>
              {i < 2 && <ArrowRight className="absolute top-1/2 -right-3 z-10 hidden size-4 -translate-y-1/2 text-muted-foreground lg:block" />}
            </div>
          ))}
          <div className="rounded-lg bg-muted/60 px-4 py-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {repeatLabel}
            </div>
            <div className="mt-0.5 text-[24px] leading-tight font-bold tnum">{Math.round(repeat * 100)}%</div>
            <div className="text-xs text-muted-foreground">消し込みの記録から</div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--chart-track)]">
              <div className="h-full rounded-full bg-[var(--chart-2)]" style={{ width: `${repeat * 100}%` }} />
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t pt-3 text-[13px]">
          <span className="text-muted-foreground">使われた金額</span>
          <span className="font-bold tnum">{yen(t.used * p.unitValue)}</span>
          <span className="text-muted-foreground">{cmp === "month" ? "今月の利用" : "利用の累計"}</span>
          <span className="font-bold tnum">
            {fmt(cur)}
            {c.unit === "世帯" ? "回" : "件"}
          </span>
          <span className="flex items-center gap-1.5 text-xs">
            <Delta value={useDelta} />
            <span className="text-muted-foreground">{closed ? "期間終了" : cmp === "month" ? "先月比" : prev == null ? "前年の記録なし" : "前年同期比"}</span>
          </span>
          <span className="ml-auto flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Building2 className="size-3.5" />
            {sponsors.map((d) => (
              <span key={d.id} className="rounded-full border px-2 py-0.5 text-foreground">
                {d.name}　{yen(d.amount)}
              </span>
            ))}
          </span>
        </div>
      </Section>

      {/* 推移と事業者 */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Section title="月別の利用" meta={<UpdateBadge kind="live" />}>
          <TrendChart months={p.months} cur={p.used} prev={p.usedPrev} unit={c.unit === "世帯" ? "回" : "件"} />
        </Section>
        <Section title={c.kind === "観光" ? "加盟店別（上位）" : "事業者別（上位）"} meta={<span className="text-[11px] text-muted-foreground">自治体の画面だけ</span>}>
          {shop ? <HBarChart rows={[...shop.rows].sort((a, b) => b[1] - a[1])} unit={c.unit === "世帯" ? "枚" : "件"} showPct={false} /> : <p className="py-8 text-center text-xs text-muted-foreground">この事業では記録していません</p>}
          <ShopCsv c={c} base={base} p={p} />
        </Section>
      </div>

      <Places c={c} p={p} mode="muni" />

      <VoicesGrid
        key={`${base.id}-${donor?.id ?? "all"}`}
        c={c}
        projectIds={[base.id]}
        giftIds={donor ? [donor.id] : undefined}
        showGift={!donor}
        closed={closed}
        mode="muni"
      />
      <p className={cn("text-xs text-muted-foreground")}>
        寄附企業の画面に出す項目は「設定 → 企業に見せる項目」で決めます。寄附の合計 {yen(sum(donors.map((d) => d.amount)))}。
      </p>
    </div>
  );
}

/** 事業者からの消し込みを CSV で書き出す（中身はモック。本番は e街の利用実績・精算データ） */
function ShopCsv({ c, base, p }: { c: CaseData; base: Project; p: Project }) {
  const shop = breakdownOf(p, "shop");
  const who = c.kind === "観光" ? "加盟店" : "事業者";
  const name = `${c.muniShort}_${base.name}`.replace(/[\s（）()]/g, "");
  const summary = () =>
    downloadCsv(`${name}_${who}別の利用_2026-09.csv`, [
      [`${who}名`, "利用回数", "使われた金額（円）", "対象期間"],
      ...(shop?.rows ?? []).map(([k, v]) => [k, v, v * p.unitValue, "2026年4月〜9月"]),
    ]);
  const detail = () => {
    const shops = shop?.rows.map(([k]) => k) ?? ["（記録なし）"];
    const gifts = c.donors.filter((d) => d.projectId === base.id);
    const rows: (string | number)[][] = [["利用日時", `${who}名`, "クーポン", "利用者ID（仮名）", "何回目", "金額（円）"]];
    for (let i = 0; i < 60; i++) {
      const day = 30 - (i % 30);
      const hh = 9 + ((i * 7) % 9);
      const mm = (i * 13) % 60;
      rows.push([
        `2026-09-${String(day).padStart(2, "0")} ${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`,
        shops[i % shops.length],
        gifts[i % Math.max(1, gifts.length)]?.giftName ?? base.name,
        `U${String(1000 + ((i * 37) % 400)).padStart(5, "0")}`,
        1 + (i % 3),
        p.unitValue,
      ]);
    }
    downloadCsv(`${name}_利用の明細_2026-09.csv`, rows);
  };
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
      <span className="mr-auto text-xs text-muted-foreground">{who}からの消し込みを書き出す</span>
      <Button variant="outline" size="sm" onClick={summary}>
        <Download />
        {who}別の集計（CSV）
      </Button>
      <Button variant="outline" size="sm" onClick={detail}>
        <Download />
        利用の明細（CSV）
      </Button>
    </div>
  );
}
