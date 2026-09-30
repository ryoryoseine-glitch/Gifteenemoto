/** 提案の要点：価値 → 課題 → 体験 → 実装 のロジックツリー（静的な SVG） */

type Kind = "v" | "k" | "e" | "i";
type Impl = "old" | "new" | "chk";
type Node = { c: Kind; s?: Impl; y: number; t: string[] };

const COL: Record<Kind, { x: number; w: number }> = { v: { x: 12, w: 180 }, k: { x: 236, w: 214 }, e: { x: 494, w: 236 }, i: { x: 774, w: 238 } };
const MEMO_X = 1030;
const H = 62;

const STYLE: Record<Kind | Impl, { box: string; ink: string }> = {
  v: { box: "fill-[#1d2742] stroke-[#1d2742] dark:fill-[#34426a] dark:stroke-[#34426a]", ink: "fill-white" },
  k: { box: "fill-orange-soft stroke-orange/40", ink: "fill-foreground" },
  e: { box: "fill-card stroke-border", ink: "fill-foreground" },
  i: { box: "fill-card stroke-border", ink: "fill-foreground" },
  old: { box: "fill-muted stroke-muted-foreground", ink: "fill-foreground" },
  new: { box: "fill-orange-soft stroke-orange", ink: "fill-foreground" },
  chk: { box: "fill-amber-100 stroke-amber-600 dark:fill-amber-950 dark:stroke-amber-500", ink: "fill-foreground" },
};
const TAG: Record<Impl, { label: string; fill: string }> = {
  old: { label: "既存", fill: "fill-muted-foreground" },
  new: { label: "新規", fill: "fill-orange" },
  chk: { label: "要確認", fill: "fill-amber-600 dark:fill-amber-500" },
};

const N: Record<string, Node> = {
  V1: { c: "v", y: 160, t: ["① 思いをつなぐ", "使用者・自治体・企業"] },
  E1: { c: "e", y: 60, t: ["使用者が", "コメントを書ける"] },
  E2: { c: "e", y: 160, t: ["自治体が", "コメントを精査できる"] },
  E3: { c: "e", y: 262, t: ["企業が", "コメントを見られる"] },
  I1: { c: "i", s: "old", y: 60, t: ["giftee Survey"] },
  I2: { c: "i", s: "chk", y: 130, t: ["Survey の集計機能に", "発行〜消し込みのデータを追加"] },
  I3: { c: "i", s: "new", y: 196, t: ["企業への共有の設定"] },
  I4: { c: "i", s: "new", y: 262, t: ["企業の共有ページ"] },

  V2: { c: "v", y: 440, t: ["② 成果を返す", "自治体 → 企業"] },
  K1: { c: "k", y: 368, t: ["自治体：成果報告の", "手間がかけられない"] },
  K2: { c: "k", y: 440, t: ["自治体：数値の計測が", "難しい"] },
  K3: { c: "k", y: 512, t: ["企業：インパクト計測が", "難しい・追加費用になる"] },
  E4: { c: "e", y: 404, t: ["自治体がギフティのデータで", "簡単に成果報告できる"] },
  E5: { c: "e", y: 512, t: ["企業が報告を", "共有してもらい見られる"] },
  I5: { c: "i", s: "old", y: 360, t: ["Survey の既存機能", "（回答・集計）"] },
  I6: { c: "i", s: "new", y: 430, t: ["利用者IDとのひもづけ", "発行〜消し込みのデータ・", "会員情報・Survey の結果"] },
  I7: { c: "i", s: "new", y: 500, t: ["簡易報告書の", "Word 生成"] },
};

const MEMO: Record<string, string[]> = {
  I1: ["本来は「回答 → ギフト発行」の順の仕組み", "ここでは逆に「ギフト利用 → 回答」の順で使う", "SurveyMonkey・Qualtrics などと連携可"],
  I2: ["公開情報は「リアルタイムで確認可能」まで", "発行〜消し込みのデータを入れられるかは不明", "→ サービス資料・管理画面マニュアルで確認"],
  I3: ["自治体が「企業に出さない」声を外す", "企業が社内共有ページに出す数字・声を選ぶ", "属性はぼかす（例：30代の母・未就学）"],
  I4: ["声と、企業が選んだ数字を表示", "同じ仕組みで報告書も置ける"],
  I5: ["回答データの出力形式（CSV・API）を確認", "出力にチケットID・会員IDが入るか"],
  I6: ["消し込み後の Survey のURLにチケットIDを付ける", "発行〜消し込み・会員情報・Survey の結果を", "会員ID・チケットIDで結合", "会員情報の出力は公開資料に記載あり（2024年1月）"],
  I7: ["集計結果をひな形に差し込んで .docx を生成", "期間を自由に選び、前の期間との差分も入る", "自治体が Word で追記して送る"],
};

const EDGES: [string, string][] = [
  ["V1", "E1"],
  ["V1", "E2"],
  ["V1", "E3"],
  ["E1", "I1"],
  ["E2", "I2"],
  ["E2", "I3"],
  ["E3", "I4"],
  ["V2", "K1"],
  ["V2", "K2"],
  ["V2", "K3"],
  ["K1", "E4"],
  ["K2", "E4"],
  ["K3", "E5"],
  ["E4", "I5"],
  ["E4", "I6"],
  ["E4", "I7"],
  ["E5", "I7"],
];

export function LogicTree() {
  return (
    <svg viewBox="0 0 1340 560" role="img" aria-label="価値から課題・体験・実装へのロジックツリー" className="block h-auto w-full min-w-[1200px]">
      <defs>
        <marker id="arw" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" className="fill-muted-foreground" />
        </marker>
      </defs>
      <g className="fill-muted-foreground text-[12px] font-bold">
        {(
          [
            ["価値", COL.v.x],
            ["課題", COL.k.x],
            ["体験", COL.e.x],
            ["実装", COL.i.x],
            ["技術メモ", MEMO_X],
          ] as const
        ).map(([t, x]) => (
          <text key={t} x={x + 4} y={18}>
            {t}
          </text>
        ))}
      </g>
      <line x1={12} x2={1328} y1={318} y2={318} className="stroke-border" strokeDasharray="4 4" />
      <g fill="none" className="stroke-muted-foreground/70" strokeWidth={1.4}>
        {EDGES.map(([a, b]) => {
          const A = N[a];
          const B = N[b];
          const x1 = COL[A.c].x + COL[A.c].w;
          const x2 = COL[B.c].x - 4;
          const mx = (x1 + x2) / 2;
          return <path key={a + b} d={`M${x1},${A.y} C${mx},${A.y} ${mx},${B.y} ${x2},${B.y}`} markerEnd="url(#arw)" />;
        })}
      </g>
      {Object.entries(N).map(([id, n]) => {
        const c = COL[n.c];
        const st = STYLE[n.c === "i" && n.s ? n.s : n.c];
        const lh = 18;
        const top = n.y - ((n.t.length - 1) * lh) / 2 + 5;
        const memo = MEMO[id];
        return (
          <g key={id}>
            <rect x={c.x} y={n.y - H / 2} width={c.w} height={H} rx={9} strokeWidth={1.2} className={st.box} />
            {n.t.map((t, i) => (
              <text
                key={t}
                x={c.x + 14}
                y={top + i * lh}
                className={`${st.ink} ${n.c === "v" && i === 0 ? "text-[15px] font-bold" : "text-[13px]"} ${n.c === "e" && i === n.t.length - 1 ? "font-bold" : ""}`}
              >
                {t}
              </text>
            ))}
            {n.c === "i" && n.s && (
              <g>
                <rect x={c.x + c.w - TAG[n.s].label.length * 12 - 20} y={n.y - H / 2 + 7} width={TAG[n.s].label.length * 12 + 12} height={17} rx={4} className={TAG[n.s].fill} />
                <text x={c.x + c.w - (TAG[n.s].label.length * 12 + 12) / 2 - 8} y={n.y - H / 2 + 19.5} textAnchor="middle" className="fill-background text-[11px] font-bold">
                  {TAG[n.s].label}
                </text>
              </g>
            )}
            {memo && (
              <g>
                <line x1={c.x + c.w + 6} x2={MEMO_X - 6} y1={n.y} y2={n.y} className="stroke-border" strokeDasharray="2 3" />
                {memo.map((t, i) => (
                  <text key={t} x={MEMO_X} y={n.y - ((memo.length - 1) * 16) / 2 + 4 + i * 16} className="fill-muted-foreground text-[11.5px]">
                    {t}
                  </text>
                ))}
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
