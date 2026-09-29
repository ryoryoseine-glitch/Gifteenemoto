"use client";

import { cn } from "@/lib/utils";
import { fmt, pctText, yen } from "@/lib/format";
import { sum } from "@/lib/metrics";
import { Fill, Paper, reportNumbers, type ReportInput } from "./report-docs";

/** インパクト評価（別PDF）：数字はひな形に自動で入り、評価の中身・背景・考察は自治体が記入 */
export function ImpactReport(input: ReportInput & { readOnly?: boolean }) {
  const { c, donor, base, p, kind, readOnly } = input;
  const n = reportNumbers(input);
  // 成果は世帯（観光は利用した会員＝人）で数える。利用枚数・件数には掛けない
  const unit = n.kids ? "世帯" : "人";
  const usedWho = n.kids ? "利用した世帯" : "利用した人";
  const spend = n.agg && Array.isArray(n.agg.spend) && n.agg.spend[1] > 0 ? (n.agg.spend as number[]) : null;
  // 1人あたりの平均＝回答の合計 ÷ 回答数
  const spendAvg = spend ? spend[0] / spend[1] : 0;
  const key = `${c.id}-${donor.id}-${kind}`;

  const lm = n.kids
    ? [
        ["資源", "企業の寄附・市の予算"],
        ["活動", `${donor.giftName}を配布`],
        ["直接の結果", "受取・利用・利用回数・満足度"],
        ["初期成果", "親が休息や用事の時間を取れた／初めてサービスを使えた"],
        ["中期成果", "育児負担・孤立感の軽減"],
        ["長期成果", "親が安心して子育てできる"],
      ]
    : [
        ["資源", "旅先納税の寄附・企業の寄附"],
        ["活動", `${donor.giftName}を返礼品として配布`],
        ["直接の結果", "利用額・利用率・市町村別の利用・満足度"],
        ["初期成果", "周遊した／ギフトで来訪した／追加で消費した"],
        ["中期成果", "圏域の観光入込客数・観光消費額の増加"],
        ["長期成果", "圏域の地域経済の活性化"],
      ];
  const measured = 3;

  const outcomes = n.kids
    ? [
        ...(n.agg && Array.isArray(n.agg.isolation)
          ? [[
              "孤立感が「めったにない」「たまにある」",
              pctText(((n.agg.isolation[2] + n.agg.isolation[3]) / sum(n.agg.isolation)) * 100),
              "SIMI p.21 の設問。登録時の回答と比べると変化が分かる",
              "アンケート",
            ]]
          : []),
        ["初めてサービスを使った世帯", n.firstN != null ? `${fmt(n.firstN)} 世帯` : "—", `利用した世帯 ${fmt(n.t.usedHouseholds)} ×「初めて」${Math.round((base.firstTime ?? 0) * 100)}%`, "消し込み × アンケート"],
        ["クーポンがなければ利用しなかった", `${fmt(n.addUsers)} 世帯`, `利用した世帯 ${fmt(n.t.usedHouseholds)} ×「利用しなかった」${pctText(n.notw)}`, "消し込み × アンケート"],
        ["2回以上利用した（継続）", `${Math.round(p.repeat * 100)}%`, "同じ世帯の消し込み回数から", "消し込み"],
      ]
    : [
        ["2市町村以上をめぐった人", `${Math.round((p.tour ?? 0) * 100)}%`, "同じ利用者の消し込みの市町村数から", "消し込み"],
        ["ギフトがなければ来なかった人", `${fmt(n.addUsers)} 人`, `利用した人 ${fmt(n.t.usedHouseholds)} ×「来なかった」${pctText(n.notw)}`, "消し込み × アンケート"],
        ["同じ加盟店で2回以上利用", `${Math.round(p.repeat * 100)}%`, "同じ利用者の消し込みから", "消し込み"],
        ...(spend
          ? [[
              "ギフトがきっかけの、ギフト以外の消費（推計）",
              `${fmt(Math.round((n.addUsers * spendAvg) / 10000))}万円`,
              `「来なかった」${fmt(n.addUsers)}人 × 1人あたり平均 ${fmt(Math.round(spendAvg))}円（回答の合計 ${yen(spend[0])} ÷ 回答数 ${fmt(spend[1])}・実際に払った分）`,
              "消し込み × アンケート（交付金の新規消費喚起額と同じ考え方）",
            ]]
          : []),
      ];

  const shown = n.survey ? outcomes : outcomes.filter((o) => !String(o[3]).includes("アンケート"));

  return (
    <Paper>
      <div className="rounded-t-md border-b bg-brand-soft/60 px-6 py-6 sm:px-10">
        <p className="text-xs text-muted-foreground">
          インパクト評価（別PDF）／{kind === "mid" ? "中間" : "期末"}／{c.muni}
        </p>
        <h2 className="mt-1 text-[20px] font-bold">
          {base.name} の成果
        </h2>
        <p className="mt-0.5 text-[13px]">{donor.name} 様</p>
        {!readOnly && (
          <p className="mt-3 text-xs text-muted-foreground">
            数字は自動で入ります。<span className="font-medium text-orange">オレンジの欄</span>は自治体が記入します。求められた場合だけ、基本の報告書に加えて送ります。
          </p>
        )}
      </div>
      <div className="px-6 pb-10 sm:px-10">
        <Sec n="1" t="背景となる地域の課題">
          <Fill
            id={`${key}-bg`}
            readOnly={readOnly}
            placeholder={n.kids ? "例：市内の3歳未満児のうち保育園等に通っていない子の割合、子育ての孤立感に関する市民調査の結果など" : "例：圏域の観光入込客数の推移、札幌市以外への周遊の少なさなど"}
          />
        </Sec>

        <Sec n="2" t="ロジックモデル" note="内閣府「ロジック・モデル作成のポイント」の段階にそろえる">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-6">
            {lm.map(([k, v], i) => (
              <div key={k} className={cn("rounded-md border px-2.5 py-2", i <= measured ? "border-primary bg-brand-soft" : "border-dashed")}>
                <div className={cn("text-[11px] font-bold", i <= measured ? "text-brand" : "text-muted-foreground")}>{k}</div>
                <div className="mt-0.5 text-xs leading-snug">{v}</div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">青い枠がこの評価で測った範囲。中期・長期成果は自治体の既存調査で追う。</p>
        </Sec>

        <Sec n="3" t="初期成果" note="値・計算式・データ元">
          <table className="w-full border text-[13px]">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">成果</th>
                <th className="px-3 py-2 font-medium">値</th>
                <th className="px-3 py-2 font-medium">計算</th>
                <th className="px-3 py-2 font-medium">データ元</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((o) => (
                <tr key={o[0]} className="border-b last:border-b-0">
                  <td className="px-3 py-2">{o[0]}</td>
                  <td className="px-3 py-2 font-bold whitespace-nowrap tnum">{o[1]}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground tnum">{o[2]}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{o[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Sec>

        <Sec n="4" t="事業がなくても起きた分（デッドウェイト）">
          {!n.survey ? (
            <p className="text-[13px] text-muted-foreground">この事業ではアンケートをしていないため、測れていない。</p>
          ) : (
            <>
          <p className="text-[13px] leading-relaxed">
            「{n.kids ? "クーポンがなくても利用した" : "ギフトがなくても来た"}」<b className="tnum">{pctText(n.dead)}</b>、「たぶん{n.kids ? "利用した" : "来た"}」
            <b className="tnum">{pctText(n.maybe)}</b>。上の成果は、この分を除いた「{n.kids ? "利用しなかった" : "来なかった"}」<b className="tnum">{pctText(n.notw)}</b>だけを使っている。
          </p>
          <p className="mt-2 text-[13px] leading-relaxed">
            「たぶん」の数え方には決まった基準がない（慶應SFC SROIガイドライン p.18）ため、幅で示す：追加性 <b className="tnum">{pctText(n.notw)}</b>（厳しめ）〜{" "}
            <b className="tnum">{pctText(n.notw + n.maybe)}</b>（「たぶん」を含む）。
          </p>
          <table className="mt-3 w-full border text-[13px] tnum">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">比較する事業</th>
                <th className="px-3 py-2 font-medium">新規の消費・来訪の割合</th>
                <th className="px-3 py-2 font-medium">出典</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["この事業（厳しめ〜広め）", `${pctText(n.notw)}〜${pctText(n.notw + n.maybe)}`, "利用後アンケート"],
                ["地域振興券（平成11年）", "32%", "内閣府 交付金の効果検証 p.10"],
                ["定額給付金（平成21年）", "25%", "同 p.10"],
                ["プレミアム付商品券（使用額ベース）", "35.7%", "同 p.6 の数値から計算"],
                ["新潟 トキめき鉄道 割引きっぷ", "33%", "同 p.38"],
              ].map((r, i) => (
                <tr key={r[0]} className={cn("border-b last:border-b-0", i === 0 && "font-bold")}>
                  <td className="px-3 py-2">{r[0]}</td>
                  <td className="px-3 py-2">{r[1]}</td>
                  <td className="px-3 py-2 text-xs font-normal text-muted-foreground">{r[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
            </>
          )}
        </Sec>

        <Sec n="5" t="貴社の寄附の按分" note={`寄附は事業全体の財源に入るため、事業費に占める貴社の寄附の割合で按分（中間＝事業費の予算、期末＝確定した事業費。この報告は${n.budgetBasis === "確定" ? "確定した事業費" : "予算"}）`}>
          <table className="w-full border text-[13px] tnum">
            <tbody>
              <tr className="border-b">
                <th className="w-[44%] bg-muted/50 px-3 py-2 text-left text-xs font-medium text-muted-foreground">事業費に占める貴社の寄附</th>
                <td className="px-3 py-2">
                  {yen(donor.amount)} ／ {yen(n.giftBudget)}（事業費の{n.budgetBasis === "確定" ? "確定額" : "予算"}・{pctText(n.share * 100)}）
                </td>
              </tr>
              <tr className="border-b">
                <th className="bg-muted/50 px-3 py-2 text-left text-xs font-medium text-muted-foreground">按分した「なければ{n.kids ? "利用しなかった" : "来なかった"}」</th>
                <td className="px-3 py-2">{n.survey ? `${fmt(Math.round(n.addUsers * n.share))} ${unit}` : "アンケートなし"}</td>
              </tr>
              <tr>
                <th className="bg-muted/50 px-3 py-2 text-left text-xs font-medium text-muted-foreground">{n.kids ? "利用1世帯あたりの寄附" : "利用者1人あたりの寄附"}</th>
                <td className="px-3 py-2">
                  {n.perHousehold == null ? "—" : `約 ${fmt(Math.round(n.perHousehold / 100) * 100)} 円`}
                  <span className="ml-2 text-xs text-muted-foreground">
                    貴社の寄附 ÷ 按分した{n.kids ? "利用世帯" : "利用者"}（{usedWho} {fmt(n.t.usedHouseholds)}{unit} × {pctText(n.share * 100)} ≒ {fmt(Math.round(n.usedHouseholdsShare))}{unit}）
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </Sec>

        <Sec n="6" t="評価の方法と限界">
          <ul className="list-disc space-y-1 pl-5 text-[13px] leading-relaxed">
            <li>直接の結果は、ギフトの消し込み記録（全数）から集計。</li>
            <li>
              {n.survey
                ? `初期成果は、利用後アンケート（回答率 ${pctText(n.respRate)}）と消し込み記録を掛け合わせて算出。回答した人に偏りがありうる。`
                : "この事業ではアンケートをしていないため、初期成果は消し込み記録から分かるものだけ。"}
            </li>
            <li>{n.kids ? "利用の前倒しや、他の支援で代わりに利用した分" : "ほかの旅行予定からの振り替え"}は、アンケートだけでは測れないため含めていない。</li>
          </ul>
          <div className="mt-3">
            <Fill id={`${key}-limit`} readOnly={readOnly} rows={2} placeholder="例：この事業に固有の限界、ほかの施策との重なりなど" />
          </div>
        </Sec>

        <Sec n="7" t="考察と次年度に向けて">
          <Fill id={`${key}-next`} readOnly={readOnly} rows={4} placeholder="例：利用の少ない地区への周知、事業者の追加、次年度の目標値など" />
        </Sec>

        <Sec n="付録" t="参考にした基準">
          <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-muted-foreground">
            <li>内閣府「社会的インパクト評価 ロジック・モデル作成のポイント」</li>
            <li>SIMI「社会的インパクト評価ツールセット 子育て支援」</li>
            <li>観光庁「DMOのKGI・KPI計測に係る手引書」</li>
            <li>内閣府「地域消費喚起・生活支援型交付金の効果検証」</li>
            <li>慶應SFC「SROI実施ガイドライン」／中小企業庁「インパクト測定・マネジメントツール」</li>
          </ul>
        </Sec>
      </div>
    </Paper>
  );
}

function Sec({ n, t, note, children }: { n: string; t: string; note?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mt-9 mb-3 flex flex-wrap items-baseline gap-x-3 border-b pb-1.5">
        <h3 className="text-[15px] font-bold">
          <span className="mr-2 text-brand">{n}</span>
          {t}
        </h3>
        {note && <span className="text-xs text-muted-foreground">{note}</span>}
      </div>
      {children}
    </section>
  );
}
