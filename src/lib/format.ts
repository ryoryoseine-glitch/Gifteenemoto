export const fmt = (n: number) => n.toLocaleString("ja-JP");

export const yen = (n: number) => {
  if (n >= 100_000_000) return `${(n / 100_000_000).toLocaleString("ja-JP", { maximumFractionDigits: 2 })}億円`;
  if (n >= 10_000) return `${(n / 10_000).toLocaleString("ja-JP", { maximumFractionDigits: 1 })}万円`;
  return `${fmt(n)}円`;
};

/** 百分率（小数1桁） */
export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);

export const pctText = (v: number) => `${v.toLocaleString("ja-JP", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

export function ago(ts: number, now = Date.now()) {
  const m = Math.max(0, Math.round((now - ts) / 60000));
  if (m < 1) return "たった今";
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  const d = Math.floor(h / 24);
  return d === 1 ? "昨日" : `${d}日前`;
}

/** 企業・社員に見せる属性。地区は出さず、年齢は大きな区分にぼかす
 * 子育て：「1歳・第2地区・30代・母」→「30代の母・未就学のお子さん」
 * 観光：「40代・関東」→「関東からの旅行者」 */
export function publicAttrs(caseId: string, attrs: string) {
  const [a, b, c, d] = attrs.split("・");
  if (caseId === "matsumoto") {
    const child = /中学/.test(a) ? "中高生" : /小学/.test(a) ? "小学生" : "未就学";
    const who = d && d !== "その他" ? d : "保護者";
    return c ? `${c}の${who}・${child}のお子さん` : `${child}のお子さんの${who}`;
  }
  return b ? `${b}からの旅行者` : "旅行者";
}
