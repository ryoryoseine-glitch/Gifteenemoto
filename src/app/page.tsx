import Link from "next/link";
import { ArrowRight } from "lucide-react";

/** 提案の要点：本質は「思いをつなぐ」と「成果を返す」の2つ。新しく足すのはアンケートと報告書の作成 */
export default function Home() {
  return (
    <div className="mx-auto max-w-[980px] py-4">
      <p className="text-xs font-bold text-orange">giftee 提案（コンセプト版）</p>
      <h1 className="mt-2 text-[26px] leading-snug font-bold tracking-tight sm:text-[32px]">
        企業の寄附を、ギフトとして届け、
        <br />
        その成果を企業に返す
      </h1>
      <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
        必要なのは2つだけ。受け取った住民の思いを企業につなぐことと、寄附が何に届いたかを定量で返すこと。クーポンの発行・受け取り・消し込みは既存のe街のまま。
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Pillar
          no="1"
          title="思いをつなぐ"
          body="使った人のアンケートの声と結果が、寄附企業の社内共有ページに届く。社員が「自分の会社の寄附が届いた」と分かり、誇りにつながる。"
          answers="経団連調査の課題1位「活動に参加・協力する社員の広がり」70%"
          href="/share"
          link="寄附企業の社内共有ページ"
        />
        <Pillar
          no="2"
          title="成果を返す"
          body="自治体が期間（3か月ごと・毎月）を選ぶと、前の期間との差分が入った簡易報告書の原案ができる。Word で書き出して、市の名前で企業に送る。"
          answers="同じ調査の課題2〜4位「成果の評価」61〜65%、8位「レポーティング」47%"
          href="/muni/report"
          link="自治体の報告書の作成"
        />
      </div>

      <h2 className="mt-12 text-lg font-bold">新しく足すもの・既存のまま使うもの</h2>
      <div className="mt-3 overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[640px] text-[13px]">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-5 py-2 font-normal">誰の</th>
              <th className="px-3 py-2 font-normal">既存のまま（e街・市）</th>
              <th className="px-5 py-2 font-normal">新しく足すもの</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="px-5 py-3 font-medium whitespace-nowrap">受け取る住民</td>
              <td className="px-3 py-3 text-muted-foreground">市のサイト、会員登録、クーポンの受け取り、お店での消し込み</td>
              <td className="px-5 py-3">
                <Link href="/phone" className="font-bold text-link hover:underline">
                  使った直後の1分アンケート
                </Link>
                （Survey を流用。満足度・なければ利用しなかったか・初めてか・また利用したいか・ひとこと）→ お礼
              </td>
            </tr>
            <tr className="border-b">
              <td className="px-5 py-3 font-medium whitespace-nowrap">自治体</td>
              <td className="px-3 py-3 text-muted-foreground">e街の管理画面（発行・受取・利用実績、会員情報のデータ出力）、寄附の受領</td>
              <td className="px-5 py-3">
                <Link href="/muni/numbers" className="font-bold text-link hover:underline">
                  数字と声
                </Link>
                （Survey のダッシュボードを流用）、
                <Link href="/muni/report" className="font-bold text-link hover:underline">
                  報告書の Word 出力
                </Link>
              </td>
            </tr>
            <tr>
              <td className="px-5 py-3 font-medium whitespace-nowrap">寄附企業</td>
              <td className="px-3 py-3 text-muted-foreground">受領証、事業費の確定報告</td>
              <td className="px-5 py-3">
                <Link href="/corp" className="font-bold text-link hover:underline">
                  ダッシュボード
                </Link>
                （自治体と同じ数字と声。社内共有ページに公開する項目を選ぶ）、
                <Link href="/share" className="font-bold text-link hover:underline">
                  社内共有ページ
                </Link>
                （1枚。声と、企業が選んだ数字）。報告書は自治体から Word で届く
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="mt-12 text-lg font-bold">数字の出どころ</h2>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[13px] text-muted-foreground">
        <li>受け取り・利用：e街の発行・受取実績と利用実績。会員情報のデータ出力は公開資料に記載あり（e街チケットポータル提供開始のお知らせ、2024年1月）</li>
        <li>属性：会員の登録項目（子どもの人数・地区・年代など）。チケットと会員IDでひもづける前提（ギフティに確認中）</li>
        <li>満足度・追加性・声：このサービスのアンケート。利用の記録にひもづけて集計</li>
        <li>企業に渡すのは集計値とぼかした属性だけ。10件未満の区分は出さない</li>
      </ul>
      <p className="mt-8 text-xs text-muted-foreground">コンセプトプロトタイプ（非公式）。企業名・数字はすべて仮。</p>
    </div>
  );
}

function Pillar({ no, title, body, answers, href, link }: { no: string; title: string; body: string; answers: string; href: string; link: string }) {
  return (
    <section className="flex flex-col rounded-xl border bg-card p-6">
      <p className="text-xs font-bold text-orange">本質 {no}</p>
      <h2 className="mt-1 text-[20px] font-bold">{title}</h2>
      <p className="mt-2 flex-1 text-[14px] leading-relaxed">{body}</p>
      <p className="mt-3 text-xs text-muted-foreground">{answers}</p>
      <Link href={href} className="mt-4 inline-flex items-center gap-1 self-start text-[13px] font-bold text-link hover:underline">
        {link}
        <ArrowRight className="size-3.5" />
      </Link>
    </section>
  );
}
