import type { Project } from "@/data/types";

/**
 * 元データの日付まわりの共通処理。
 * 月は "YYYY-MM"（monthKey）で扱う。年度は4月〜翌3月（2026年度の中間は9月末）。
 */

/** モックの「今」。seed の声の経過時間や、今月の日付の上限に使う */
export const RAW_NOW = "2026-09-29T18:00:00+09:00";
export const RAW_NOW_MS = Date.parse(RAW_NOW);

export const FISCAL_YEAR = 2026;
export const MIDTERM_END = "2026-09"; // 中間は9月末で締める

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

/** 日時を +09:00 付きの ISO 文字列にする */
export function jst(y: number, m: number, d: number, hh = 0, mm = 0, ss = 0) {
  return `${y}-${pad(m)}-${pad(d)}T${pad(hh)}:${pad(mm)}:${pad(ss)}+09:00`;
}

/** ミリ秒（UTC）→ +09:00 付きの ISO 文字列 */
export function jstFromMs(ms: number) {
  const t = new Date(ms + 9 * 3600_000);
  return jst(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate(), t.getUTCHours(), t.getUTCMinutes(), t.getUTCSeconds());
}

/** "2026-04-12T..." → "2026-04" */
export const monthKeyOf = (iso: string) => iso.slice(0, 7);

export const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** "2026年4月" のような文字列から [年, 月] を取る */
function parseYm(s: string | undefined): [number, number] | null {
  const r = s?.match(/(\d{4})年(\d{1,2})月/);
  return r ? [Number(r[1]), Number(r[2])] : null;
}

/** 事業の期間（period）の始まりと終わり */
export function projectPeriod(p: Pick<Project, "period">) {
  const parts = (p.period ?? "").split("〜");
  const start = parseYm(parts[0]) ?? [FISCAL_YEAR, 4];
  const end = parseYm(parts[1]) ?? [FISCAL_YEAR + 1, 3];
  return { start, end };
}

/** Project.months（"4月" など）それぞれの "YYYY-MM"。年は period の始まりから数える */
export function projectMonthKeys(p: Pick<Project, "period" | "months">): string[] {
  const { start } = projectPeriod(p);
  let year = start[0];
  let prev = start[1];
  return p.months.map((label, i) => {
    const m = Number(label.replace("月", ""));
    if (i === 0 ? m < start[1] : m < prev) year++;
    prev = m;
    return `${year}-${pad(m)}`;
  });
}

/** 事業の有効期限（期間の終わりの月末） */
export function projectExpiresAt(p: Pick<Project, "period">) {
  const { end } = projectPeriod(p);
  return jst(end[0], end[1], daysInMonth(end[0], end[1]), 23, 59, 59);
}

/** 年度（4月始まり）。"2026-03" → 2025 */
export function fiscalYearOf(key: string) {
  const [y, m] = key.split("-").map(Number);
  return m >= 4 ? y : y - 1;
}

/** 日時 → 事業の月の位置。範囲の前は最初の月、後は最後の月に入れる（スマホで今足した分を最後の月に入れるため） */
export function monthIndexIn(keys: string[], iso: string) {
  const k = monthKeyOf(iso);
  const i = keys.indexOf(k);
  if (i >= 0) return i;
  if (!keys.length) return -1;
  return k < keys[0] ? 0 : keys.length - 1;
}

/** 今の日時（+09:00） */
export const nowJst = () => jstFromMs(Date.now());
/** デモの時計：モックの「今」（RAW_NOW）＋画面を開いてからの経過。操作で足す行はこの時刻にする */
export const demoNowJst = (openedAt: number) => jstFromMs(RAW_NOW_MS + (Date.now() - openedAt));
