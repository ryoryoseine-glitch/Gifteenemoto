import type { Breakdown, CaseData, Donor, Project, SurveyAgg, Voice } from "@/data/types";
import type { Member, RawData, Redemption, Shop, SurveyResponse, Ticket } from "@/data/raw/types";
import { RAW_NOW_MS, monthIndexIn, projectMonthKeys } from "@/data/raw/calendar";

/**
 * 元データ（RawData）から、今の画面が使っている形（Project・agg・voices・donors）を計算する。
 * 画面側は CaseData を deriveCase(c, raw) の結果に差し替えるだけで使える。
 *
 * 数え方の決まり
 * - 月：Project.months（期間の始まりから年を数える。2026年度は4月〜翌3月）。範囲の外の日時は最初／最後の月に入れる
 * - 受取：チケットの receivedAt の月。利用：明細の count の合計（回数券は1回＝1枚）
 * - 地区別（子育て）：使った会員の「住まいの地区」（登録項目 area）。市町村別（観光）：加盟店の所在
 * - 業種・種類別：加盟店の category。事業者・加盟店別：上位（今の行数ぶん、なければ5件）
 * - repeat：子育て＝利用した世帯のうち2回以上使った世帯の割合（世帯は householdId）。観光＝利用者のうち同じ加盟店を2回以上使った人の割合
 * - tour（観光のみ）：利用者のうち2市町村以上で使った人の割合
 * - firstTime（子育てで「初めてか」の設問があるとき）：世帯の初回の利用に付いた回答のうち「初めて」の割合
 */

type Index = {
  ticket: Map<string, Ticket>;
  member: Map<string, Member>;
  shop: Map<string, Shop>;
  /** 事業ごとの利用の明細 */
  redemptionsOf: Map<string, Redemption[]>;
  /** 利用ID → 回答 */
  responseOf: Map<string, SurveyResponse>;
  /** 回答ID → 共感数 */
  likes: Map<string, number>;
};

const cache = new WeakMap<RawData, Index>();

function indexOf(raw: RawData): Index {
  const hit = cache.get(raw);
  if (hit) return hit;
  const ticket = new Map(raw.tickets.map((t) => [t.ticketId, t]));
  const redemptionsOf = new Map<string, Redemption[]>();
  for (const r of raw.redemptions) {
    const pid = ticket.get(r.ticketId)?.projectId;
    if (!pid) continue;
    (redemptionsOf.get(pid) ?? redemptionsOf.set(pid, []).get(pid)!).push(r);
  }
  const idx: Index = {
    ticket,
    member: new Map(raw.members.map((m) => [m.memberId, m])),
    shop: new Map(raw.shops.map((s) => [s.shopId, s])),
    redemptionsOf,
    responseOf: new Map(raw.surveyResponses.map((s) => [s.redemptionId, s])),
    likes: new Map(raw.reactions.map((r) => [r.responseId, r.likes])),
  };
  cache.set(raw, idx);
  return idx;
}

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const countMap = () => new Map<string, number>();
const add = (m: Map<string, number>, k: string, n = 1) => m.set(k, (m.get(k) ?? 0) + n);
const sortedRows = (m: Map<string, number>): [string, number][] => [...m.entries()].sort((a, b) => b[1] - a[1]);

const householdOf = (idx: Index, memberId: string) => idx.member.get(memberId)?.householdId || memberId;

/** 事業の利用の明細（ticket → 事業で引く） */
export function redemptionsOfProject(raw: RawData, projectId: string): Redemption[] {
  return indexOf(raw).redemptionsOf.get(projectId) ?? [];
}

/**
 * 受益者数（世帯）。既定は「受け取った世帯」（届いた世帯数）。
 * used: true なら「使った世帯」。さっぽろは会員＝世帯として数える。
 */
export function householdsReached(raw: RawData, projectId: string, opts: { used?: boolean } = {}): number {
  const idx = indexOf(raw);
  const hh = new Set<string>();
  if (opts.used) for (const r of idx.redemptionsOf.get(projectId) ?? []) hh.add(householdOf(idx, r.memberId));
  else for (const t of raw.tickets) if (t.projectId === projectId && t.receivedAt && t.memberId) hh.add(householdOf(idx, t.memberId));
  return hh.size;
}

function breakdownRows(c: CaseData, p: Project, b: Breakdown, reds: Redemption[], idx: Index): [string, number][] {
  const m = countMap();
  if (b.kind === "place" && c.kind === "子育て") {
    const opts = c.reg.find((r) => r.key === "area")?.opts ?? [];
    for (const o of opts) if (o !== "わからない") m.set(o, 0);
    for (const r of reds) add(m, idx.member.get(r.memberId)?.answers.area || "わからない", r.count);
    if (m.get("わからない") === 0) m.delete("わからない");
    return sortedRows(m);
  }
  for (const r of reds) {
    const s = idx.shop.get(r.shopId);
    const k = b.kind === "place" ? s?.area : b.kind === "kind" ? s?.category : s?.name;
    add(m, k ?? "その他", r.count);
  }
  const rows = sortedRows(m);
  return b.kind === "shop" ? rows.slice(0, b.rows.length || 5) : rows;
}

/** 元データから事業（Project）を計算する。master（c.projects）の名前・目的・KPI などはそのまま使う */
export function deriveProjects(c: CaseData, raw: RawData): Project[] {
  const idx = indexOf(raw);
  const firstQ = c.questions.find((q) => q.id === "first" && q.type === "choice");
  return c.projects.map((p) => {
    const keys = projectMonthKeys(p);
    const received = keys.map(() => 0);
    const used = keys.map(() => 0);
    let issued = 0;
    for (const t of raw.tickets) {
      if (t.projectId !== p.id) continue;
      issued++;
      if (t.receivedAt) {
        const i = monthIndexIn(keys, t.receivedAt);
        if (i >= 0) received[i]++;
      }
    }
    const reds = idx.redemptionsOf.get(p.id) ?? [];
    for (const r of reds) {
      const i = monthIndexIn(keys, r.usedAt);
      if (i >= 0) used[i] += r.count;
    }

    // 2回以上・周遊
    const tourism = c.kind === "観光";
    const perUnit = new Map<string, { n: number; shops: Map<string, number>; areas: Set<string> }>();
    for (const r of reds) {
      const k = tourism ? r.memberId : householdOf(idx, r.memberId);
      const u = perUnit.get(k) ?? perUnit.set(k, { n: 0, shops: new Map(), areas: new Set() }).get(k)!;
      u.n += r.count;
      add(u.shops, r.shopId, r.count);
      u.areas.add(idx.shop.get(r.shopId)?.area ?? "");
    }
    const units = [...perUnit.values()];
    const share = (f: (u: (typeof units)[number]) => boolean) => (units.length ? units.filter(f).length / units.length : 0);
    const repeat = tourism ? share((u) => [...u.shops.values()].some((v) => v >= 2)) : share((u) => u.n >= 2);
    const tour = tourism ? share((u) => u.areas.size >= 2) : null;

    // 初めて（世帯の初回の利用に付いた回答）
    let firstTime: number | null = null;
    if (!tourism && firstQ?.opts?.length) {
      const firstOf = new Map<string, Redemption>();
      for (const r of reds) {
        const h = householdOf(idx, r.memberId);
        const cur = firstOf.get(h);
        if (!cur || r.usedAt < cur.usedAt) firstOf.set(h, r);
      }
      let yes = 0;
      let n = 0;
      for (const r of firstOf.values()) {
        const a = idx.responseOf.get(r.redemptionId)?.answers[firstQ.id];
        if (a == null || a === "") continue;
        n++;
        if (a === firstQ.opts[0]) yes++;
      }
      firstTime = n ? yes / n : null;
    }

    const base = raw.baselines.filter((b) => b.projectId === p.id);
    const prev = (k: "received" | "used") => (base.length ? p.months.map((m) => base.find((b) => b.month === m)?.[k] ?? 0) : null);

    return {
      ...p,
      issued,
      received,
      used,
      receivedPrev: prev("received"),
      usedPrev: prev("used"),
      breakdowns: p.breakdowns.map((b) => ({ ...b, rows: breakdownRows(c, p, b, reds, idx) })),
      repeat,
      tour,
      firstTime,
    };
  });
}

/** アンケートの集計（事業ごと・設問ごと）。回答のない事業は持たない */
export function deriveAgg(c: CaseData, raw: RawData): CaseData["agg"] {
  const byProject = new Map<string, SurveyResponse[]>();
  for (const s of raw.surveyResponses) (byProject.get(s.projectId) ?? byProject.set(s.projectId, []).get(s.projectId)!).push(s);
  const out: CaseData["agg"] = {};
  for (const p of c.projects) {
    const list = byProject.get(p.id);
    if (!list?.length) continue;
    const agg: SurveyAgg = {};
    for (const q of c.questions) {
      if (q.type === "text") continue;
      if (q.type === "multi") {
        const m: Record<string, number> = Object.fromEntries((q.opts ?? []).map((o) => [o, 0]));
        for (const s of list) {
          const v = s.answers[q.id];
          if (Array.isArray(v)) for (const o of v) m[o] = (m[o] ?? 0) + 1;
        }
        agg[q.id] = m;
      } else if (q.type === "yen") {
        let total = 0;
        let n = 0;
        for (const s of list) {
          const v = s.answers[q.id];
          if (typeof v === "number" && v >= 0) {
            total += v;
            n++;
          }
        }
        agg[q.id] = [total, n];
      } else if (q.type === "scale") {
        const a = [0, 0, 0, 0, 0];
        for (const s of list) {
          const v = Number(s.answers[q.id]);
          if (v >= 1 && v <= 5) a[Math.round(v) - 1]++;
        }
        agg[q.id] = a;
      } else {
        const opts = q.opts ?? [];
        const a = opts.map(() => 0);
        for (const s of list) {
          const i = opts.indexOf(String(s.answers[q.id] ?? ""));
          if (i >= 0) a[i]++;
        }
        agg[q.id] = a;
      }
    }
    out[p.id] = agg;
  }
  return out;
}

/** 声の属性（今と同じ書き方）。子育て：「子の年齢区分・地区・年代・間柄」、観光：「年代・住まい」 */
export function voiceAttrs(c: CaseData, m: Member | undefined): string {
  const a = m?.answers ?? {};
  if (c.kind === "子育て") {
    const bands = c.reg.find((r) => r.key === "kids")?.bands ?? [];
    const youngest = bands[(a.kids ?? "").split(",").findIndex((n) => Number(n) > 0)] ?? "";
    const area = a.area ?? "";
    const areaText = !area ? "" : area.endsWith("地区") || area === "わからない" ? area : `${area}地区`;
    return [youngest, areaText, a.age ?? "", a.relation ?? ""].join("・");
  }
  return [a.age ?? "", a.home ?? ""].join("・");
}

/**
 * 公開に同意したコメント（声）。新しい順。
 * minutesAgo は now（既定はモックの「今」2026-09-29 18:00）からの経過分。store の seed が postedAt に直す。
 */
export function deriveVoices(c: CaseData, raw: RawData, opts: { now?: number } = {}): Voice[] {
  const idx = indexOf(raw);
  const now = opts.now ?? RAW_NOW_MS;
  const redemption = new Map(raw.redemptions.map((r) => [r.redemptionId, r]));
  return raw.surveyResponses
    .filter((s) => s.publish && s.comment.trim())
    .sort((a, b) => (a.answeredAt < b.answeredAt ? 1 : -1))
    .map((s) => {
      const r = redemption.get(s.redemptionId);
      const t = r ? idx.ticket.get(r.ticketId) : undefined;
      return {
        id: s.responseId,
        projectId: s.projectId,
        giftId: t?.couponTypeId ?? "",
        text: s.comment.trim(),
        theme: s.theme || "届いたばかりの声",
        attrs: voiceAttrs(c, idx.member.get(s.memberId)),
        minutesAgo: Math.round((now - Date.parse(s.answeredAt)) / 60000),
        likes: idx.likes.get(s.responseId) ?? 0,
      };
    });
}

/** 寄附企業（ギフト）。金額・寄附日は寄附の表から、weight は事業の利用のうちその券種の割合 */
export function deriveDonors(c: CaseData, raw: RawData): Donor[] {
  const idx = indexOf(raw);
  return c.donors.map((d) => {
    const ds = raw.donations.filter((x) => x.couponTypeId === d.id && x.projectId === d.projectId);
    const reds = idx.redemptionsOf.get(d.projectId) ?? [];
    const all = sum(reds.map((r) => r.count));
    const mine = sum(reds.filter((r) => idx.ticket.get(r.ticketId)?.couponTypeId === d.id).map((r) => r.count));
    return {
      ...d,
      amount: ds.length ? sum(ds.map((x) => x.amount)) : d.amount,
      donatedOn: ds.find((x) => x.donatedOn)?.donatedOn ?? d.donatedOn,
      weight: all ? mine / all : d.weight,
    };
  });
}

/** 上をまとめて、今の CaseData と同じ形で返す */
export function deriveCase(c: CaseData, raw: RawData, opts: { now?: number } = {}): CaseData {
  return {
    ...c,
    projects: deriveProjects(c, raw),
    donors: deriveDonors(c, raw),
    agg: deriveAgg(c, raw),
    voices: deriveVoices(c, raw, opts),
  };
}
