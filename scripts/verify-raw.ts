/**
 * 元データの土台の検証。
 *   npx --yes tsx scripts/verify-raw.ts
 * 両事例で generateRaw → deriveCase し、今のモックの値との差を表で出す。
 * 内訳の合計の不一致・日時の前後の矛盾・CSV の往復での食い違いがあれば終了コード 1。
 */
import { CASES } from "@/data";
import type { CaseData } from "@/data/types";
import { generateRaw } from "@/data/raw/generate";
import { RAW_NOW } from "@/data/raw/calendar";
import { appendReceive, appendRedeem, appendSurvey } from "@/data/raw/append";
import { deriveCase, householdsReached } from "@/lib/derive";
import { csvFilesToRaw, rawToCsvFiles } from "@/lib/raw-csv";

/** キーの順番に左右されない文字列化 */
const canon = (v: unknown): string =>
  JSON.stringify(v, (_, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : 1))) : x));
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const failures: string[] = [];
const fail = (m: string) => failures.push(m);
const pct = (v: number | null) => (v == null ? "-" : `${(v * 100).toFixed(1)}%`);
const diff = (a: number, b: number) => (a === b ? "±0" : `${b - a > 0 ? "+" : ""}${b - a}`);

function table(head: string[], rows: (string | number)[][]) {
  const all = [head, ...rows.map((r) => r.map(String))];
  const w = head.map((_, i) => Math.max(...all.map((r) => [...r[i]].reduce((n, ch) => n + (ch.charCodeAt(0) > 0xff ? 2 : 1), 0))));
  const padCell = (s: string, i: number) => s + " ".repeat(w[i] - [...s].reduce((n, ch) => n + (ch.charCodeAt(0) > 0xff ? 2 : 1), 0));
  console.log(all.map((r) => r.map(padCell).join(" | ")).join("\n"));
}

function verify(c: CaseData) {
  const t0 = performance.now();
  const raw = generateRaw(c);
  const t1 = performance.now();
  const d = deriveCase(c, raw);
  const t2 = performance.now();
  console.log(`\n=== ${c.muniShort}（${c.id}） generate ${(t1 - t0).toFixed(0)}ms / derive ${(t2 - t1).toFixed(0)}ms`);
  console.log(
    `会員 ${raw.members.length} / 世帯 ${new Set(raw.members.map((m) => m.householdId)).size} / チケット ${raw.tickets.length} / 利用 ${raw.redemptions.length} / 加盟店 ${raw.shops.length} / 回答 ${raw.surveyResponses.length}`,
  );

  // 事業ごとの数字
  const rows: (string | number)[][] = [];
  for (const p of c.projects) {
    const q = d.projects.find((x) => x.id === p.id)!;
    const monthDiff = Math.max(...p.used.map((v, i) => Math.abs(v - q.used[i])), ...p.received.map((v, i) => Math.abs(v - q.received[i])));
    rows.push([
      p.id,
      `${p.issued}→${q.issued}`,
      `${sum(p.received)}→${sum(q.received)} (${diff(sum(p.received), sum(q.received))})`,
      `${sum(p.used)}→${sum(q.used)} (${diff(sum(p.used), sum(q.used))})`,
      monthDiff,
      `${pct(p.repeat)}→${pct(q.repeat)}`,
      `${pct(p.tour)}→${pct(q.tour)}`,
      `${pct(p.firstTime)}→${pct(q.firstTime)}`,
      `${householdsReached(raw, p.id)} / ${householdsReached(raw, p.id, { used: true })}`,
    ]);
    const tol = Math.max(2, Math.ceil(sum(p.used) * 0.01));
    if (Math.abs(sum(p.used) - sum(q.used)) > 0) fail(`${p.id} 利用の合計がずれた`);
    if (Math.abs(sum(p.received) - sum(q.received)) > 0) fail(`${p.id} 受取の合計がずれた`);
    if (monthDiff > tol) fail(`${p.id} 月別の差が大きい（${monthDiff}）`);
    if (JSON.stringify(p.receivedPrev) !== JSON.stringify(q.receivedPrev) || JSON.stringify(p.usedPrev) !== JSON.stringify(q.usedPrev))
      fail(`${p.id} 前年度がずれた`);
    for (const [label, a, b] of [["repeat", p.repeat, q.repeat], ["tour", p.tour, q.tour], ["firstTime", p.firstTime, q.firstTime]] as const) {
      if ((a == null) !== (b == null)) fail(`${p.id} ${label} の有無が違う`);
    }
  }
  table(["事業", "配布", "受取（今→元データ）", "利用（今→元データ）", "月別の最大差", "2回以上", "周遊", "初めて", "届いた世帯/使った世帯"], rows);

  // 内訳
  const bRows: (string | number)[][] = [];
  for (const p of c.projects) {
    const q = d.projects.find((x) => x.id === p.id)!;
    const used = sum(q.used);
    for (const b of q.breakdowns) {
      const orig = p.breakdowns.find((x) => x.key === b.key)!;
      const s = sum(b.rows.map(([, v]) => v));
      const origMap = new Map(orig.rows);
      const maxCell = Math.max(0, ...b.rows.map(([k, v]) => Math.abs(v - (origMap.get(k) ?? 0))), ...orig.rows.map(([k, v]) => (b.rows.some(([x]) => x === k) ? 0 : v)));
      const ok = b.kind === "shop" ? s <= used : s === used;
      bRows.push([p.id, b.label, b.kind, b.rows.length, s, used, ok ? "OK" : "NG", maxCell]);
      if (!ok) fail(`${p.id} ${b.label} の合計（${s}）が利用の合計（${used}）と合わない`);
    }
  }
  console.log("");
  table(["事業", "内訳", "種類", "行数", "内訳の合計", "利用の合計", "一致", "区分ごとの最大差"], bRows);

  // アンケート
  const aRows: (string | number)[][] = [];
  for (const [pid, orig] of Object.entries(c.agg)) {
    const got = d.agg[pid];
    if (!got) {
      fail(`${pid} アンケートの集計がない`);
      continue;
    }
    for (const q of c.questions) {
      const a = orig[q.id];
      const b = got[q.id];
      if (!a || !b) continue;
      let n0: number, n1: number, maxd: number;
      if (Array.isArray(a) && Array.isArray(b)) {
        if (q.type === "yen") {
          n0 = a[1];
          n1 = b[1];
          maxd = Math.abs(a[0] - b[0]);
        } else {
          n0 = sum(a);
          n1 = sum(b);
          maxd = Math.max(...a.map((v, i) => Math.abs(v - (b[i] ?? 0))));
        }
      } else {
        const ao = a as Record<string, number>;
        const bo = b as Record<string, number>;
        n0 = sum(Object.values(ao));
        n1 = sum(Object.values(bo));
        maxd = Math.max(...Object.keys(ao).map((k) => Math.abs(ao[k] - (bo[k] ?? 0))));
      }
      aRows.push([pid, q.id, q.type, n0, n1, maxd]);
      if (n0 !== n1) fail(`${pid} ${q.id} の回答数がずれた（${n0}→${n1}）`);
    }
  }
  console.log("");
  table(["事業", "設問", "形式", "回答数（今）", "回答数（元データ）", "選択肢ごとの最大差（金額は合計の差）"], aRows);

  // 声
  const vRows: (string | number)[][] = [];
  for (const v of c.voices) {
    const got = d.voices.find((x) => x.text === v.text);
    vRows.push([v.id, got ? "あり" : "なし", v.attrs, got?.attrs ?? "-", got ? `${v.giftId}→${got.giftId}` : "-", `${v.minutesAgo}→${got?.minutesAgo ?? "-"}`]);
    if (!got) fail(`声 ${v.id} が元データから作れない`);
    else if (got.giftId !== v.giftId || got.projectId !== v.projectId) fail(`声 ${v.id} のギフトがずれた`);
  }
  console.log("");
  table(["声", "元データ", "attrs（今）", "attrs（元データ）", "ギフト", "経過分"], vRows);

  // 寄附企業の重み
  console.log("");
  table(
    ["ギフト", "事業", "weight（今→元データ）", "寄附額"],
    c.donors.map((x) => {
      const y = d.donors.find((z) => z.id === x.id)!;
      if (y.amount !== x.amount) fail(`${x.id} 寄附額がずれた`);
      return [x.id, x.projectId, `${x.weight}→${y.weight.toFixed(3)}`, y.amount];
    }),
  );

  // 日時の前後
  const ticket = new Map(raw.tickets.map((t) => [t.ticketId, t]));
  const member = new Map(raw.members.map((m) => [m.memberId, m]));
  const red = new Map(raw.redemptions.map((r) => [r.redemptionId, r]));
  let bad = 0;
  for (const r of raw.redemptions) {
    const t = ticket.get(r.ticketId);
    if (!t?.receivedAt || t.receivedAt > r.usedAt || Date.parse(t.receivedAt) > Date.parse(r.usedAt)) bad++;
    const m = member.get(r.memberId);
    if (!m || Date.parse(m.registeredAt) > Date.parse(r.usedAt)) bad++;
    if (Date.parse(r.usedAt) > Date.parse(RAW_NOW)) bad++;
  }
  for (const s of raw.surveyResponses) {
    const r = red.get(s.redemptionId);
    if (!r || Date.parse(s.answeredAt) < Date.parse(r.usedAt) || r.memberId !== s.memberId) bad++;
  }
  for (const t of raw.tickets) if (t.receivedAt && t.receivedAt < t.issuedAt) bad++;
  for (const t of raw.tickets) if (t.receivedAt && Date.parse(member.get(t.memberId ?? "")?.registeredAt ?? "") > Date.parse(t.receivedAt)) bad++;
  console.log(`\n日時・参照の矛盾：${bad} 件`);
  if (bad) fail(`${c.id} 日時・参照の矛盾 ${bad} 件`);

  // 世帯
  const hh = new Map<string, number>();
  for (const m of raw.members) hh.set(m.householdId, (hh.get(m.householdId) ?? 0) + 1);
  const multi = [...hh.values()].filter((n) => n >= 2).length;
  console.log(`2アカウント以上の世帯：${multi} / ${hh.size}（${pct(multi / hh.size)}）`);

  // CSV の往復
  const t3 = performance.now();
  const files = rawToCsvFiles(raw, c);
  const back = csvFilesToRaw(c.id, files, c);
  const d2 = deriveCase(c, back);
  const same = canon(d2) === canon(d) && canon(back) === canon(raw);
  if (!same) for (const t of Object.keys(raw) as (keyof typeof raw)[]) if (canon(raw[t]) !== canon(back[t])) console.log(`  食い違う表：${t}`);
  console.log(
    `CSV の往復：${same ? "一致" : "不一致"}（${((performance.now() - t3) | 0)}ms、${Object.entries(files)
      .map(([k, v]) => `${k} ${(v.length / 1024).toFixed(0)}KB`)
      .join("、")}）`,
  );
  if (!same) fail(`${c.id} CSV の往復で食い違い`);

  // スマホの操作を足す
  const p0 = c.projects.find((p) => c.agg[p.id])!;
  const gift = c.donors.find((x) => x.projectId === p0.id)!;
  const shop = raw.shops.find((s) => raw.redemptions.some((r) => r.shopId === s.shopId && ticket.get(r.ticketId)?.projectId === p0.id))!;
  const at = "2026-09-29T17:00:00+09:00";
  const r1 = appendReceive(raw, { projectId: p0.id, couponTypeId: gift.id, answers: { age: "30代" }, at });
  const r2 = appendRedeem(r1.raw, { ticketId: r1.ticket.ticketId, shopId: shop.shopId, unitValue: p0.unitValue, at: "2026-09-29T17:10:00+09:00" });
  const r3 = appendSurvey(r2.raw, { redemptionId: r2.redemption.redemptionId, answers: { sat: 5 }, comment: "テストの声", publish: true, at: "2026-09-29T17:15:00+09:00" });
  const d3 = deriveCase(c, r3.raw);
  const q0 = d.projects.find((p) => p.id === p0.id)!;
  const q3 = d3.projects.find((p) => p.id === p0.id)!;
  const okAppend =
    sum(q3.received) === sum(q0.received) + 1 &&
    sum(q3.used) === sum(q0.used) + 1 &&
    (d3.agg[p0.id].sat as number[])[4] === (d.agg[p0.id].sat as number[])[4] + 1 &&
    d3.voices.some((v) => v.text === "テストの声" && v.giftId === gift.id) &&
    raw.redemptions.length === r2.raw.redemptions.length - 1;
  console.log(`スマホの操作（受取→利用→回答）：${okAppend ? "反映された" : "反映されない"}`);
  if (!okAppend) fail(`${c.id} append の反映がおかしい`);

  if (t1 - t0 > 500) fail(`${c.id} 生成が遅い（${(t1 - t0).toFixed(0)}ms）`);
}

for (const c of Object.values(CASES)) verify(c);

if (failures.length) {
  console.log(`\n失敗：\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("\nすべて通りました");
