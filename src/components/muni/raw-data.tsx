"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Section } from "@/components/shell/parts";
import { RAW_TABLES, type RawTableName } from "@/data/raw/types";
import { RAW_FILE_NAMES, csvFilesToRaw, parseCsv, rowsToTable, tableToCsv, tableToRows } from "@/lib/raw-csv";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/useApp";

/** 表ごとの説明（どこから来るデータか） */
const ABOUT: Record<RawTableName, { from: string; note: string }> = {
  members: { from: "e街", note: "会員登録の項目（仮名ID・世帯・登録項目の回答）" },
  tickets: { from: "e街", note: "発行と受け取り。1行＝1枚（回数券は1冊）" },
  redemptions: { from: "e街", note: "消し込み1回＝1行。事業者から届く消し込みと同じ粒度" },
  shops: { from: "e街", note: "加盟店と、その地区・市町村" },
  surveyResponses: { from: "このサービス", note: "使った直後のアンケート。利用の明細の ID で紐づく" },
  donations: { from: "市", note: "寄附の受領（企業・金額・日付・事業）" },
  baselines: { from: "市", note: "前年度の同じ数字（前年同期の比較に使う）" },
  reactions: { from: "このサービス", note: "社員からの共感の数" },
};

function saveText(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** 自治体の「元データ」：画面の数字の出どころになる明細。CSV で出し入れできる */
export function RawDataPage() {
  const caseId = useApp((s) => s.caseId);
  const master = useApp((s) => s.cases[s.caseId]);
  const raw = useApp((s) => s.raw[s.caseId]);
  const setRaw = useApp((s) => s.setRaw);
  const [table, setTable] = useState<RawTableName>("redemptions");
  const [msg, setMsg] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const rows = tableToRows(raw, table, master);
  const head = rows[0] ?? [];
  // 新しい行（スマホの操作で足した行）が見えるよう、末尾から出す
  const body = rows.slice(1).slice(-8).reverse();

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const got: Partial<Record<RawTableName, string>> = {};
    const skipped: string[] = [];
    for (const f of Array.from(files)) {
      const t = RAW_TABLES.find((x) => RAW_FILE_NAMES[x] === f.name || `${x}.csv` === f.name);
      if (t) got[t] = await f.text();
      else skipped.push(f.name);
    }
    const names = Object.keys(got) as RawTableName[];
    if (!names.length) {
      setMsg(`読み込める表がありませんでした（ファイル名を「${RAW_FILE_NAMES.redemptions}」などにしてください）`);
      return;
    }
    try {
      const next = { ...raw };
      for (const t of names) (next as Record<RawTableName, unknown>)[t] = rowsToTable(parseCsv(got[t]!), t, master);
      // 形の確認（読めない行があればここで例外）
      csvFilesToRaw(caseId, Object.fromEntries(names.map((t) => [t, got[t]!])), master);
      setRaw(next);
      setMsg(`${names.map((t) => `${RAW_FILE_NAMES[t]}（${next[t].length.toLocaleString()}行）`).join("・")} を読み込み、すべての画面の数字を計算し直しました${skipped.length ? `。読み込まなかったファイル：${skipped.join("、")}` : ""}`);
    } catch (e) {
      setMsg(`読み込めませんでした：${e instanceof Error ? e.message : String(e)}`);
    }
    if (input.current) input.current.value = "";
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={master.muni}
        title="元データ"
        sub="画面の数字（ダッシュボード・企業の画面・社内共有・報告書）は、すべてこの明細から計算しています。スマホで受け取る・使う・答えると、ここに1行ずつ増えます。"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => RAW_TABLES.forEach((t, i) => setTimeout(() => saveText(RAW_FILE_NAMES[t], tableToCsv(raw, t, master)), i * 250))}>
              <Download className="size-4" />
              すべての表をCSVで書き出す
            </Button>
            <Button size="sm" onClick={() => input.current?.click()}>
              <Upload className="size-4" />
              CSVを読み込む
            </Button>
            <input ref={input} type="file" accept=".csv,text/csv" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
          </div>
        }
      />
      {msg && <p className="rounded-md border bg-card px-4 py-2.5 text-[13px]">{msg}</p>}

      <Section title="表の一覧" meta={<span className="text-xs text-muted-foreground">表の形は e街のデータ出力に似せた仮のもの。実際の列名はギフティに確認</span>} bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-5 py-2 font-normal">表（ファイル名）</th>
                <th className="px-3 py-2 font-normal">出どころ</th>
                <th className="px-3 py-2 text-right font-normal">行数</th>
                <th className="px-3 py-2 font-normal">中身</th>
                <th className="px-5 py-2 font-normal" />
              </tr>
            </thead>
            <tbody>
              {RAW_TABLES.map((t) => (
                <tr key={t} className={cn("cursor-pointer border-b last:border-b-0 hover:bg-muted/50", table === t && "bg-brand-soft/60")} onClick={() => setTable(t)}>
                  <td className="px-5 py-2.5 font-medium">{RAW_FILE_NAMES[t]}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{ABOUT[t].from}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{raw[t].length.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{ABOUT[t].note}</td>
                  <td className="px-5 py-2.5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        saveText(RAW_FILE_NAMES[t], tableToCsv(raw, t, master));
                      }}
                    >
                      <Download className="size-3.5" />
                      CSV
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title={`${RAW_FILE_NAMES[table]} の新しい行`}
        meta={<span className="text-xs text-muted-foreground">新しい順に8行・全 {raw[table].length.toLocaleString()}行</span>}
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                {head.map((h) => (
                  <th key={h} className="px-3 py-2 font-normal whitespace-nowrap first:pl-5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((r, i) => (
                <tr key={i} className="border-b last:border-b-0">
                  {r.map((v, j) => (
                    <td key={j} className="max-w-[260px] truncate px-3 py-2 whitespace-nowrap tabular-nums first:pl-5" title={v}>
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
