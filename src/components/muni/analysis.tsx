"use client";

import { useState } from "react";
import { ChevronRight, Download } from "lucide-react";
import { analyze, attrOptions } from "@/lib/analysis";
import { downloadCsv } from "@/lib/csv";
import { fmt, pctText } from "@/lib/format";
import { MIN_CELL } from "@/lib/metrics";
import { useApp, useCase } from "@/store/useApp";
import { PageHeader, Section } from "@/components/shell/parts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** 数字の分析：e街の発行→受け取り→利用とアンケートの数を、会員情報（登録項目）で分けて見る */
export function Analysis() {
  const c = useCase();
  const raw = useApp((s) => s.raw[s.caseId]);
  const [pid, setPid] = useState(c.projects.find((p) => p.status === "active")?.id ?? c.projects[0].id);
  const opts = attrOptions(c);
  const [key, setKey] = useState(opts[0]?.key ?? "");
  const projectId = c.projects.some((p) => p.id === pid) ? pid : c.projects[0].id;
  const attrKey = opts.some((o) => o.key === key) ? key : opts[0].key;
  const { funnel: f, rows } = analyze(c, raw, projectId, attrKey);
  const hh = c.kind === "観光" ? "人" : "世帯";
  const max = Math.max(1, ...rows.map((r) => r.receivedHH));
  const items = c.projects.map((p) => ({ value: p.id, label: p.name }));
  const attrLabel = opts.find((o) => o.key === attrKey)?.label ?? "";

  const steps = [
    { label: "発行", value: f.issued, unit: "枚", from: "e街 発行実績" },
    { label: "受け取り", value: f.received, unit: "枚", from: "e街 受取実績" },
    { label: "利用", value: f.used, unit: "枚", from: "e街 利用実績" },
    { label: "アンケート回答", value: f.answered, unit: "件", from: "giftee Survey" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={c.muni}
        title="数字の分析"
        sub="e街の発行から消し込みまでの数と、アンケートの回答を、会員情報の登録項目で分けて表示"
        actions={
          <Select items={items} value={projectId} onValueChange={(v) => v && setPid(v as string)}>
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

      <Section title="発行から回答まで" meta={<span className="text-xs text-muted-foreground">会員情報とひもづいた利用 {pctText(f.linked)}</span>}>
        <ol className="grid gap-2 sm:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.label} className="relative rounded-lg bg-muted/60 px-4 py-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="mt-0.5 text-[22px] font-bold tnum">
                {fmt(s.value)}
                <span className="ml-0.5 text-[13px] font-normal text-muted-foreground">{s.unit}</span>
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {i > 0 && `前の段の ${pctText(steps[i - 1].value ? (s.value / steps[i - 1].value) * 100 : 0)}・`}
                {s.from}
              </p>
              {i < steps.length - 1 && <ChevronRight className="absolute top-1/2 -right-2.5 z-10 hidden size-4 -translate-y-1/2 text-muted-foreground sm:block" />}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[13px]">
          受け取った{hh} <b className="tnum">{fmt(f.receivedHH)}</b>・利用した{hh} <b className="tnum">{fmt(f.usedHH)}</b>・利用率{" "}
          <b className="tnum">{pctText(f.receivedHH ? (f.usedHH / f.receivedHH) * 100 : 0)}</b>
          <span className="ml-2 text-xs text-muted-foreground">（利用した{hh} ÷ 受け取った{hh}）</span>
        </p>
      </Section>

      <Section
        title="会員情報で分ける"
        meta={
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadCsv(`${c.muniShort}_${c.projects.find((p) => p.id === projectId)?.name}_${attrLabel}別.csv`, [
                [attrLabel, `受け取った${hh}`, `利用した${hh}`, "利用率(%)", "アンケート回答(件)", "満足・やや満足(%)"],
                ...rows.map((r) => [r.value, r.receivedHH, r.usedHH, r.useRate, r.answered, r.satTop2 ?? ""]),
              ])
            }
          >
            <Download className="size-3.5" />
            CSV
          </Button>
        }
        bodyClassName="p-0"
      >
        <div className="flex flex-wrap gap-1.5 border-b px-5 py-3">
          {opts.map((o) => (
            <button
              key={o.key}
              type="button"
              aria-pressed={o.key === attrKey}
              onClick={() => setKey(o.key)}
              className={o.key === attrKey ? "rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground" : "rounded-full border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px] tabular-nums">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-5 py-2 font-normal">{attrLabel}</th>
                <th className="px-3 py-2 font-normal">受け取った{hh}</th>
                <th className="px-3 py-2 text-right font-normal">利用した{hh}</th>
                <th className="px-3 py-2 text-right font-normal">利用率</th>
                <th className="px-3 py-2 text-right font-normal">回答</th>
                <th className="px-5 py-2 text-right font-normal">満足・やや満足</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.value} className="border-b last:border-b-0">
                  <td className="px-5 py-2 font-medium whitespace-nowrap">{r.value}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2 rounded-full bg-brand/70" style={{ width: `${(r.receivedHH / max) * 140}px` }} />
                      {fmt(r.receivedHH)}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">{fmt(r.usedHH)}</td>
                  <td className="px-3 py-2 text-right">{pctText(r.useRate)}</td>
                  <td className="px-3 py-2 text-right">{fmt(r.answered)}</td>
                  <td className="px-5 py-2 text-right">{r.satTop2 == null || r.answered < MIN_CELL ? "—" : pctText(r.satTop2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t px-5 py-2.5 text-xs text-muted-foreground">
          自治体の画面なので10件未満の区分も表示（満足度は回答10件未満なら「—」）。企業に渡す報告書・社内共有ページでは10件未満の区分を出さない。「ひもづけなし」は会員情報と会員IDでつながらなかった利用。
        </p>
      </Section>
    </div>
  );
}
