import type { CaseData } from "@/data/types";
import type { AnswerValue, RawData, RawTableName } from "@/data/raw/types";
import { RAW_TABLES } from "@/data/raw/types";

/**
 * 元データ（RawData）と CSV の行き来。
 * 見出しは e街のデータ出力に似せた日本語で出す。読み込みは日本語・英語どちらの見出しでもよい。
 * 登録項目・設問の列は、CaseData を渡すとその名前（「お住まいの地区」「このクーポンの満足度」など）で出し、読み込みでも使う。
 * 渡さないときは「登録:area」「設問:sat」の形。
 */

/** 表ごとのファイル名（e街の出力に似せた名前） */
export const RAW_FILE_NAMES: Record<RawTableName, string> = {
  members: "会員情報.csv",
  tickets: "チケット発行・受取実績.csv",
  redemptions: "利用実績明細.csv",
  shops: "加盟店一覧.csv",
  surveyResponses: "アンケート回答.csv",
  donations: "寄附一覧.csv",
  baselines: "前年度実績.csv",
  reactions: "声への共感.csv",
};

/** 固定の列：英語（型の項目名）→ 日本語の見出し */
export const RAW_HEADERS: Record<RawTableName, [string, string][]> = {
  members: [
    ["memberId", "会員ID"],
    ["householdId", "世帯ID"],
    ["registeredAt", "会員登録日時"],
  ],
  tickets: [
    ["ticketId", "チケットID"],
    ["couponTypeId", "券種ID"],
    ["projectId", "事業ID"],
    ["memberId", "会員ID"],
    ["issuedAt", "発行日時"],
    ["receivedAt", "受取日時"],
    ["expiresAt", "有効期限"],
  ],
  redemptions: [
    ["redemptionId", "利用ID"],
    ["ticketId", "チケットID"],
    ["memberId", "会員ID"],
    ["shopId", "加盟店ID"],
    ["usedAt", "決済日時"],
    ["amount", "決済金額"],
    ["count", "利用枚数"],
  ],
  shops: [
    ["shopId", "加盟店ID"],
    ["name", "加盟店名"],
    ["category", "業種"],
    ["area", "所在地区・市町村"],
  ],
  surveyResponses: [
    ["responseId", "回答ID"],
    ["redemptionId", "利用ID"],
    ["memberId", "会員ID"],
    ["projectId", "事業ID"],
    ["answeredAt", "回答日時"],
    ["comment", "自由記述"],
    ["publish", "公開可"],
    ["theme", "声のテーマ"],
  ],
  donations: [
    ["donationId", "寄附ID"],
    ["donor", "寄附者"],
    ["couponTypeId", "券種ID"],
    ["projectId", "事業ID"],
    ["amount", "寄附額"],
    ["donatedOn", "寄附日"],
  ],
  baselines: [
    ["projectId", "事業ID"],
    ["fiscalYear", "年度"],
    ["month", "月"],
    ["received", "受取数"],
    ["used", "利用数"],
  ],
  reactions: [
    ["responseId", "回答ID"],
    ["likes", "共感数"],
  ],
};

const NUMBER_FIELDS = new Set(["amount", "count", "fiscalYear", "received", "used", "likes"]);
const NULLABLE_FIELDS = new Set(["memberId", "receivedAt"]);
const MULTI_SEP = "|";

// ---------------------------------------------------------------------------
// CSV の書き出し・読み込み（RFC 4180）

const esc = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function toCsvText(rows: string[][], bom = true) {
  return (bom ? "﻿" : "") + rows.map((r) => r.map(esc).join(",")).join("\r\n") + "\r\n";
}

export function parseCsv(text: string): string[][] {
  const s = text.replace(/^﻿/, "");
  const out: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          cell += '"';
          i++;
        } else q = false;
      } else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && s[i + 1] === "\n") i++;
      row.push(cell);
      out.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    out.push(row);
  }
  return out.filter((r) => r.some((c) => c !== ""));
}

// ---------------------------------------------------------------------------
// 登録項目・設問の列

type Dyn = { key: string; header: string };

function regCols(raw: RawData, c?: CaseData): Dyn[] {
  const keys = new Set<string>();
  for (const f of c?.reg ?? []) keys.add(f.key);
  for (const m of raw.members) for (const k of Object.keys(m.answers)) keys.add(k);
  return [...keys].map((key) => ({ key, header: c?.reg.find((f) => f.key === key)?.label ?? `登録:${key}` }));
}

function questionCols(raw: RawData, c?: CaseData): Dyn[] {
  const keys = new Set<string>();
  for (const q of c?.questions ?? []) if (q.type !== "text") keys.add(q.id);
  for (const s of raw.surveyResponses) for (const k of Object.keys(s.answers)) keys.add(k);
  return [...keys].map((key) => ({ key, header: c?.questions.find((q) => q.id === key)?.text ?? `設問:${key}` }));
}

const cellOf = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "boolean") return v ? "可" : "不可";
  if (Array.isArray(v)) return v.join(MULTI_SEP);
  return String(v);
};

/** 表1つを CSV の行（見出しつき）にする */
export function tableToRows(raw: RawData, table: RawTableName, c?: CaseData): string[][] {
  const fixed = RAW_HEADERS[table];
  const dyn = table === "members" ? regCols(raw, c) : table === "surveyResponses" ? questionCols(raw, c) : [];
  // アンケートは自由記述などの前に設問の列を入れる
  const cut = table === "surveyResponses" ? fixed.findIndex(([k]) => k === "comment") : fixed.length;
  const head = [...fixed.slice(0, cut).map(([, j]) => j), ...dyn.map((d) => d.header), ...fixed.slice(cut).map(([, j]) => j)];
  const list = raw[table] as unknown as Record<string, unknown>[];
  const body = list.map((r) => {
    const sub = (table === "members" ? r.answers : table === "surveyResponses" ? r.answers : {}) as Record<string, unknown>;
    return [...fixed.slice(0, cut).map(([k]) => cellOf(r[k])), ...dyn.map((d) => cellOf(sub[d.key])), ...fixed.slice(cut).map(([k]) => cellOf(r[k]))];
  });
  return [head, ...body];
}

export function tableToCsv(raw: RawData, table: RawTableName, c?: CaseData, bom = true) {
  return toCsvText(tableToRows(raw, table, c), bom);
}

/** すべての表を CSV にする（ファイル名 → 中身） */
export function rawToCsvFiles(raw: RawData, c?: CaseData): Record<string, string> {
  return Object.fromEntries(RAW_TABLES.map((t) => [RAW_FILE_NAMES[t], tableToCsv(raw, t, c)]));
}

// ---------------------------------------------------------------------------
// 取り込み

function answerOf(key: string, cell: string, c?: CaseData): AnswerValue | undefined {
  if (cell === "") return undefined;
  const q = c?.questions.find((x) => x.id === key);
  if (q) {
    if (q.type === "multi") return cell.split(MULTI_SEP).filter(Boolean);
    if (q.type === "scale" || q.type === "yen") return Number(cell);
    return cell;
  }
  // 設問の定義がないときの推定
  if (cell.includes(MULTI_SEP)) return cell.split(MULTI_SEP).filter(Boolean);
  if (/^-?\d+(\.\d+)?$/.test(cell)) return Number(cell);
  return cell;
}

/** CSV（見出しつき）を表1つの行に戻す */
export function rowsToTable<T extends RawTableName>(rows: string[][], table: T, c?: CaseData): RawData[T] {
  if (!rows.length) return [] as unknown as RawData[T];
  const [head, ...body] = rows;
  const fixed = RAW_HEADERS[table];
  const byHeader = new Map<string, string>();
  for (const [en, ja] of fixed) {
    byHeader.set(ja, en);
    byHeader.set(en, en);
  }
  // 登録項目・設問の列：名前 → key
  const dynMap = new Map<string, string>();
  if (table === "members") for (const f of c?.reg ?? []) dynMap.set(f.label, f.key);
  if (table === "surveyResponses") for (const q of c?.questions ?? []) dynMap.set(q.text, q.id);
  const colKey = head.map((h) => {
    const t = h.trim();
    if (byHeader.has(t)) return { fixed: byHeader.get(t)! };
    return { dyn: dynMap.get(t) ?? t.replace(/^(登録|設問)[:：]/, "") };
  });
  const out = body.map((cells) => {
    const o: Record<string, unknown> = {};
    const sub: Record<string, AnswerValue | string> = {};
    colKey.forEach((k, i) => {
      const cell = cells[i] ?? "";
      if ("fixed" in k && k.fixed) {
        const f = k.fixed;
        if (NUMBER_FIELDS.has(f)) o[f] = cell === "" ? 0 : Number(cell);
        else if (f === "publish") o[f] = ["可", "1", "true", "TRUE", "はい"].includes(cell);
        else if (NULLABLE_FIELDS.has(f) && table === "tickets") o[f] = cell === "" ? null : cell;
        else o[f] = cell;
      } else if ("dyn" in k && k.dyn) {
        if (table === "members") {
          if (cell !== "") sub[k.dyn] = cell;
        } else {
          const v = answerOf(k.dyn, cell, c);
          if (v !== undefined) sub[k.dyn] = v;
        }
      }
    });
    if (table === "members" || table === "surveyResponses") o.answers = sub;
    if (table === "surveyResponses") {
      o.comment ??= "";
      o.theme ??= "";
      o.publish ??= false;
    }
    return o;
  });
  return out as unknown as RawData[T];
}

/**
 * CSV から RawData に戻す（取り込み）。files のキーは表の名前（"members" など）かファイル名（"会員情報.csv" など）。
 * ない表は空。
 */
export function csvFilesToRaw(caseId: string, files: Record<string, string>, c?: CaseData): RawData {
  const raw: RawData = { caseId, members: [], tickets: [], redemptions: [], shops: [], surveyResponses: [], donations: [], baselines: [], reactions: [] };
  for (const t of RAW_TABLES) {
    const text = files[t] ?? files[RAW_FILE_NAMES[t]];
    if (text == null) continue;
    (raw as Record<RawTableName, unknown>)[t] = rowsToTable(parseCsv(text), t, c);
  }
  return raw;
}
