"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { downloadWord } from "@/lib/word";
import { fmt, pctText, yen } from "@/lib/format";
import { periodStats, periodVoices, periodsOf, type PeriodStats } from "@/lib/period";
import { sum } from "@/lib/metrics";
import { useApp, useCase } from "@/store/useApp";
import { PageHeader } from "@/components/shell/parts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type Row = { label: string; unit: string; get: (s: PeriodStats) => number | null; rate?: boolean; total?: (s: PeriodStats) => number };

/** 簡易報告書：企業 × 事業 × 期間。前の期間との差分つきの原案を作り、Word で書き出す */
export function SimpleReport() {
  const c = useCase();
  const raw = useApp((s) => s.raw[s.caseId]);
  const hidden = useApp((s) => s.hiddenVoices);
  const notes = useApp((s) => s.reportNotes);
  const setNote = useApp((s) => s.setReportNote);

  // 報告書は「企業 × 事業」ごと
  const keyOf = (d: { name: string; projectId: string }) => `${d.name}|${d.projectId}`;
  const keys = [...new Set(c.donors.map(keyOf))];
  const [key, setKey] = useState(keys[0]);
  const [span, setSpan] = useState<1 | 3>(3);
  const cur = keys.includes(key) ? key : keys[0];
  const [name, projectId] = cur.split("|");
  const p = c.projects.find((x) => x.id === projectId)!;
  const ds = c.donors.filter((d) => keyOf(d) === cur);
  const amount = sum(ds.map((d) => d.amount));
  const share = p.budget ? amount / p.budget : 0;

  const periods = periodsOf(p, span);
  const [perKey, setPerKey] = useState<string | null>(null);
  const idx = Math.max(0, periods.findIndex((x) => x.key === perKey));
  const per = periods[perKey ? idx : periods.length - 1];
  const prev = periods[periods.indexOf(per) - 1];

  const now = periodStats(c, raw, projectId, per);
  const before = prev ? periodStats(c, raw, projectId, prev) : null;
  const voices = periodVoices(c, raw, projectId, per, hidden).slice(0, 3);

  const hhWord = c.kind === "観光" ? "人" : "世帯";
  const addWord = c.kind === "観光" ? "なければ来なかった" : "なければ利用しなかった";
  const rows: Row[] = [
    { label: `新しく受け取った${hhWord}`, unit: hhWord, get: (s) => s.newReceived, total: (s) => s.totalReceived },
    { label: `新しく利用した${hhWord}`, unit: hhWord, get: (s) => s.newUsed, total: (s) => s.totalUsed },
    { label: "利用の数", unit: "枚", get: (s) => s.uses },
    { label: "アンケートの回答", unit: "件", get: (s) => s.responses },
    { label: "満足・やや満足", unit: "%", get: (s) => s.satTop2, rate: true },
    { label: addWord, unit: "%", get: (s) => s.notWithout, rate: true },
  ];

  const diffText = (r: Row) => {
    const a = r.get(now);
    const b = before ? r.get(before) : null;
    if (a == null || b == null) return "—";
    if (r.rate) {
      const d = Math.round((a - b) * 10) / 10;
      return `${d > 0 ? "+" : ""}${d.toFixed(1)}pt`;
    }
    if (!b) return "—";
    const d = Math.round(((a - b) / b) * 100);
    return `${d > 0 ? "+" : ""}${d}%`;
  };
  const val = (v: number | null, r: Row) => (v == null ? "—" : r.rate ? pctText(v) : `${fmt(v)}${r.unit}`);

  // 前の期間からの主な変化（自動の文。自治体が Word で直せる）
  const points: string[] = [];
  if (before) {
    const d = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : 0);
    const u = d(now.newUsed, before.newUsed);
    points.push(`新しく利用した${hhWord}は ${fmt(now.newUsed)}${hhWord}（前の期間 ${fmt(before.newUsed)}${hhWord}、${u >= 0 ? "+" : ""}${u}%）。`);
    points.push(`利用率（累計）は ${pctText(before.useRate)} → ${pctText(now.useRate)}。`);
    if (now.satTop2 != null && before.satTop2 != null) points.push(`満足・やや満足は ${pctText(before.satTop2)} → ${pctText(now.satTop2)}（回答 ${fmt(now.responses)}件）。`);
  } else {
    points.push(`最初の報告。${per.label}に ${fmt(now.newReceived)}${hhWord}が受け取り、${fmt(now.newUsed)}${hhWord}が利用。`);
  }

  const noteId = `${cur}|${per.key}|${span}`;
  const items = keys.map((k) => {
    const [n, pid] = k.split("|");
    return { value: k, label: `${n.replace("株式会社", "")}｜${c.projects.find((x) => x.id === pid)?.name ?? ""}` };
  });
  const perItems = periods.map((x) => ({ value: x.key, label: `${x.label}${x.partial ? "（途中）" : ""}` }));

  return (
    <div>
      <PageHeader
        eyebrow={c.muni}
        title="報告書の作成"
        sub="寄附企業ごとに、期間を選んで原案を作成。前の期間との差分は自動で入り、Word で書き出して記入・送付"
        actions={
          <Button onClick={() => downloadWord(`${c.muniShort}_${p.name}_${name.replace("株式会社", "")}_${per.label}_報告書`)}>
            <Download />
            Wordで書き出す
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-lg border bg-card px-4 py-3">
        <label className="grid gap-1 text-xs text-muted-foreground">
          寄附企業と事業
          <Select items={items} value={cur} onValueChange={(v) => v && (setKey(v as string), setPerKey(null))}>
            <SelectTrigger className="min-w-[280px]" aria-label="寄附企業と事業">
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
        <label className="grid gap-1 text-xs text-muted-foreground">
          報告の間隔
          <ToggleGroup value={[String(span)]} onValueChange={(v) => v[0] && (setSpan(Number(v[0]) as 1 | 3), setPerKey(null))} variant="outline" size="sm" spacing={0}>
            <ToggleGroupItem value="3" className="px-3 text-xs data-pressed:bg-primary data-pressed:text-primary-foreground">
              3か月ごと
            </ToggleGroupItem>
            <ToggleGroupItem value="1" className="px-3 text-xs data-pressed:bg-primary data-pressed:text-primary-foreground">
              毎月
            </ToggleGroupItem>
          </ToggleGroup>
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          期間
          <Select items={perItems} value={per.key} onValueChange={(v) => v && setPerKey(v as string)}>
            <SelectTrigger className="min-w-[200px]" aria-label="期間">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {perItems.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>

      <article data-report-doc className="mx-auto max-w-[820px] rounded-lg border bg-white px-8 py-8 text-[#232323] shadow-sm sm:px-12">
        <p className="text-[13px]">{name} 様</p>
        <h2 className="mt-3 text-[20px] leading-snug font-bold">
          {p.name} ご報告（{per.label}
          {per.partial ? "・途中経過" : ""}）
        </h2>
        <p className="mt-1 text-[12px] text-[#666]">{c.muni}</p>

        <h3 className="mt-7 mb-2 border-b pb-1 text-[14px] font-bold">1. ご寄附と事業</h3>
        <table className="w-full text-[13px]">
          <tbody>
            <Tr k="ご寄附">
              {yen(amount)}（{ds.map((d) => d.donatedOn).filter(Boolean).join("・")}）
            </Tr>
            <Tr k="事業費に占める割合">
              {pctText(share * 100)}（事業費 {yen(p.budget)}）
            </Tr>
            <Tr k="ご寄附で届けたもの">{ds.map((d) => d.giftName).join("・")}</Tr>
          </tbody>
        </table>

        <h3 className="mt-7 mb-2 border-b pb-1 text-[14px] font-bold">2. この期間の数字</h3>
        <table className="w-full text-[13px] tabular-nums">
          <thead>
            <tr className="text-left text-[12px] text-[#666]">
              <th className="py-1.5 font-normal">項目</th>
              <th className="py-1.5 text-right font-normal">{per.label.replace(/^\d+年/, "")}</th>
              <th className="py-1.5 text-right font-normal">前の期間</th>
              <th className="py-1.5 text-right font-normal">変化</th>
              <th className="py-1.5 text-right font-normal">事業開始からの累計</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t">
                <td className="py-1.5">{r.label}</td>
                <td className="py-1.5 text-right font-bold">{val(r.get(now), r)}</td>
                <td className="py-1.5 text-right text-[#666]">{before ? val(r.get(before), r) : "—"}</td>
                <td className="py-1.5 text-right">{diffText(r)}</td>
                <td className="py-1.5 text-right text-[#666]">{r.total ? `${fmt(r.total(now))}${r.unit}` : "—"}</td>
              </tr>
            ))}
            <tr className="border-t">
              <td className="py-1.5">利用率（累計）</td>
              <td className="py-1.5 text-right font-bold" colSpan={4}>
                {pctText(now.useRate)}
                <span className="ml-2 font-normal text-[#666]">
                  利用した{hhWord} {fmt(now.totalUsed)} ÷ 受け取った{hhWord} {fmt(now.totalReceived)}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-[12px] text-[#666]">
          うち貴社のご寄附の割合（{pctText(share * 100)}）で按分すると、利用した{hhWord}は累計 約{fmt(Math.round(now.totalUsed * share))}
          {hhWord}。
        </p>

        <h3 className="mt-7 mb-2 border-b pb-1 text-[14px] font-bold">3. 前の期間からの主な変化</h3>
        <ul className="list-disc space-y-1 pl-5 text-[13px]">
          {points.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>

        <h3 className="mt-7 mb-2 border-b pb-1 text-[14px] font-bold">4. 受け取った人の声（この期間・公開に同意したもの）</h3>
        {voices.length ? (
          <ul className="space-y-2 text-[13px]">
            {voices.map((v) => (
              <li key={v.id} className="border-l-2 border-[#dc7f68] pl-3">
                「{v.text}」<span className="ml-1 text-[12px] text-[#666]">{v.attrs}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-[#666]">この期間に公開に同意した声はありません。</p>
        )}

        <h3 className="mt-7 mb-2 border-b pb-1 text-[14px] font-bold">5. 市から</h3>
        <textarea
          value={notes[noteId] ?? ""}
          onChange={(e) => setNote(noteId, e.target.value)}
          placeholder="【自治体が記入】お礼、この期間の取り組み、次の期間の予定など"
          rows={4}
          className="w-full rounded-md border border-dashed border-[#e0612f]/60 bg-[#fdf1ec]/60 px-3 py-2 text-[13px] print:hidden"
          data-word-skip
        />
        <p data-fill className="hidden whitespace-pre-wrap" data-word-show>
          {notes[noteId] || "【自治体が記入】お礼、この期間の取り組み、次の期間の予定など"}
        </p>

        <h3 className="mt-7 mb-2 border-b pb-1 text-[14px] font-bold">数字の出どころ</h3>
        <ul className="list-disc space-y-0.5 pl-5 text-[12px] text-[#555]">
          <li>受け取り・利用：e街の発行・受取実績と利用実績（{c.kind === "観光" ? "会員ごと" : "世帯ごと。同じ世帯の家族のアカウントは1世帯"}に、初めて受け取った・利用した月で数える）</li>
          <li>満足度・{addWord}：利用した直後のアンケート（この期間の回答 {fmt(now.responses)}件）</li>
          <li>数字は事業全体。貴社分は事業費に占めるご寄附の割合で按分</li>
          <li>声は公開に同意したものだけ。属性はぼかして表示</li>
        </ul>
      </article>
    </div>
  );
}

function Tr({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <tr className="border-t first:border-t-0">
      <th className="w-40 py-1.5 text-left font-normal text-[#666]">{k}</th>
      <td className="py-1.5">{children}</td>
    </tr>
  );
}
