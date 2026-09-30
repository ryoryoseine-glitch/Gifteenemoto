"use client";

import { Fragment, useState } from "react";
import { Download } from "lucide-react";
import { downloadWord } from "@/lib/word";
import { fmt, pctText, yen } from "@/lib/format";
import { TODAY, addDays, periodStats, periodVoices, periodsOf, previousRange, rangeLabel, type PeriodStats } from "@/lib/period";
import { MIN_CELL, sum } from "@/lib/metrics";
import { analyze, attrOptions } from "@/lib/analysis";
import { itemValues } from "@/lib/items";
import { useApp, useCase } from "@/store/useApp";
import { PageHeader } from "@/components/shell/parts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

  const cur = keys.includes(key) ? key : keys[0];
  const [name, projectId] = cur.split("|");
  const p = c.projects.find((x) => x.id === projectId)!;
  const ds = c.donors.filter((d) => keyOf(d) === cur);
  const amount = sum(ds.map((d) => d.amount));
  const share = p.budget ? amount / p.budget : 0;

  // 期間は自由に選べる（開始日〜終了日。終了日を含む）。既定は直近の3か月の区切り
  const start = periodsOf(p, 1)[0]?.from ?? TODAY;
  const quarters = periodsOf(p, 3);
  const lastQ = quarters[quarters.length - 1];
  const endOfProject = addDays(periodsOf(p, 1).slice(-1)[0]?.to ?? addDays(TODAY, 1), -1);
  const cap = (d: string) => (d > TODAY ? TODAY : d);
  const [range, setRange] = useState<{ from: string; last: string } | null>(null);
  const r = range ?? { from: lastQ?.from ?? start, last: cap(addDays(lastQ?.to ?? addDays(TODAY, 1), -1)) };
  const per = { from: r.from, to: addDays(r.last, 1), label: rangeLabel(r.from, addDays(r.last, 1)), key: `${r.from}_${r.last}`, partial: r.last >= TODAY && endOfProject > TODAY };
  const pr = previousRange(per.from, per.to);
  const prev = pr.to > start ? { ...pr, from: pr.from < start ? start : pr.from, label: rangeLabel(pr.from < start ? start : pr.from, pr.to) } : null;
  const presets = [
    { label: "直近の3か月の区切り", from: lastQ?.from ?? start, last: cap(addDays(lastQ?.to ?? addDays(TODAY, 1), -1)) },
    { label: "今月", from: `${TODAY.slice(0, 7)}-01`, last: TODAY },
    { label: "事業開始から", from: start, last: cap(endOfProject) },
  ];

  const now = periodStats(c, raw, projectId, per);
  const before = prev ? periodStats(c, raw, projectId, prev) : null;
  const voices = periodVoices(c, raw, projectId, per, hidden).slice(0, 3);

  const hhWord = c.kind === "観光" ? "人" : "世帯";
  const addWord = c.kind === "観光" ? "なければ来なかった" : "なければ利用しなかった";
  const rows: (Row & { group: "e街の記録" | "アンケート" })[] = [
    { group: "e街の記録", label: `新しく受け取った${hhWord}`, unit: hhWord, get: (s) => s.newReceived, total: (s) => s.totalReceived },
    { group: "e街の記録", label: `新しく利用した${hhWord}`, unit: hhWord, get: (s) => s.newUsed, total: (s) => s.totalUsed },
    { group: "e街の記録", label: "利用の数", unit: "枚", get: (s) => s.uses },
    { group: "アンケート", label: "回答数", unit: "件", get: (s) => s.responses },
    { group: "アンケート", label: "満足・やや満足", unit: "%", get: (s) => s.satTop2, rate: true },
    { group: "アンケート", label: addWord, unit: "%", get: (s) => s.notWithout, rate: true },
    { group: "アンケート", label: "初めて利用した", unit: "%", get: (s) => s.first, rate: true },
    { group: "アンケート", label: "また利用したい", unit: "%", get: (s) => s.again, rate: true },
  ];
  const whoAttr = attrOptions(c)[0];
  const who = analyze(c, raw, projectId, whoAttr?.key ?? "").rows.filter((r) => r.value !== "ひもづけなし" && r.receivedHH >= MIN_CELL);
  const where = itemValues(c, raw, projectId).where.slice(0, 5);

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

  const noteId = `${cur}|${per.key}`;
  const items = keys.map((k) => {
    const [n, pid] = k.split("|");
    return { value: k, label: `${n.replace("株式会社", "")}｜${c.projects.find((x) => x.id === pid)?.name ?? ""}` };
  });

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
          <Select items={items} value={cur} onValueChange={(v) => v && setKey(v as string)}>
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
        <div className="grid gap-1 text-xs text-muted-foreground">
          期間（終了日を含む）
          <div className="flex items-center gap-1.5">
            <input
              id="report-from"
              type="date"
              value={r.from}
              min={start}
              max={r.last}
              onChange={(e) => e.target.value && setRange({ from: e.target.value, last: r.last })}
              className="h-8 rounded-md border bg-card px-2 text-[13px] text-foreground tnum"
              aria-label="開始日"
            />
            <span>〜</span>
            <input
              id="report-last"
              type="date"
              value={r.last}
              min={r.from}
              max={cap(endOfProject)}
              onChange={(e) => e.target.value && setRange({ from: r.from, last: e.target.value })}
              className="h-8 rounded-md border bg-card px-2 text-[13px] text-foreground tnum"
              aria-label="終了日"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 pb-0.5">
          {presets.map((x) => (
            <button
              key={x.label}
              type="button"
              onClick={() => setRange({ from: x.from, last: x.last })}
              className={
                x.from === r.from && x.last === r.last
                  ? "rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground"
                  : "rounded-full border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
              }
            >
              {x.label}
            </button>
          ))}
        </div>
        <p className="w-full text-xs text-muted-foreground">前の期間：{prev ? `${prev.label}（同じ長さのすぐ前）` : "なし（事業開始より前）"}</p>
      </div>

      <article data-report-doc className="mx-auto max-w-[820px] rounded-lg border bg-white px-8 py-8 text-[#232323] shadow-sm sm:px-12">
        <p className="text-[13px]">{name} 様</p>
        <h2 className="mt-3 text-[20px] leading-snug font-bold">
          {p.name} ご報告（{per.label}
          {per.partial ? "・途中経過" : ""}）
        </h2>
        <p className="mt-1 text-[12px] text-[#666]">{c.muni}</p>

        <H3>1. ご寄附と事業</H3>
        <table className="w-full text-[13px]">
          <tbody>
            <Tr k="ご寄附">
              {yen(amount)}（{ds.map((d) => d.donatedOn).filter(Boolean).join("・")}）
            </Tr>
            <Tr k="事業費">
              {yen(p.budget)}（ご寄附の割合 {pctText(share * 100)}）
            </Tr>
            <Tr k="ご寄附で届けたもの">{ds.map((d) => d.giftName).join("・")}</Tr>
            <Tr k="事業の目的・対象">
              <Fill>地域再生計画の事業の目的と対象</Fill>
            </Tr>
          </tbody>
        </table>

        <H3>2. 実績と効果（{per.label}）</H3>
        <table className="w-full text-[13px] tabular-nums">
          <thead>
            <tr className="text-left text-[12px] text-[#666]">
              <th className="py-1.5 font-normal">項目</th>
              <th className="py-1.5 text-right font-normal">この期間</th>
              <th className="py-1.5 text-right font-normal">前の期間</th>
              <th className="py-1.5 text-right font-normal">変化</th>
              <th className="py-1.5 text-right font-normal">事業開始からの累計</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <Fragment key={r.label}>
                {(i === 0 || rows[i - 1].group !== r.group) && (
                  <tr>
                    <td colSpan={5} className="pt-3 pb-1 text-[12px] font-bold text-[#666]">
                      {r.group === "e街の記録" ? "発行〜消し込みの記録から" : "使った直後のアンケートから"}
                    </td>
                  </tr>
                )}
                <tr className="border-t">
                  <td className="py-1.5">{r.label}</td>
                  <td className="py-1.5 text-right font-bold">{val(r.get(now), r)}</td>
                  <td className="py-1.5 text-right text-[#666]">{before ? val(r.get(before), r) : "—"}</td>
                  <td className="py-1.5 text-right">{diffText(r)}</td>
                  <td className="py-1.5 text-right text-[#666]">{r.total ? `${fmt(r.total(now))}${r.unit}` : "—"}</td>
                </tr>
                {r.label === "利用の数" && (
                  <tr className="border-t">
                    <td className="py-1.5">利用率（累計）</td>
                    <td className="py-1.5 text-right font-bold" colSpan={4}>
                      {pctText(now.useRate)}
                      <span className="ml-2 font-normal text-[#666]">
                        利用した{hhWord} {fmt(now.totalUsed)} ÷ 受け取った{hhWord} {fmt(now.totalReceived)}・まだ使っていない {fmt(now.totalReceived - now.totalUsed)}
                        {hhWord}
                      </span>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[12px] text-[#666]">
          数字は事業全体。貴社のご寄附の割合（{pctText(share * 100)}）で按分すると、利用した{hhWord}は累計 約{fmt(Math.round(now.totalUsed * share))}
          {hhWord}。
        </p>

        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-[12px] font-bold text-[#666]">誰に届いたか（{whoAttr?.label}・累計）</p>
            <table className="w-full text-[13px] tabular-nums">
              <tbody>
                {who.map((r) => (
                  <tr key={r.value} className="border-t">
                    <td className="py-1">{r.value}</td>
                    <td className="py-1 text-right">
                      {fmt(r.receivedHH)}
                      {hhWord}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <p className="mb-1 text-[12px] font-bold text-[#666]">どこで使われたか（上位5・累計）</p>
            <table className="w-full text-[13px] tabular-nums">
              <tbody>
                {where.map(([k, n]) => (
                  <tr key={k} className="border-t">
                    <td className="py-1">{k}</td>
                    <td className="py-1 text-right">{fmt(n)}枚</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <H3>3. 前の期間からの主な変化</H3>
        <ul className="list-disc space-y-1 pl-5 text-[13px]">
          {points.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>

        <H3>4. 利用者の声（この期間・公開に同意したもの）</H3>
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

        <H3>5. 担当者の声・写真</H3>
        <textarea
          value={notes[noteId] ?? ""}
          onChange={(e) => setNote(noteId, e.target.value)}
          placeholder="【自治体が記入】お礼、この期間の取り組み、次の期間の予定"
          rows={4}
          className="w-full rounded-md border border-dashed border-[#e0612f]/60 bg-[#fdf1ec]/60 px-3 py-2 text-[13px]"
          data-word-skip
        />
        <p data-fill className="hidden whitespace-pre-wrap" data-word-show>
          {notes[noteId] || "【自治体が記入】お礼、この期間の取り組み、次の期間の予定"}
        </p>
        <div className="mt-2">
          <Fill>事業の写真（転載の可否・撮影者）</Fill>
        </div>

        <H3>数字の出どころ</H3>
        <ul className="list-disc space-y-0.5 pl-5 text-[12px] text-[#555]">
          <li>受け取り・利用：e街の発行〜消し込みの記録（{c.kind === "観光" ? "会員ごと" : "世帯ごと。同じ世帯の家族のアカウントは1世帯"}に、初めて受け取った・利用した月で数える）</li>
          <li>誰に届いたか：会員情報の登録項目。10件未満の区分は出さない</li>
          <li>満足度など：利用した直後のアンケート（giftee Survey）。この期間の回答 {fmt(now.responses)}件</li>
          <li>声は公開に同意したものだけ。属性はぼかして表示</li>
        </ul>
      </article>

      <section className="mx-auto mt-6 max-w-[820px] rounded-lg border bg-card px-6 py-5 text-[13px]" aria-label="報告書の項目の根拠">
        <p className="font-bold">この報告書の項目の根拠</p>
        <ul className="mt-2 space-y-1.5 text-muted-foreground">
          <li>
            1・4・5（寄附・事業・件数・声・写真）：宇和島市 企業版ふるさと納税 実績報告書 p.2〜15{" "}
            <a className="text-link hover:underline" href="https://www.city.uwajima.ehime.jp/uploaded/attachment/62443.pdf" target="_blank" rel="noreferrer">
              PDF
            </a>
          </li>
          {SOURCES.map((x) => (
            <li key={x.name}>
              2（{x.items}）：{x.name}{" "}
              <a className="text-link hover:underline" href={x.url} target="_blank" rel="noreferrer">
                PDF
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">Word には書き出さない（自治体の画面だけ）</p>
      </section>
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

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-7 mb-2 border-b pb-1 text-[14px] font-bold">{children}</h3>;
}

function Fill({ children }: { children: React.ReactNode }) {
  return (
    <span data-fill className="block rounded-md border border-dashed border-[#e0612f]/60 bg-[#fdf1ec]/60 px-3 py-1.5 text-[13px] text-[#c8542a]">
      【自治体が記入】{children}
    </span>
  );
}

/** 2 の項目の根拠（電子クーポン・商品券の効果検証から効果だけを抜き出したもの） */
const SOURCES = [
  { name: "世田谷区 せたがやPay 効果検証 p.2〜6", items: "使った人の数・誰に届いたか・前回比・満足度・続けたいか", url: "https://www.city.setagaya.lg.jp/documents/25180/1110_07.pdf" },
  { name: "三鷹市 みたかデジタル商品券 事業実施報告書 p.68・p.103", items: "利用率・前回比・初めて", url: "https://www.city.mitaka.lg.jp/c_service/112/attached/attach_112114_2.pdf" },
  { name: "四日市市 よんデジ券 事業報告書 p.46・p.83・p.110", items: "利用率・使わなかった人・追加性・声", url: "https://www.city.yokkaichi.lg.jp/www/contents/1693443279922/files/yondezi.pdf" },
  { name: "目黒区 めぐろデジタル商品券 効果検証 概要版 p.3〜5", items: "どこで使われたか・誰に届いたか・初めて・追加性", url: "https://www.city.meguro.tokyo.jp/documents/16727/gaiyo.pdf" },
  { name: "神奈川県 かながわPay 第3弾 アンケートレポート p.18・p.41〜42", items: "続けたいか・回答数", url: "https://www.pref.kanagawa.jp/documents/110308/7-3_anke-to3v2.pdf" },
];
