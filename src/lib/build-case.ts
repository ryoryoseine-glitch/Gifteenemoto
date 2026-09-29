import type { CaseData, Project } from "@/data/types";
import type { RawData } from "@/data/raw/types";
import { monthIndexIn, projectMonthKeys } from "@/data/raw/calendar";
import { deriveCase } from "@/lib/derive";

/**
 * 画面に渡す CaseData を作る。
 * master（設定で編集するもの）と raw（元データ。スマホの操作で行が増える）から計算し、
 * 数字はすべて raw から出す。寄附の金額・日付も元データの寄附一覧から（設定で直すと寄附一覧の行が書き換わる）。
 */
export function buildCase(master: CaseData, raw: RawData, hidden: Record<string, boolean>, seedNow: number): CaseData {
  const d = deriveCase(master, raw);
  const projects = householdize(master, raw, d.projects);
  const donors = d.donors.map((x) => {
    const m = master.donors.find((y) => y.id === x.id);
    return m ? { ...x, name: m.name, giftName: m.giftName, photo: m.photo } : x;
  });
  const voices = d.voices.map((v) => ({ ...v, postedAt: seedNow - (v.minutesAgo ?? 0) * 60000, hidden: !!hidden[v.id] }));
  return { ...d, projects, donors, voices };
}

/** 月ごとの「新しく受け取った／利用した世帯」を元データの世帯ID（観光は会員ID）で数える */
function householdize(c: CaseData, raw: RawData, projects: Project[]): Project[] {
  const tourism = c.kind === "観光";
  const hh = new Map(raw.members.map((m) => [m.memberId, tourism ? m.memberId : m.householdId]));
  const ticketProject = new Map(raw.tickets.map((t) => [t.ticketId, t.projectId]));
  return projects.map((p) => {
    const keys = projectMonthKeys(p);
    const firstRecv = new Map<string, string>();
    for (const t of raw.tickets) {
      if (t.projectId !== p.id || !t.receivedAt || !t.memberId) continue;
      const k = hh.get(t.memberId) ?? t.memberId;
      const cur = firstRecv.get(k);
      if (!cur || t.receivedAt < cur) firstRecv.set(k, t.receivedAt);
    }
    const firstUse = new Map<string, string>();
    for (const r of raw.redemptions) {
      if (ticketProject.get(r.ticketId) !== p.id) continue;
      const k = hh.get(r.memberId) ?? r.memberId;
      const cur = firstUse.get(k);
      if (!cur || r.usedAt < cur) firstUse.set(k, r.usedAt);
    }
    const series = (m: Map<string, string>) => {
      const a = keys.map(() => 0);
      for (const at of m.values()) {
        const i = monthIndexIn(keys, at);
        if (i >= 0) a[i]++;
      }
      return a;
    };
    // received は「受け取った世帯」、used は「使われた枚数」、usedHouseholds は「利用した世帯」
    return { ...p, received: series(firstRecv), usedHouseholds: series(firstUse) };
  });
}
