"use client";

import { useCase } from "@/store/useApp";
import { PageHeader, Section } from "@/components/shell/parts";

type Row = { item: string; detail: string; status: "公開資料に記載" | "要確認"; src: { label: string; url: string } };

/** 既存のダッシュボード（e街の管理画面・giftee Survey）にあると想定している項目。作らずに使う前提のもの */
const ROWS: Row[] = [
  {
    item: "発行・受取・利用の実績",
    detail: "チケットの発行・受け取り・利用の数をリアルタイムで確認",
    status: "公開資料に記載",
    src: { label: "e街チケットポータル FAQ", url: "https://emachi-platform.jp/service/ticket-portal" },
  },
  {
    item: "データのダウンロード（発行実績・利用実績・精算データ）",
    detail: "実績と精算を CSV などで出力",
    status: "公開資料に記載",
    src: { label: "ギフティ説明資料 2024年1月版 p.12", url: "https://kanko-dx.go.jp/wp-content/uploads/2025/02/eb79611972ecd73e991b7c0796f380fd.pdf" },
  },
  {
    item: "会員情報・取得／購入データの出力",
    detail: "会員の登録情報と、クーポンの取得の記録を出力",
    status: "公開資料に記載",
    src: { label: "e街チケットポータル提供開始（2024年1月11日）", url: "https://giftee.co.jp/pressrelease20240111_02/" },
  },
  {
    item: "加盟店別の実績・精算",
    detail: "どの店舗でいくら・何枚使われたか",
    status: "公開資料に記載",
    src: { label: "ギフティ説明資料 2024年1月版 p.12", url: "https://kanko-dx.go.jp/wp-content/uploads/2025/02/eb79611972ecd73e991b7c0796f380fd.pdf" },
  },
  {
    item: "時系列・利用者属性別・加盟店属性別・周遊の分析",
    detail: "利用者属性別は「属性情報とチケットIDの紐付けが必要」と注記あり",
    status: "公開資料に記載",
    src: { label: "ギフティ説明資料 2025年1月版 p.29", url: "https://kanko-dx.go.jp/wp-content/uploads/2025/02/439e55f093c79a3909a92d7b0d27355a.pdf" },
  },
  {
    item: "利用の明細（1件ずつ）",
    detail: "チケットID・会員ID・券種・加盟店・日時・金額・枚数が1行ずつ出るか",
    status: "要確認",
    src: { label: "e街チケットポータル FAQ（出力の列は非公開）", url: "https://emachi-platform.jp/service/ticket-portal" },
  },
  {
    item: "アンケートの回答（giftee Survey）",
    detail: "回答をリアルタイムで確認。集計画面・CSV・回答にIDを残せるかは要確認",
    status: "要確認",
    src: { label: "giftee Survey", url: "https://giftee.biz/giftee-plus-solutions/survey/" },
  },
];

/** 利用の明細の想定の列（会員IDでひもづく場合） */
const COLUMNS = ["利用日時", "チケットID", "会員ID", "券種（クーポン）", "加盟店", "加盟店の地区", "金額", "枚数", "アンケートの回答の有無"];

export function ExistingDashboard() {
  const c = useCase();
  return (
    <div className="space-y-5">
      <PageHeader eyebrow={`${c.muni}・既存`} title="既存のダッシュボードにある想定の項目" sub="e街の管理画面と giftee Survey にすでにあるもの。このサービスでは作らず、そのまま使う前提" />

      <Section title="項目と出どころ" bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-[13px]">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-5 py-2 font-normal">項目</th>
                <th className="px-3 py-2 font-normal">中身</th>
                <th className="px-3 py-2 font-normal">状況</th>
                <th className="px-5 py-2 font-normal">出どころ</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.item} className="border-b last:border-b-0">
                  <td className="px-5 py-2.5 font-medium">{r.item}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{r.detail}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className={r.status === "要確認" ? "rounded bg-orange-soft px-1.5 py-px text-[11px] font-bold text-orange" : "rounded bg-brand-soft px-1.5 py-px text-[11px] font-bold text-brand"}>{r.status}</span>
                  </td>
                  <td className="px-5 py-2.5 text-xs">
                    <a href={r.src.url} target="_blank" rel="noreferrer" className="text-link hover:underline">
                      {r.src.label}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="利用の明細（想定の列）" meta={<span className="text-xs text-muted-foreground">会員IDでひもづく場合。1回の消し込みが1行</span>}>
        <div className="flex flex-wrap gap-1.5">
          {COLUMNS.map((x) => (
            <span key={x} className="rounded-md border bg-muted/50 px-2.5 py-1 text-xs">
              {x}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          アンケートに答えた利用は「利用実績・アンケート結果」の自由記述の欄に、同じ会員ID・チケットIDで出る。答えなかった利用は、この明細で見る想定。
        </p>
      </Section>
    </div>
  );
}
