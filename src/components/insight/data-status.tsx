"use client";

import { CircleCheck, CircleHelp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Section } from "@/components/shell/parts";

/** まだギフティに確認が要る数字につける印（docs/research/giftee-api.md の結果） */
export function NeedsCheck({ why }: { why: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            tabIndex={0}
            className="inline-flex cursor-help items-center gap-0.5 rounded border border-dashed border-muted-foreground/40 px-1 py-px align-middle text-[10px] font-normal text-muted-foreground"
          />
        }
      >
        <CircleHelp className="size-3" />
        要確認
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{why}</TooltipContent>
    </Tooltip>
  );
}

type Row = { metric: string; from: string; status: "ok" | "check" | "new"; note: string };

// 括弧の中は、ギフティ（e街）の管理画面のデータ出力の名前。公開されている API のフィールド名ではない
// （giftee for Business の公開 API は発行と参照だけで、利用の数値は非公開）
const ROWS: Row[] = [
  { metric: "配布数（発行実績）", from: "e街のデータ出力", status: "ok", note: "発行実績。管理画面ではリアルタイム" },
  { metric: "受取数（取得・購入データ）", from: "e街のデータ出力", status: "check", note: "「受取」がマイページへの取得を指すか確認" },
  { metric: "利用数（利用実績）", from: "e街のデータ出力", status: "ok", note: "利用実績。管理画面ではリアルタイム" },
  { metric: "使われた金額（精算データ）", from: "e街のデータ出力", status: "ok", note: "売上の自動集計・締日ごとの精算データ" },
  { metric: "事業者別・加盟店別（加盟店別精算データ）", from: "e街のデータ出力", status: "ok", note: "加盟店別の利用実績・精算データ" },
  { metric: "2回以上の利用・何回目か（利用実績の明細）", from: "e街のデータ出力", status: "check", note: "明細に会員IDかチケットIDと日時が入っているか" },
  { metric: "地区別・属性別（会員情報 × 利用実績）", from: "e街のデータ出力", status: "check", note: "属性情報とチケットIDの紐付けが必要と公式に注記あり" },
  { metric: "市町村別・周遊（周遊データ）", from: "e街のデータ出力", status: "check", note: "加盟店マスタに市町村を持っているか・出力の形" },
  { metric: "ギフト（企業）ごとの数（券種ごとの利用実績）", from: "e街の券種設定", status: "check", note: "寄附ギフトを1つの券種として出し、券種ごとに分けられるか" },
  { metric: "利用後のアンケート（なし）", from: "このサービスで新しく作る", status: "new", note: "取得条件のアンケートはあるが、使った後に出す形は公開情報になし" },
  { metric: "企業向けの集計値だけの出力（なし）", from: "このサービスで新しく作る", status: "new", note: "10件未満を出さない集計はギフティ側で作る必要がありそう" },
  { metric: "画面の更新の頻度", from: "外部への出力の方法しだい", status: "check", note: "利用実績を外から読むAPIか、定期のCSV出力があるか（管理画面自体はリアルタイム）" },
];

/** データの出どころと確認の状況（ダッシュボードの下に置く） */
export function DataSources({ only }: { only?: string[] }) {
  const rows = only ? ROWS.filter((r) => only.includes(r.metric)) : ROWS;
  return (
    <Section title="データの出どころ" meta={<span className="text-xs text-muted-foreground">括弧内は e街の管理画面のデータ出力の名前（公開APIのフィールド名ではない）・2026年9月時点</span>} bodyClassName="p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-[13px]">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-5 py-2 font-normal">数字（ギフティ側のデータの名前）</th>
              <th className="px-3 py-2 font-normal">取るところ</th>
              <th className="px-3 py-2 font-normal">状況</th>
              <th className="px-5 py-2 font-normal">確認すること・補足</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.metric} className="border-b last:border-b-0">
                <td className="px-5 py-2.5 font-medium">{r.metric}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{r.from}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {r.status === "ok" ? (
                    <span className="inline-flex items-center gap-1 text-up">
                      <CircleCheck className="size-3.5" />
                      確認済み
                    </span>
                  ) : r.status === "check" ? (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <CircleHelp className="size-3.5" />
                      ギフティに確認
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-orange">新しく作る</span>
                  )}
                </td>
                <td className="px-5 py-2.5 text-xs text-muted-foreground">{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
