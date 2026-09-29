import { matsumoto } from "./matsumoto";
import { sapporo } from "./sapporo";
import type { CaseData, CaseId } from "./types";

export const CASES: Record<CaseId, CaseData> = { matsumoto, sapporo };

export const CASE_OPTIONS: { value: CaseId; label: string }[] = [
  { value: "matsumoto", label: "松本市（子育て）" },
  { value: "sapporo", label: "さっぽろ圏（観光）" },
];

export * from "./types";
