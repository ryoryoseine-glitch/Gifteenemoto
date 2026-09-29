import type { CaseData, Project, Question } from "@/data/types";
import type { AnswerValue, Baseline, Donation, Member, MemberAnswers, RawData, Redemption, Reaction, Shop, SurveyResponse, Ticket } from "./types";
import { RAW_NOW, RAW_NOW_MS, daysInMonth, jst, jstFromMs, monthKeyOf, projectExpiresAt, projectMonthKeys, projectPeriod } from "./calendar";

/**
 * 今のモックの master（CaseData の projects・donors・reg・questions・voices と、今の集計値）を目標にして、
 * 決まった種の疑似乱数で「e街の出力に似せた明細」を作る。
 * 同じ CaseData からは毎回同じ RawData ができる。
 */

// ---------------------------------------------------------------------------
// 疑似乱数（mulberry32）

function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

class Rng {
  private a: number;
  constructor(seed: string) {
    this.a = hashStr(seed) || 1;
  }
  next() {
    let t = (this.a = (this.a + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(lo: number, hi: number) {
    return lo + Math.floor(this.next() * (hi - lo + 1));
  }
  pick<T>(a: T[]): T {
    return a[Math.floor(this.next() * a.length)];
  }
  shuffle<T>(a: T[]): T[] {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  /** 重みつきで1つ選ぶ（添字） */
  weighted(w: number[]) {
    const total = w.reduce((x, y) => x + Math.max(0, y), 0);
    if (total <= 0) return Math.floor(this.next() * w.length);
    let r = this.next() * total;
    for (let i = 0; i < w.length; i++) {
      r -= Math.max(0, w[i]);
      if (r < 0) return i;
    }
    return w.length - 1;
  }
  gauss() {
    const u = Math.max(1e-9, this.next());
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * this.next());
  }
}

// ---------------------------------------------------------------------------
// 小道具

const sumOf = (a: number[]) => a.reduce((x, y) => x + y, 0);
const pad = (n: number, w: number) => String(n).padStart(w, "0");

/** 件数の表を合計 total に合わせる（最大剰余法） */
function fitQuota(rows: [string, number][], total: number): [string, number][] {
  const s = sumOf(rows.map(([, v]) => v));
  if (s === total || s === 0) return rows.map(([k, v]) => [k, s === 0 ? 0 : v]);
  const raw = rows.map(([, v]) => (v * total) / s);
  const base = raw.map(Math.floor);
  let rest = total - sumOf(base);
  const order = raw.map((v, i) => [v - base[i], i] as [number, number]).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (rest <= 0) break;
    base[i]++;
    rest--;
  }
  return rows.map(([k], i) => [k, base[i]]);
}

function expand(rows: [string, number][]): string[] {
  const out: string[] = [];
  for (const [k, v] of rows) for (let i = 0; i < v; i++) out.push(k);
  return out;
}

/** 重みの表（ラベル→重み）で、選択肢から1つ選ぶ。表にない選択肢は重み def */
function pickLabel(rng: Rng, opts: string[], w: Record<string, number>, def = 0) {
  if (!opts.length) return "";
  return opts[rng.weighted(opts.map((o) => w[o] ?? def))];
}

const monthStartMs = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return Date.parse(jst(y, m, 1));
};

/** 月の中のランダムな日時（今月は RAW_NOW より前） */
function randomInMonth(rng: Rng, key: string) {
  const [y, m] = key.split("-").map(Number);
  const cur = key === monthKeyOf(RAW_NOW);
  const maxDay = cur ? Math.min(daysInMonth(y, m), Number(RAW_NOW.slice(8, 10))) : daysInMonth(y, m);
  return jst(y, m, rng.int(1, maxDay), rng.int(9, cur ? 17 : 19), rng.int(0, 59), rng.int(0, 59));
}

// ---------------------------------------------------------------------------
// 事例ごとの決めごと（モックの master にない情報を補う）

/** 券種（寄附企業のギフト）と、その券種で使える体験の種類。書いていない券種は残りの種類に按分 */
const GIFT_CATEGORIES: Record<string, Record<string, Record<string, string[]>>> = {
  matsumoto: {
    m1: { d1: ["一時預かり 半日券"], d2: ["ファミリーサポート 1時間券"], d3: ["産後家事支援"] },
  },
  sapporo: {
    s1: { d2: ["土産"] },
  },
};

/** 「上位」に名前が出ている事業者・加盟店の業種と所在 */
const NAMED_SHOPS: Record<string, { category: string; area: string }> = {
  "保育園A 一時預かり": { category: "一時預かり 半日券", area: "中央" },
  ファミリーサポートセンター: { category: "ファミリーサポート 1時間券", area: "中央" },
  子育て支援センターB: { category: "一時預かり 半日券", area: "庄内" },
  家事支援事業者C: { category: "産後家事支援", area: "鎌田" },
  "保育園D 一時預かり": { category: "一時預かり 半日券", area: "芳川" },
  "すし店E（小樽市）": { category: "飲食", area: "小樽市" },
  "ホテルF（札幌市）": { category: "宿泊", area: "札幌市" },
  "温泉G（札幌市）": { category: "宿泊", area: "札幌市" },
  "土産店H（小樽市）": { category: "土産", area: "小樽市" },
  "体験工房I（江別市）": { category: "体験", area: "江別市" },
};

const SHOP_NOUN: Record<string, string> = { 飲食: "飲食店", 宿泊: "宿", 土産: "土産店", 体験: "体験施設", 温泉: "温泉施設" };

/** 声の attrs（"1歳・第2地区・30代・母" / "40代・関東"）を登録項目に戻す */
function attrsToAnswers(c: CaseData, attrs: string): Partial<MemberAnswers> {
  const t = attrs.split("・");
  const opt = (key: string) => c.reg.find((r) => r.key === key)?.opts ?? [];
  if (c.kind === "子育て") {
    const out: Partial<MemberAnswers> = {};
    const [child, area, age, relation] = t;
    const kids = c.reg.find((r) => r.key === "kids");
    if (kids?.bands && child) {
      const n = child.match(/(\d+)歳/);
      const b = n ? (Number(n[1]) <= 2 ? 0 : 1) : /小学/.test(child) ? 2 : /中学|高校/.test(child) ? 3 : -1;
      if (b >= 0) out.kids = kids.bands.map((_, i) => (i === b ? 1 : 0)).join(",");
    }
    if (area) {
      const areas = opt("area");
      const a = areas.includes(area) ? area : areas.includes(area.replace(/地区$/, "")) ? area.replace(/地区$/, "") : "";
      if (a) out.area = a;
    }
    if (age && opt("age").includes(age)) out.age = age;
    if (relation && opt("relation").includes(relation)) out.relation = relation;
    return out;
  }
  const out: Partial<MemberAnswers> = {};
  const [age, ...rest] = t;
  if (opt("age").includes(age)) out.age = age;
  const homes = opt("home");
  const home = rest.join("・");
  const h = homes.includes(home) ? home : rest.find((x) => homes.includes(x));
  if (h) out.home = h;
  return out;
}

// ---------------------------------------------------------------------------
// 登録項目の値

function memberAnswers(c: CaseData, p: Project, rng: Rng): MemberAnswers {
  const out: MemberAnswers = {};
  for (const f of c.reg) {
    if (f.bands) {
      // いちばん下の子の区分（事業の対象から）
      const w = p.target.includes("3歳未満")
        ? [0.85, 0.15, 0, 0]
        : p.target.includes("産後")
          ? [1, 0, 0, 0]
          : p.target.includes("小学生")
            ? [0.1, 0.15, 0.75, 0]
            : [0.3, 0.25, 0.3, 0.15];
      const b = rng.weighted(w);
      const n = f.bands.map((_, i) => (i === b ? (rng.next() < 0.15 ? 2 : 1) : 0));
      if (b < f.bands.length - 1 && rng.next() < 0.4) n[rng.int(b + 1, f.bands.length - 1)]++;
      out[f.key] = n.join(",");
      continue;
    }
    let w: Record<string, number> = {};
    if (f.key === "relation") w = p.target.includes("産後") ? { 母: 97, 父: 3 } : { 母: 68, 父: 22, 祖父母: 7, その他: 3 };
    else if (f.key === "age" && c.kind === "子育て")
      w = p.target.includes("産後") ? { "20代": 30, "30代": 55, "40代": 15 } : { "20代": 15, "30代": 50, "40代": 30, "50代": 3, "60代": 1.5, "70代以上": 0.5 };
    else if (f.key === "age") w = { "20代以下": 18, "30代": 25, "40代": 25, "50代": 18, "60代以上": 14 };
    else if (f.key === "companions") w = { "1人": 25, "2人": 45, "3〜4人": 25, "5人以上": 5 };
    else if (f.key === "home")
      w = { "北海道（さっぽろ圏の外）": 8, 東北: 8, 関東: 35, 中部: 10, 近畿: 12, "中国・四国": 4, "九州・沖縄": 5, 海外: 5 };
    else if (f.key === "area") w = { わからない: 0 };
    out[f.key] = pickLabel(rng, f.opts, w, f.key === "home" ? 1.3 : f.key === "area" ? 1 : Object.keys(w).length ? 0 : 1);
  }
  if (out.relation === "祖父母" && c.kind === "子育て") out.age = rng.next() < 0.6 ? "60代" : "70代以上";
  return out;
}

/**
 * 利用 G 回を、人（世帯）ごとの回数に分ける計画。specs の割合（人のうち何割が2回以上か・周遊か）に近づくように、
 * 特別な人を1人ずつ足し、残りを1回だけの人にする。
 */
function planUnits(rng: Rng, G: number, specs: { kind: string; share: number; k: () => number }[]) {
  const target = specs.reduce((x, s) => x + s.share, 0);
  const out: { kind: string; k: number }[] = [];
  let used = 0;
  let special = 0;
  const have = new Map<string, number>();
  const ratio = (sp: number, u: number) => (sp + Math.max(0, G - u) ? sp / (sp + Math.max(0, G - u)) : 0);
  while (target > 0 && used < G) {
    // 割合に対していちばん足りない種類を足す
    const lack = (x: (typeof specs)[number]) => (x.share / target) * (special + 1) - (have.get(x.kind) ?? 0);
    const s = specs.reduce((a, b) => (lack(b) > lack(a) ? b : a));
    const k = Math.min(s.k(), G - used);
    if (k < 2) break;
    const before = Math.abs(ratio(special, used) - target);
    const after = Math.abs(ratio(special + 1, used + k) - target);
    if (after > before) break;
    out.push({ kind: s.kind, k });
    have.set(s.kind, (have.get(s.kind) ?? 0) + 1);
    used += k;
    special++;
  }
  for (let i = used; i < G; i++) out.push({ kind: "single", k: 1 });
  return out;
}

// ---------------------------------------------------------------------------
// 本体

type Row = {
  month: number;
  cat: string;
  city: string;
  shopId: string;
  type: string;
  unit: number;
  usedAt: string;
  memberId: string;
  redemptionId: string;
};

type Unit = { rows: number[]; type: string; householdId: string; members: string[]; ticketId: string };

type Ctx = {
  c: CaseData;
  seq: { member: number; household: number; ticket: number; redemption: number; response: number; shop: number };
  raw: RawData;
};

const newId = (ctx: Ctx, k: keyof Ctx["seq"], prefix: string, w: number) => `${prefix}${pad(++ctx.seq[k], w)}`;

/** 券種（寄附企業のギフト＋寄附のない市の分）と重み */
function couponTypes(c: CaseData, p: Project) {
  const ds = c.donors.filter((d) => d.projectId === p.id);
  const types = ds.map((d) => ({ id: d.id, weight: d.weight }));
  const rest = 1 - sumOf(types.map((t) => t.weight));
  if (rest > 0.005 || !types.length) types.push({ id: `${p.id}-city`, weight: types.length ? rest : 1 });
  return types;
}

function genProject(ctx: Ctx, p: Project) {
  const { c, raw } = ctx;
  const rng = new Rng(`${c.id}:${p.id}`);
  const keys = projectMonthKeys(p);
  const U = sumOf(p.used);
  const placeByMember = c.kind === "子育て";
  const kindBd = p.breakdowns.find((b) => b.kind === "kind");
  const placeBd = p.breakdowns.find((b) => b.kind === "place");
  const shopBd = p.breakdowns.find((b) => b.kind === "shop");
  const areaOpts = (c.reg.find((r) => r.key === "area")?.opts ?? []).filter((a) => a !== "わからない");

  // --- 1. 利用の行（月・種類・所在・店） ---
  const catQ = new Map(fitQuota(kindBd?.rows.length ? kindBd.rows : [["その他", U]], U));
  const cityQ = new Map(placeByMember ? [] : fitQuota(placeBd?.rows.length ? placeBd.rows : [["その他", U]], U));
  const rows: Row[] = [];
  const blank = (): Row => ({ month: 0, cat: "", city: "", shopId: "", type: "", unit: -1, usedAt: "", memberId: "", redemptionId: "" });

  const shopsHere: Shop[] = [];
  const addShop = (name: string, category: string, area: string) => {
    const s: Shop = { shopId: newId(ctx, "shop", "S", 4), name, category, area };
    shopsHere.push(s);
    return s;
  };

  // 名前の出ている事業者・加盟店の分を先に取る
  const named = shopBd?.rows ?? [];
  for (const [name, n0] of named) {
    const meta = NAMED_SHOPS[name];
    const category = meta && catQ.has(meta.category) ? meta.category : [...catQ.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const paren = name.match(/（(.+?)）/)?.[1];
    const area = meta?.area ?? paren ?? (placeByMember ? rng.pick(areaOpts) : [...cityQ.keys()][0]);
    const s = addShop(name, category, area);
    const n = Math.min(n0, catQ.get(category) ?? 0, placeByMember ? Infinity : (cityQ.get(area) ?? 0));
    catQ.set(category, (catQ.get(category) ?? 0) - n);
    if (!placeByMember) cityQ.set(area, (cityQ.get(area) ?? 0) - n);
    for (let i = 0; i < n; i++) rows.push({ ...blank(), cat: category, city: placeByMember ? "" : area, shopId: s.shopId });
  }
  const minNamed = named.length ? Math.min(...named.map(([, v]) => v)) : 0;

  // 残りは種類と所在をそれぞれ数どおりに並べて組み合わせる
  const cats = rng.shuffle(expand([...catQ.entries()]));
  const cities = placeByMember ? [] : rng.shuffle(expand([...cityQ.entries()]));
  const start = rows.length;
  for (let i = 0; i < cats.length; i++) rows.push({ ...blank(), cat: cats[i], city: placeByMember ? "" : (cities[i] ?? cities[0] ?? "") });

  // 名前のない店を作って割り当てる（どの店も「上位」の最下位より少なくなるように）
  const cap = minNamed ? Math.max(4, Math.floor(minNamed * 0.6)) : placeByMember ? 120 : 30;
  const groups = new Map<string, number[]>();
  for (let i = start; i < rows.length; i++) {
    const k = `${rows[i].cat}|${rows[i].city}`;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(i);
  }
  let shopNo = 0;
  for (const [k, idx] of groups) {
    const [cat, city] = k.split("|");
    const n = Math.max(1, Math.ceil(idx.length / cap));
    const made: Shop[] = [];
    for (let j = 0; j < n; j++) {
      shopNo++;
      if (placeByMember) made.push(addShop(`${cat.replace(/ (半日券|1時間券)$/, "")} ${pad(shopNo, 2)}`, cat, rng.pick(areaOpts)));
      else made.push(addShop(`${SHOP_NOUN[cat] ?? cat}${pad(shopNo, 2)}（${city}）`, cat, city));
    }
    rng.shuffle(idx).forEach((ri, j) => (rows[ri].shopId = made[j % n].shopId));
  }

  // 月（数どおり）
  const months = rng.shuffle(expand(fitQuota(p.used.map((v, i) => [String(i), v]), rows.length)));
  rows.forEach((r, i) => (r.month = Number(months[i] ?? 0)));

  // --- 2. 券種（寄附企業のギフト）ごとに分ける ---
  const types = couponTypes(c, p);
  const map = GIFT_CATEGORIES[c.id]?.[p.id] ?? {};
  const catToType = new Map<string, string>();
  for (const [t, cs] of Object.entries(map)) if (types.some((x) => x.id === t)) for (const cc of cs) catToType.set(cc, t);
  const freeTypes = types.filter((t) => !map[t.id]);
  const freeRows: number[] = [];
  rows.forEach((r, i) => {
    const t = catToType.get(r.cat);
    if (t) r.type = t;
    else freeRows.push(i);
  });
  if (freeRows.length) {
    const ft = freeTypes.length ? freeTypes : [{ id: `${p.id}-city`, weight: 1 }];
    const labels = rng.shuffle(expand(fitQuota(ft.map((t) => [t.id, Math.max(t.weight, 1e-6)]), freeRows.length)));
    freeRows.forEach((ri, j) => (rows[ri].type = labels[j]));
  }

  // --- 3. 世帯（観光は利用者）にまとめる ---
  const units: Unit[] = [];
  const byType = new Map<string, number[]>();
  rows.forEach((r, i) => (byType.get(r.type) ?? byType.set(r.type, []).get(r.type)!).push(i));
  const repeatK = () => [2, 3, 4, 5, 6][rng.weighted([55, 25, 12, 5, 3])];

  for (const [type, idx] of byType) {
    if (placeByMember) {
      // 子育て：一定の割合の世帯が2回以上使う
      const pool = rng.shuffle([...idx]);
      const plan = rng.shuffle(planUnits(rng, pool.length, [{ kind: "repeat", share: p.repeat, k: repeatK }]));
      let at = 0;
      for (const { k: k0 } of plan) {
        const k = Math.min(k0, pool.length - at);
        if (k <= 0) break;
        units.push({ rows: pool.slice(at, at + k), type, householdId: "", members: [], ticketId: "" });
        at += k;
      }
      continue;
    }
    // 観光：周遊（2市町村以上）と同じ加盟店のリピートの割合に合わせて組む
    const taken = new Uint8Array(rows.length);
    const byCity = new Map<string, number[]>();
    const byShop = new Map<string, number[]>();
    for (const i of rng.shuffle([...idx])) {
      (byCity.get(rows[i].city) ?? byCity.set(rows[i].city, []).get(rows[i].city)!).push(i);
      (byShop.get(rows[i].shopId) ?? byShop.set(rows[i].shopId, []).get(rows[i].shopId)!).push(i);
    }
    const cityRem = new Map([...byCity].map(([k, v]) => [k, v.length]));
    const shopRem = new Map([...byShop].map(([k, v]) => [k, v.length]));
    const shopsOfCity = new Map<string, string[]>();
    for (const [sid, v] of byShop) {
      const cty = rows[v[0]].city;
      (shopsOfCity.get(cty) ?? shopsOfCity.set(cty, []).get(cty)!).push(sid);
    }
    let left = idx.length;
    const take = (i: number) => {
      taken[i] = 1;
      left--;
      cityRem.set(rows[i].city, cityRem.get(rows[i].city)! - 1);
      shopRem.set(rows[i].shopId, shopRem.get(rows[i].shopId)! - 1);
      return i;
    };
    const popFrom = (arr: number[]) => {
      while (arr.length) {
        const i = arr.pop()!;
        if (!taken[i]) return take(i);
      }
      return -1;
    };
    const pickCity = (not: Set<string>) => {
      const cs = [...cityRem].filter(([k, v]) => v > 0 && !not.has(k));
      return cs.length ? cs[rng.weighted(cs.map(([, v]) => v))][0] : null;
    };
    const plan = planUnits(rng, idx.length, [
      { kind: "tour", share: p.tour ?? 0, k: () => (rng.next() < 0.7 ? 2 : 3) },
      { kind: "repeat", share: p.repeat, k: () => (rng.next() < 0.8 ? 2 : 3) },
    ]).filter((x) => x.kind !== "single");
    // 周遊・リピートの人を先に組み、残りは1回だけの人にする
    plan.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "tour" ? -1 : 1));
    for (const { kind, k } of plan) {
      const got: number[] = [];
      if (kind === "tour") {
        const used = new Set<string>();
        for (let j = 0; j < k; j++) {
          const cty = pickCity(used);
          if (!cty) break;
          used.add(cty);
          const i = popFrom(byCity.get(cty)!);
          if (i >= 0) got.push(i);
        }
      } else {
        const cty = pickCity(new Set());
        const cand = cty ? shopsOfCity.get(cty)!.filter((s) => shopRem.get(s)! >= 2) : [];
        if (cand.length) {
          const sid = cand[rng.weighted(cand.map((s) => shopRem.get(s)!))];
          for (let j = 0; j < k; j++) {
            const i = popFrom(byShop.get(sid)!);
            if (i >= 0) got.push(i);
          }
        }
      }
      if (got.length) units.push({ rows: got, type, householdId: "", members: [], ticketId: "" });
    }
    while (left > 0) {
      const cty = pickCity(new Set());
      if (!cty) break;
      const i = popFrom(byCity.get(cty)!);
      if (i >= 0) units.push({ rows: [i], type, householdId: "", members: [], ticketId: "" });
    }
  }
  units.forEach((u, ui) => u.rows.forEach((ri) => (rows[ri].unit = ui)));

  // --- 4. 日時 ---
  for (const r of rows) r.usedAt = randomInMonth(rng, keys[r.month]);
  for (const u of units) u.rows.sort((a, b) => (rows[a].usedAt < rows[b].usedAt ? -1 : 1));

  // --- 5. 世帯と会員（子育ては住まいの地区を「地区別」の数に合わせる） ---
  const unitArea: string[] = new Array(units.length).fill("");
  if (placeByMember) {
    const q = new Map(fitQuota(placeBd?.rows.length ? placeBd.rows : areaOpts.map((a) => [a, 1]), rows.length));
    const order = units.map((_, i) => i).sort((a, b) => units[b].rows.length - units[a].rows.length || a - b);
    for (const ui of order) {
      const k = units[ui].rows.length;
      const fit = [...q].filter(([, v]) => v >= k);
      const list = fit.length ? fit : [...q].sort((a, b) => b[1] - a[1]).slice(0, 1);
      const a = list[rng.weighted(list.map(([, v]) => v))][0];
      q.set(a, q.get(a)! - k);
      unitArea[ui] = a;
    }
  }
  const placeWeights = placeBd?.rows.length ? placeBd.rows : areaOpts.map((a) => [a, 1] as [string, number]);

  const makeHousehold = (u: Unit | null, area: string) => {
    const householdId = placeByMember ? newId(ctx, "household", "H", 7) : "";
    const a = memberAnswers(c, p, rng);
    if (placeByMember && "area" in a) a.area = area || placeWeights[rng.weighted(placeWeights.map(([, v]) => v))][0];
    const primary: Member = { memberId: newId(ctx, "member", "U", 7), householdId, registeredAt: "", answers: a };
    if (!placeByMember) primary.householdId = primary.memberId;
    const members = [primary];
    // 家族共有：1割ほどの世帯は2アカウント
    if (placeByMember && rng.next() < 0.1) {
      const b = { ...a };
      if (b.relation) b.relation = b.relation === "母" ? "父" : "母";
      members.push({ memberId: newId(ctx, "member", "U", 7), householdId, registeredAt: "", answers: b });
    }
    raw.members.push(...members);
    if (u) {
      u.householdId = primary.householdId;
      u.members = members.map((m) => m.memberId);
    }
    return members;
  };

  // --- 6. チケット（発行・受取）と利用の明細 ---
  const issuedAt = (() => {
    const { start } = projectPeriod(p);
    return jst(start[0], start[1], 1, 9);
  })();
  const expiresAt = projectExpiresAt(p);
  const recvMonths = expand(fitQuota(p.received.map((v, i) => [String(i), v]), Math.min(sumOf(p.received), Math.max(p.issued, units.length))))
    .map(Number)
    .sort((a, b) => a - b);
  const unitOrder = units.map((_, i) => i).sort((a, b) => (rows[units[a].rows[0]].usedAt < rows[units[b].rows[0]].usedAt ? -1 : 1));
  const memberById = new Map<string, Member>();
  const typeWeights = types.map((t) => t.weight);

  const newTicket = (type: string, memberId: string | null, receivedAt: string | null): Ticket => {
    const t: Ticket = { ticketId: newId(ctx, "ticket", "T", 7), couponTypeId: type, projectId: p.id, memberId, issuedAt, receivedAt, expiresAt };
    raw.tickets.push(t);
    return t;
  };

  let ri = 0;
  for (const ui of unitOrder) {
    const u = units[ui];
    const first = rows[u.rows[0]].usedAt;
    const firstMs = Date.parse(first);
    const m = recvMonths[ri++] ?? rows[u.rows[0]].month;
    const mKey = keys[m];
    let recvMs: number;
    if (mKey < monthKeyOf(first)) recvMs = Date.parse(randomInMonth(rng, mKey));
    else {
      const s = Math.max(monthStartMs(monthKeyOf(first)) + 9 * 3600_000, Date.parse(issuedAt));
      recvMs = s + Math.floor(rng.next() * Math.max(0, firstMs - s) * 0.9);
    }
    const members = makeHousehold(u, unitArea[ui]);
    members.forEach((mm) => memberById.set(mm.memberId, mm));
    const receivedAt = jstFromMs(recvMs);
    members[0].registeredAt = jstFromMs(recvMs - rng.int(0, 5 * 24 * 60) * 60_000);
    const t = newTicket(u.type, members[0].memberId, receivedAt);
    u.ticketId = t.ticketId;
    u.rows.forEach((rix, j) => {
      const r = rows[rix];
      r.memberId = members.length > 1 && j > 0 && rng.next() < 0.5 ? members[1].memberId : members[0].memberId;
    });
    if (members[1]) {
      const own = u.rows.map((rix) => rows[rix]).find((r) => r.memberId === members[1].memberId);
      const lim = own ? Date.parse(own.usedAt) - 60 * 60_000 : recvMs + 30 * 24 * 3600_000;
      members[1].registeredAt = jstFromMs(Math.min(lim, recvMs + rng.int(1, 10 * 24 * 60) * 60_000));
    }
  }
  // 受け取ったが使っていない分
  while (ri < recvMonths.length) {
    const recvAt = randomInMonth(rng, keys[recvMonths[ri++]]);
    const members = makeHousehold(null, "");
    members[0].registeredAt = jstFromMs(Date.parse(recvAt) - rng.int(0, 5 * 24 * 60) * 60_000);
    members.slice(1).forEach((mm) => (mm.registeredAt = jstFromMs(Date.parse(recvAt) + rng.int(1, 10 * 24 * 60) * 60_000)));
    newTicket(types[rng.weighted(typeWeights)].id, members[0].memberId, recvAt);
  }
  // まだ受け取られていない分
  const issuedN = Math.max(p.issued, raw.tickets.filter((t) => t.projectId === p.id).length);
  for (let n = raw.tickets.filter((t) => t.projectId === p.id).length; n < issuedN; n++) newTicket(types[rng.weighted(typeWeights)].id, null, null);

  // 利用の明細
  const redemptionsHere: Redemption[] = [];
  const baseAmount = p.unitValue;
  for (const u of units) {
    for (const rix of u.rows) {
      const r = rows[rix];
      const amount = placeByMember ? baseAmount : Math.max(500, Math.round((baseAmount * Math.exp(0.45 * rng.gauss() - 0.1)) / 100) * 100);
      r.redemptionId = newId(ctx, "redemption", "R", 8);
      redemptionsHere.push({ redemptionId: r.redemptionId, ticketId: u.ticketId, memberId: r.memberId, shopId: r.shopId, usedAt: r.usedAt, amount, count: 1 });
    }
  }
  redemptionsHere.sort((a, b) => (a.usedAt < b.usedAt ? -1 : a.usedAt > b.usedAt ? 1 : 0));
  raw.redemptions.push(...redemptionsHere);
  raw.shops.push(...shopsHere);

  // --- 7. アンケート ---
  const target = c.agg[p.id];
  if (target) genSurvey(ctx, p, rng, rows, units, target, memberById);

  // --- 8. 前年度 ---
  if (p.receivedPrev || p.usedPrev) {
    const fy = Number(keys[0]?.slice(0, 4)) - (Number(keys[0]?.slice(5, 7)) >= 4 ? 1 : 2);
    p.months.forEach((month, i) => {
      const b: Baseline = { projectId: p.id, fiscalYear: fy, month, received: p.receivedPrev?.[i] ?? 0, used: p.usedPrev?.[i] ?? 0 };
      raw.baselines.push(b);
    });
  }
}

// ---------------------------------------------------------------------------
// アンケート

function genSurvey(
  ctx: Ctx,
  p: Project,
  rng: Rng,
  rows: Row[],
  units: Unit[],
  target: CaseData["agg"][string],
  memberById: Map<string, Member>,
) {
  const { c, raw } = ctx;
  const qs = c.questions.filter((q) => q.type !== "text");
  const sizeOf = (q: Question) => {
    const a = target[q.id];
    if (!a) return 0;
    if (q.type === "multi") return 0;
    if (q.type === "yen") return (a as number[])[1] ?? 0;
    return sumOf(a as number[]);
  };
  const N = Math.min(rows.length, Array.isArray(target.sat) ? sumOf(target.sat as number[]) : Math.max(0, ...qs.map(sizeOf)));
  if (!N) return;

  // どの利用に回答が付くか。「初めてか」を聞く事業は、世帯の初回の利用に多く付ける
  const firstQ = c.kind === "子育て" ? qs.find((q) => q.id === "first" && q.type === "choice") : undefined;
  const firstRows = new Set(units.map((u) => u.rows[0]));
  let chosen: number[];
  if (firstQ && p.firstTime) {
    const want = Math.min(N, firstRows.size, Math.round((((target.first as number[] | undefined)?.[0] ?? 0) / p.firstTime) || N));
    const fr = rng.shuffle([...firstRows]).slice(0, want);
    const others = rng.shuffle(rows.map((_, i) => i).filter((i) => !firstRows.has(i)));
    chosen = [...fr, ...others.slice(0, N - fr.length)];
    if (chosen.length < N) chosen.push(...rng.shuffle([...firstRows].filter((i) => !fr.includes(i))).slice(0, N - chosen.length));
  } else chosen = rng.shuffle(rows.map((_, i) => i)).slice(0, N);

  const nowMs = RAW_NOW_MS;
  const resp: SurveyResponse[] = chosen.map((rix) => {
    const r = rows[rix];
    const at = Math.min(Date.parse(r.usedAt) + rng.int(5, 180) * 60_000, nowMs - 60_000);
    return {
      responseId: newId(ctx, "response", "A", 7),
      redemptionId: r.redemptionId,
      memberId: r.memberId,
      projectId: p.id,
      answeredAt: jstFromMs(at),
      answers: {},
      comment: "",
      publish: false,
      theme: "",
    };
  });

  // 設問ごとに、今の集計どおりの値を配る
  for (const q of qs) {
    const a = target[q.id];
    if (!a) continue;
    if (q.type === "multi") {
      for (const [opt, n] of Object.entries(a as Record<string, number>)) {
        for (const i of rng.shuffle(resp.map((_, j) => j)).slice(0, Math.min(n, N))) {
          const cur = (resp[i].answers[q.id] as string[] | undefined) ?? [];
          resp[i].answers[q.id] = [...cur, opt];
        }
      }
      // 選択肢の順に並べる
      for (const r of resp) {
        const v = r.answers[q.id];
        if (Array.isArray(v) && q.opts) r.answers[q.id] = q.opts.filter((o) => v.includes(o)).concat(v.filter((o) => !q.opts!.includes(o)));
      }
      continue;
    }
    if (q.type === "yen") {
      const [total, cnt0] = a as number[];
      const cnt = Math.min(cnt0 ?? 0, N);
      if (!cnt) continue;
      const mean = total / cnt;
      let xs = Array.from({ length: cnt }, () => Math.max(0, mean * Math.exp(0.6 * rng.gauss() - 0.18)));
      const s = sumOf(xs) || 1;
      xs = xs.map((x) => Math.round((x * total) / s / 100) * 100);
      const diff = total - sumOf(xs);
      const mi = xs.indexOf(Math.max(...xs));
      xs[mi] = Math.max(0, xs[mi] + diff);
      rng.shuffle(resp.map((_, j) => j)).slice(0, cnt).forEach((i, j) => (resp[i].answers[q.id] = xs[j]));
      continue;
    }
    const labels = q.type === "scale" ? ["1", "2", "3", "4", "5"] : (q.opts ?? []);
    const counts = (a as number[]).slice(0, labels.length);
    const tot = sumOf(counts);
    const fitted = tot > N ? fitQuota(labels.map((l, i) => [l, counts[i] ?? 0]), N) : labels.map((l, i) => [l, counts[i] ?? 0] as [string, number]);
    const vals = expand(fitted);
    const toVal = (s: string): AnswerValue => (q.type === "scale" ? Number(s) : s);

    if (firstQ && q.id === firstQ.id && q.opts && q.opts.length >= 2) {
      // 「初めて」は世帯の初回の利用に付いた回答にだけ配る
      const yes = fitted[0][1];
      const firstIdx = rng.shuffle(resp.map((_, j) => j).filter((j) => firstRows.has(chosen[j])));
      const otherIdx = rng.shuffle(resp.map((_, j) => j).filter((j) => !firstRows.has(chosen[j])));
      const order = [...firstIdx, ...otherIdx];
      const rest = rng.shuffle(vals.filter((v) => v !== q.opts![0]));
      order.forEach((j, k) => {
        if (k < yes) resp[j].answers[q.id] = q.opts![0];
        else if (k - yes < rest.length) resp[j].answers[q.id] = rest[k - yes];
      });
      continue;
    }
    const slots = rng.shuffle(resp.map((_, j) => j)).slice(0, vals.length);
    rng.shuffle(vals).forEach((v, j) => (resp[slots[j]].answers[q.id] = toVal(v)));
  }

  // --- 声（今の voices の文言） ---
  const lastKey = projectMonthKeys(p).slice(-1)[0];
  const used = new Set<number>();
  const rowOfResp = chosen;
  const ticketType = new Map(units.map((u) => [u.ticketId, u.type]));
  const unitOfRow = (rix: number) => units[rows[rix].unit];
  const redemptionById = new Map(raw.redemptions.filter((x) => x.ticketId && ticketType.has(x.ticketId)).map((x) => [x.redemptionId, x]));
  const ticketById = new Map(raw.tickets.filter((t) => t.projectId === p.id).map((t) => [t.ticketId, t]));
  const reactions: Reaction[] = [];

  for (const v of c.voices.filter((x) => x.projectId === p.id)) {
    const want = attrsToAnswers(c, v.attrs);
    let best = -1;
    let bestScore = -1;
    const order = rng.shuffle(resp.map((_, j) => j));
    for (const j of order) {
      if (used.has(j)) continue;
      const rix = rowOfResp[j];
      if (rows[rix].type !== v.giftId && c.donors.some((d) => d.id === v.giftId && d.projectId === p.id)) continue;
      const m = memberById.get(resp[j].memberId);
      let score = monthKeyOf(rows[rix].usedAt) === lastKey ? 2 : 0;
      if (want.area && m?.answers.area === want.area) score += 1;
      if (score > bestScore) {
        best = j;
        bestScore = score;
        if (score === 3 || (score === 2 && !want.area)) break;
      }
    }
    if (best < 0) continue;
    used.add(best);
    const r = resp[best];
    r.comment = v.text;
    r.publish = true;
    r.theme = v.theme;
    const ansMs = RAW_NOW_MS - (v.minutesAgo ?? 0) * 60_000;
    r.answeredAt = jstFromMs(ansMs);
    const red = redemptionById.get(r.redemptionId);
    if (red && Date.parse(red.usedAt) > ansMs - 10 * 60_000) {
      const usedMs = ansMs - rng.int(10, 60) * 60_000;
      red.usedAt = jstFromMs(usedMs);
      rows[rowOfResp[best]].usedAt = red.usedAt;
      const t = ticketById.get(red.ticketId);
      if (t?.receivedAt && Date.parse(t.receivedAt) > usedMs - 30 * 60_000) t.receivedAt = jstFromMs(usedMs - 60 * 60_000);
    }
    // 声を書いた人の登録項目を attrs に合わせる（地区は世帯全員）
    const u = unitOfRow(rowOfResp[best]);
    const writer = memberById.get(r.memberId);
    if (writer) for (const [k, val] of Object.entries(want)) if (val && k !== "area") writer.answers[k] = val;
    if (want.area && writer) for (const mid of u.members) {
      const mm = memberById.get(mid);
      if (mm && "area" in mm.answers) mm.answers.area = want.area;
    }
    // 満足度は4以上にそろえる（他の回答と入れ替えるので集計は変わらない）
    const sat = r.answers.sat;
    if (typeof sat === "number" && sat < 4) {
      const k = resp.findIndex((x, j) => !used.has(j) && x.answers.sat === 5);
      if (k >= 0) [r.answers.sat, resp[k].answers.sat] = [5, sat];
    }
    reactions.push({ responseId: r.responseId, likes: v.likes });
  }

  resp.sort((a, b) => (a.answeredAt < b.answeredAt ? -1 : 1));
  raw.surveyResponses.push(...resp);
  raw.reactions.push(...reactions);
}

// ---------------------------------------------------------------------------

/** 今のモック（CaseData）から元データを作る。決まった種なので毎回同じ結果 */
export function generateRaw(c: CaseData): RawData {
  const raw: RawData = { caseId: c.id, members: [], tickets: [], redemptions: [], shops: [], surveyResponses: [], donations: [], baselines: [], reactions: [] };
  const ctx: Ctx = { c, raw, seq: { member: 0, household: 0, ticket: 0, redemption: 0, response: 0, shop: 0 } };
  for (const p of c.projects) genProject(ctx, p);
  raw.redemptions.sort((a, b) => (a.usedAt < b.usedAt ? -1 : a.usedAt > b.usedAt ? 1 : 0));
  raw.donations = c.donors.map(
    (d, i): Donation => ({ donationId: `G${pad(i + 1, 4)}`, donor: d.name, couponTypeId: d.id, projectId: d.projectId, amount: d.amount, donatedOn: d.donatedOn ?? "" }),
  );
  return raw;
}
