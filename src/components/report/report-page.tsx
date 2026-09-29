"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";
import { downloadWord } from "@/lib/word";
import { cn } from "@/lib/utils";
import { giftProject, projectWithExtra, sum } from "@/lib/metrics";
import type { Donor } from "@/data/types";
import { useApp, useCase, useExtra } from "@/store/useApp";
import { PageHeader } from "@/components/shell/parts";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BasicReport, type ReportKind } from "./report-docs";
import { ImpactReport } from "./impact-report";

/** ⑧ 報告書。mode="muni" は作成（記入・書き出し）、"corp" は企業が読むだけ */
export function ReportPage({ mode }: { mode: "muni" | "corp" }) {
  const c = useCase();
  const extra = useExtra();
  const caseId = useApp((s) => s.caseId);
  const corpGift = useApp((s) => s.corpGift[caseId]);
  const donors = mode === "corp" ? c.donors.filter((d) => d.name === c.corp.name) : c.donors;
  // 報告書は「企業 × 事業」ごと。キーは "企業名|事業ID"
  const keyOf = (d: { name: string; projectId: string }) => `${d.name}|${d.projectId}`;
  const keys = [...new Set(donors.map(keyOf))];
  const fromGift = (id?: string) => {
    const d = donors.find((x) => x.id === id);
    return d ? keyOf(d) : keys[0];
  };
  const [key, setKey] = useState<string>(() => fromGift(corpGift));
  const [kind, setKind] = useState<ReportKind>("mid");
  const [doc, setDoc] = useState<"basic" | "impact">("basic");
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- URL から初期値を読むだけ
    if (q.get("gift")) setKey(fromGift(q.get("gift")!));
    if (q.get("doc") === "impact") setDoc("impact");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cur = keys.includes(key) ? key : keys[0];
  const ds = donors.filter((d) => keyOf(d) === cur);
  const base = c.projects.find((p) => p.id === ds[0].projectId)!;
  // その企業がその事業で出したギフトをまとめて1つの寄附として扱う
  const donor: Donor = {
    ...ds[0],
    amount: sum(ds.map((d) => d.amount)),
    weight: sum(ds.map((d) => d.weight)),
    giftName: ds.map((d) => d.giftName).join("・"),
  };

  const closed = base.status === "closed";
  const k: ReportKind = closed ? "final" : kind;
  // 数字は事業全体（案A）。クーポン（券種）ごとの内訳は事業のすべての券種
  const p = projectWithExtra(base, c, extra);
  const coupons = c.donors.filter((d) => d.projectId === base.id).map((d) => ({ donor: d, p: giftProject(base, d, extra) }));
  const items = keys.map((kk) => {
    const [name, pid] = kk.split("|");
    const pn = c.projects.find((x) => x.id === pid)?.name ?? "";
    return { value: kk, label: mode === "muni" ? `${name.replace("株式会社", "")}｜${pn}` : pn };
  });
  const input = { c, donor, base, p, kind: k, coupons, readOnly: mode === "corp" };

  return (
    <div>
      {mode === "corp" && (
        <Link href="/corp" className="mb-3 inline-flex items-center gap-1 text-[13px] text-link hover:underline">
          <ArrowLeft className="size-3.5" />
          企業ダッシュボードに戻る
        </Link>
      )}
      <PageHeader
        eyebrow={mode === "muni" ? c.muni : c.corp.name}
        title={mode === "muni" ? "報告書の作成" : "報告書"}
        sub={mode === "muni" ? "数字の入った原案を自動で作ります。Word で書き出し、【自治体が記入】の欄を書き足して企業に送ります" : `${c.muni}から届いた報告書`}
        actions={
          <>
            <Select items={items} value={cur} onValueChange={(v) => v && setKey(v as string)}>
              <SelectTrigger className="min-w-[240px] bg-card" aria-label="寄附企業と事業">
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
            <ToggleGroup value={[k]} onValueChange={(v) => v[0] && setKind(v[0] as ReportKind)} variant="outline" size="sm" spacing={0} className="bg-card">
              <ToggleGroupItem value="mid" disabled={closed} className="px-3 text-xs data-pressed:bg-primary data-pressed:text-primary-foreground">
                中間
              </ToggleGroupItem>
              <ToggleGroupItem value="final" className="px-3 text-xs data-pressed:bg-primary data-pressed:text-primary-foreground">
                期末
              </ToggleGroupItem>
            </ToggleGroup>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" className="inline-flex rounded-lg border bg-card p-1">
          {(
            [
              ["basic", "基本の報告書", "自動"],
              ["impact", "インパクト評価", mode === "muni" ? "ひな形に記入" : "別PDF"],
            ] as const
          ).map(([v, l, s]) => (
            <button
              key={v}
              role="tab"
              type="button"
              aria-selected={doc === v}
              onClick={() => setDoc(v)}
              className={cn("rounded-md px-4 py-1.5 text-[13px] transition-colors", doc === v ? "bg-primary font-bold text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {l}
              <span className={cn("ml-1.5 text-[11px] font-normal", doc === v ? "text-primary-foreground/75" : "text-muted-foreground")}>{s}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {mode === "muni" ? (
            <>
              <Button size="sm" onClick={() => downloadWord(`${c.muniShort}_${base.name}_${donor.name.replace("株式会社", "")}_${k === "mid" ? "中間" : "期末"}_${doc === "basic" ? "報告書" : "インパクト評価"}_原案`)}>
                <Download />
                原案をWordで書き出す
              </Button>
              <Button variant="outline" size="sm" onClick={() => toast("Excel での書き出しはプロトタイプのため未実装")}>
                <Download />
                数字だけExcel
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => toast("PDF はプロトタイプのため未実装")}>
              <Download />
              PDF
            </Button>
          )}
        </div>
      </div>

      {doc === "basic" ? <BasicReport key={`b-${cur}-${k}`} {...input} /> : <ImpactReport key={`i-${cur}-${k}`} {...input} />}
    </div>
  );
}
