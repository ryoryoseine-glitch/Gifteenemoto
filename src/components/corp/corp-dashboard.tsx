"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useMemo } from "react";
import { ExternalLink, FileText, Heart, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { ago, fmt, pctText, publicAttrs, yen } from "@/lib/format";
import { aggregateProjects, corpSupports, cumulative, projectTotals, sum, rateSeries, type Support } from "@/lib/metrics";
import type { CaseData, Project } from "@/data/types";
import { PHOTO_CREDITS } from "@/data/photos";
import { useApp, useCase, useExtra } from "@/store/useApp";
import { CompareToggle, Delta, Section, UpdateBadge } from "@/components/shell/parts";
import { Sparkline } from "@/components/charts/sparkline";
import { GiftCard, GiftCardRow } from "@/components/insight/gift-card";
import { VoicesGrid } from "@/components/insight/voices-grid";
import { Kpi, KpiGrid } from "@/components/insight/kpi";
import { Places } from "@/components/insight/places";
import { PhotoCredits } from "@/components/gift/gift-photo";
import { buttonVariants } from "@/components/ui/button";

export function CorpDashboard() {
  const c = useCase();
  const extra = useExtra();
  const show = useApp((s) => s.corpShow);

  // 支援している事業（寄附の割合で按分する）
  const supports = useMemo(() => corpSupports(c, extra), [c, extra]);
  // 数字はいつも「実施中の支援事業」の合計
  const active = supports.filter((g) => g.base.status === "active");
  const p = useMemo(() => aggregateProjects(active.map((g) => g.project)), [active]);

  return (
    <div>
      <Hero c={c} supports={active} />

      {/* 数字は上のカード1段だけ */}
      <div className="mt-6 mb-3 flex flex-wrap items-center justify-between gap-2">
        <UpdateBadge kind="live" text="実施中の支援事業の合計・リアルタイム" />
        <div className="flex flex-wrap items-center gap-2">
          <CompareToggle />
          <Link href="/share" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "bg-card")}>
            社内共有リンクを開く
            <ExternalLink />
          </Link>
        </div>
      </div>
      {show.cards && <KpiRow c={c} p={p} supports={active} />}

      <div className="mt-10 space-y-10">
        <section>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-bold">
              支援している事業<span className="ml-2 text-[13px] font-normal text-muted-foreground tnum">{supports.length}件</span>
            </h2>
            <span className="text-xs text-muted-foreground">貴社の分は、事業費に占める寄附の割合で按分</span>
          </div>
          <GiftCardRow label="支援している事業" selectable={false}>
            {supports.map((g) => (
              <GiftCard
                key={g.base.id}
                photoIds={g.coupons.map((d) => d.photo)}
                muni={c.muniShort}
                title={g.base.name}
                sub={`事業費の ${pctText(g.share * 100)} を寄附`}
                amount={g.amount}
                project={g.project}
                unit={c.unit}
              />
            ))}
          </GiftCardRow>
        </section>

        {show.voices && <VoicesGrid c={c} projectIds={active.map((g) => g.base.id)} showGift pageSize={3} />}
        {show.places && <Places c={c} p={p} />}
        {show.report && <Reports supports={supports} />}
        <div className="space-y-1.5">
          <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-px size-3.5 shrink-0" />
            個人につながらない集計値と、公開に同意した声だけを表示しています。10件未満の区分は表示しません。
          </p>
          <PhotoCredits ids={[`city-${c.id}`, ...supports.flatMap((g) => g.coupons.map((d) => d.photo))]} />
        </div>
      </div>
    </div>
  );
}

/* ---------------- ヒーロー（市の風景） ---------------- */

function Hero({ c, supports }: { c: CaseData; supports: Support[] }) {
  const reached = sum(supports.map((g) => projectTotals(g.project).received));
  const ids = supports.map((g) => g.base.id);
  const voices = c.voices.filter((v) => ids.includes(v.projectId) && !v.hidden).sort((a, b) => (b.postedAt ?? 0) - (a.postedAt ?? 0));
  const latest = voices[0];
  const credit = PHOTO_CREDITS[`city-${c.id}`];

  return (
    <section className="relative -mx-4 overflow-hidden text-white sm:mx-0 sm:rounded-2xl">
      <img src={`/city/${c.id}.jpg`} alt={`${c.muniShort}の風景`} className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      <div className="relative grid gap-8 px-6 py-10 sm:px-10 sm:py-14 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-end">
        <div>
          <p className="text-sm text-white/85">{c.corp.name} さま</p>
          <h1 className="mt-3 text-[26px] leading-[1.35] font-bold tracking-tight sm:text-[34px]">
            <span className="inline-block">{c.corp.name.replace("株式会社", "")}も支える事業が、</span>
            <span className="inline-block">
              {c.muniShort}の<span className="mx-1 text-[1.25em] tnum">{fmt(reached)}</span>
              {c.unit}に
            </span>
            <span className="inline-block">届いています</span>
          </h1>
          <p className="mt-4 text-sm text-white/85">
            {supports.length}つの事業に{" "}
            <b className="tnum text-white">{yen(sum(supports.map((g) => g.amount)))}</b> を寄附
          </p>
        </div>
        {latest && (
          <figure key={latest.id} className="rounded-xl bg-white/92 p-5 text-[#232323] shadow-lg backdrop-blur animate-in fade-in slide-in-from-bottom-2 dark:bg-[#1c1d1f]/92 dark:text-[#ececec]">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-orange">
                <Heart className="size-3.5 fill-current" />
                いちばん新しい声
              </span>
              <UpdateBadge kind="live" text={ago(latest.postedAt ?? 0)} />
            </div>
            <blockquote className="text-[15px] leading-relaxed">{latest.text}</blockquote>
            <figcaption className="mt-3 text-xs text-muted-foreground">
              {publicAttrs(c.id, latest.attrs)}・{c.donors.find((d) => d.id === latest.giftId)?.giftName}
            </figcaption>
          </figure>
        )}
      </div>
      {credit && <p className="absolute right-3 bottom-2 text-[10px] text-white/60">写真：{credit.author}（{credit.license}）</p>}
    </section>
  );
}

/* ---------------- 数字 ---------------- */

function KpiRow({ c, p, supports }: { c: CaseData; p: Project; supports: Support[] }) {
  const cmp = useApp((s) => s.cmp);
  const show = useApp((s) => s.corpShow);
  const t = projectTotals(p);
  const last = p.months.length - 1;
  const my = sum(supports.map((g) => g.amount));
  const budget = sum(supports.map((g) => g.base.budget));
  const shared = sum(supports.map((g) => Math.round(projectTotals(g.project).received * g.share)));
  const hh = c.unit === "世帯" ? "世帯" : "件";

  const recvCum = cumulative(p.received);
  const recvPrevCum = p.receivedPrev ? cumulative(p.receivedPrev) : null;
  const rate = rateSeries(p);
  const ratePrev = p.receivedPrev && p.usedPrev ? rateSeries({ ...p, received: p.receivedPrev, used: p.usedPrev, usedHouseholds: undefined }) : null;
  const recvBase = cmp === "month" ? recvCum[last - 1] : recvPrevCum?.[last];
  const recvDelta = recvBase == null ? null : ((t.received - recvBase) / recvBase) * 100;
  const rateBase = cmp === "month" ? rate[last - 1] : ratePrev?.[last];
  const rateDelta = rateBase == null ? null : (t.useRate - rateBase) * 100;
  const cmpLabel = cmp === "month" ? "先月末から" : "前年同期から";
  const noPrev = cmp === "year" && !p.receivedPrev ? "今年度から始めた事業を含む" : cmpLabel;

  const ids = supports.map((g) => g.base.id);
  const voices = c.voices.filter((v) => ids.includes(v.projectId) && !v.hidden);

  const cards = [
    show.amount && (
      <Kpi
        key="amount"
        label="寄附額（自社）"
        hint="自社の寄附額（企業版ふるさと納税）。割合＝事業費に占める自社の寄附"
        value={yen(my)}
        foot={
          <div className="space-y-1.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--chart-track)]">
              <div className="h-full rounded-full bg-[var(--chart-1)]" style={{ width: `${Math.min(100, (my / budget) * 100)}%` }} />
            </div>
            <div className="text-xs text-muted-foreground">
              事業費 {yen(budget)} の {pctText((my / budget) * 100)}
            </div>
          </div>
        }
      />
    ),
    show.households && (
      <Kpi
        key="households"
        label={`届いた${hh}`}
        hint="クーポンを受け取った世帯（事業全体）。下は、事業費に占める自社の寄附の割合で按分した数"
        value={t.received}
        unit={hh}
        delta={<Delta value={recvDelta} />}
        deltaNote={recvDelta == null ? noPrev : cmpLabel}
        foot={
          <div className="text-xs text-muted-foreground tnum">
            うち貴社の割合で按分 <b className="text-foreground">{fmt(shared)}</b>
            {hh}
          </div>
        }
      />
    ),
    show.userate && (
      <Kpi
        key="userate"
        label="利用率"
        hint={`利用率＝1回以上使った${hh} ÷ 受け取った${hh}（どちらも${hh}で数える）`}
        value={pctText(t.useRate * 100)}
        delta={<Delta value={rateDelta} unit="pt" />}
        deltaNote={rateDelta == null ? noPrev : cmpLabel}
        foot={
          <div className="text-xs text-muted-foreground tnum">
            使った{hh} <b className="text-foreground">{fmt(t.usedHouseholds)}</b>
            {hh}
          </div>
        }
        spark={<Sparkline cur={rate} prev={cmp === "year" ? ratePrev : null} height={28} />}
      />
    ),
    show.voices && (
      <Kpi
        key="voices"
        label="届いた声"
        hint="受け取った人が公開に同意したひとこと"
        value={voices.length}
        unit="件"
        hideSmall={false}
        foot={
          <div className="text-xs text-muted-foreground tnum">
            社員からの共感 <b className="text-foreground">{fmt(sum(voices.map((v) => v.likes)))}</b>
          </div>
        }
      />
    ),
  ].filter(Boolean);

  if (!cards.length) return null;
  return <KpiGrid count={cards.length}>{cards}</KpiGrid>;
}

/* ---------------- 報告書 ---------------- */

function Reports({ supports }: { supports: Support[] }) {
  // 届いた報告書だけを事業ごとに1行。次の予定とインパクト評価は下に1行で
  const rows = supports.map((g) => {
    const id = g.coupons.find((d) => d.name === g.coupons[0].name)?.id ?? g.coupons[0].id;
    const closed = g.base.status === "closed";
    return { id, project: g.base.name, name: closed ? "期末報告" : "中間報告", when: closed ? "2026年3月末時点" : "2026年9月末時点", date: closed ? "2026年4月20日" : "2026年10月15日" };
  });
  return (
    <Section title="報告書" bodyClassName="p-0">
      <table className="w-full text-[13px]">
        <tbody>
          {rows.map((r) => (
            <tr key={r.project} className="border-b last:border-b-0">
              <td className="px-5 py-3">
                <span className="flex items-center gap-2 font-medium">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  {r.project}　{r.name}
                </span>
                <span className="mt-0.5 block pl-6 text-xs text-muted-foreground">
                  {r.when}・{r.date}に届きました
                </span>
              </td>
              <td className="px-5 py-3 text-right">
                <Link href={`/corp/report?gift=${r.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  見る
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t px-5 py-2.5 text-xs text-muted-foreground">次の報告：期末報告（2027年4月予定）。インパクト評価（別冊）は、希望する場合に市に相談してください。</p>
    </Section>
  );
}
