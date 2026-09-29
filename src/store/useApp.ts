"use client";

import { useMemo } from "react";
import { create } from "zustand";
import { CASES } from "@/data";
import type { RawData } from "@/data/raw/types";
import { generateRaw } from "@/data/raw/generate";
import { appendReaction, appendReceive, appendRedeem, appendSurvey } from "@/data/raw/append";
import { buildCase } from "@/lib/build-case";
import { demoNowJst } from "@/data/raw/calendar";
import type { CaseData, CaseId, Donor, Project, Question, RegField, Voice } from "@/data/types";

export type Compare = "month" | "year";

export type CorpShow = {
  cards: boolean;
  amount: boolean;
  households: boolean;
  userate: boolean;
  reach: boolean;
  voices: boolean;
  places: boolean;
  report: boolean;
};

/** スマホ（e街のサイト）の画面。wallet＝手持ちのクーポン、get＝クーポンをもらう、open＝受け取った直後 */
export type PhoneStep = "portal" | "login" | "register" | "wallet" | "get" | "open" | "mypage" | "use" | "survey" | "done";

/** スマホで増えた分（ギフトごと）。もとのモックデータには手を入れず、足して見せる */
export type Extra = Record<string, { received: number; used: number }>;

/** master：設定で編集するもの（事業・券種・寄附・設問・登録項目）。数字は raw から計算する */
const seed = (): Record<CaseId, CaseData> => structuredClone(CASES);
const seedRaw = (m: Record<CaseId, CaseData>): Record<CaseId, RawData> => ({ matsumoto: generateRaw(m.matsumoto), sapporo: generateRaw(m.sapporo) });
const initialMaster = seed();

const phoneInit = {
  phoneStep: "portal" as PhoneStep,
  phoneMemberId: null as string | null,
  phoneTicketId: null as string | null,
  phoneRedemptionId: null as string | null,
  reg: {} as Record<number, string>,
  answers: {} as Record<string, string | number | string[]>,
  phoneReceived: false,
};

type AppState = {
  caseId: CaseId;
  /** master（設定で編集） */
  cases: Record<CaseId, CaseData>;
  /** 元データ（e街の出力に似せた明細。スマホの操作で行が増える） */
  raw: Record<CaseId, RawData>;
  setRaw: (r: RawData) => void;
  hiddenVoices: Record<string, boolean>;
  seedNow: number;
  phoneMemberId: string | null;
  phoneTicketId: string | null;
  phoneRedemptionId: string | null;
  extra: Record<CaseId, Extra>;
  cmp: Compare;
  corpGift: Partial<Record<CaseId, string>>;
  muniProject: Partial<Record<CaseId, string>>;
  muniGift: Partial<Record<CaseId, string>>;
  corpShow: CorpShow;
  liked: Record<string, boolean>;
  flashVoiceId: string | null;
  phoneStep: PhoneStep;
  reg: Record<number, string>;
  answers: Record<string, string | number | string[]>;
  useCount: number;
  phoneReceived: boolean;

  setCase: (id: CaseId) => void;
  setCmp: (c: Compare) => void;
  setCorpGift: (id: string) => void;
  setMuniProject: (id: string) => void;
  setMuniGift: (id: string) => void;
  toggleLike: (voiceId: string) => void;
  toggleVoiceHidden: (voiceId: string) => void;
  addVoice: (v: Voice) => void;
  /** 報告書の自治体が記入する欄（企業の読むだけの画面にも出す） */
  reportNotes: Record<string, string>;
  setReportNote: (id: string, v: string) => void;
  countShareView: () => void;

  setPhoneStep: (s: PhoneStep) => void;
  setReg: (i: number, v: string) => void;
  setAnswer: (q: string, v: string | number | string[]) => void;
  receive: (giftId: string) => void;
  redeem: (giftId: string) => void;
  submitSurvey: (giftId: string, projectId: string, text: string, publish: boolean) => void;
  restartPhone: () => void;
  reset: () => void;

  updateQuestion: (id: string, patch: Partial<Question>) => void;
  addQuestion: (q: Omit<Question, "id">) => void;
  removeQuestion: (id: string) => void;
  moveQuestion: (id: string, dir: -1 | 1) => void;
  setCorpShow: (k: keyof CorpShow, v: boolean) => void;

  /** 設定：事業・寄附・登録項目（マスタ）を書き換える。すべての画面・報告書に反映 */
  updateProject: (id: string, patch: Partial<Project>) => void;
  updateDonor: (id: string, patch: Partial<Donor>) => void;
  addDonor: (projectId: string) => void;
  removeDonor: (id: string) => void;
  updateRegField: (i: number, patch: Partial<RegField>) => void;
  addRegField: () => void;
  removeRegField: (i: number) => void;
};

const editCase = (s: AppState, fn: (c: CaseData) => CaseData) => ({ cases: { ...s.cases, [s.caseId]: fn(s.cases[s.caseId]) } });

const emptyAgg = (type: Question["type"], opts?: string[]) =>
  type === "multi" ? {} : type === "yen" ? [0, 0] : Array(type === "scale" ? 5 : (opts?.length ?? 0)).fill(0);

const editQs = (s: AppState, fn: (qs: Question[]) => Question[]) => {
  const c = s.cases[s.caseId];
  return { cases: { ...s.cases, [s.caseId]: { ...c, questions: fn(c.questions) } } };
};

export const useApp = create<AppState>((set) => ({
  caseId: "matsumoto",
  cases: initialMaster,
  raw: seedRaw(initialMaster),
  setRaw: (r) => set((s) => ({ raw: { ...s.raw, [s.caseId]: r } })),
  hiddenVoices: {},
  seedNow: Date.now(),
  extra: { matsumoto: {}, sapporo: {} },
  cmp: "month",
  corpGift: {},
  muniProject: {},
  muniGift: {},
  corpShow: { cards: true, amount: true, households: true, userate: true, reach: true, voices: true, places: true, report: true },
  liked: {},
  flashVoiceId: null,
  ...phoneInit,
  useCount: 0,

  setCase: (caseId) => set({ caseId, ...phoneInit }),
  setCmp: (cmp) => set({ cmp }),
  setCorpGift: (id) => set((s) => ({ corpGift: { ...s.corpGift, [s.caseId]: id } })),
  setMuniProject: (id) => set((s) => ({ muniProject: { ...s.muniProject, [s.caseId]: id }, muniGift: { ...s.muniGift, [s.caseId]: "all" } })),
  setMuniGift: (id) => set((s) => ({ muniGift: { ...s.muniGift, [s.caseId]: id } })),
  toggleLike: (voiceId) =>
    set((s) => {
      const on = !s.liked[voiceId];
      return { liked: { ...s.liked, [voiceId]: on }, raw: { ...s.raw, [s.caseId]: appendReaction(s.raw[s.caseId], voiceId, on ? 1 : -1) } };
    }),
  toggleVoiceHidden: (voiceId) => set((s) => ({ hiddenVoices: { ...s.hiddenVoices, [voiceId]: !s.hiddenVoices[voiceId] } })),
  reportNotes: {},
  setReportNote: (id, v) => set((s) => ({ reportNotes: { ...s.reportNotes, [id]: v } })),
  /** 新しい声が届く（別の人が受け取り→使い→答えた、を元データに足す） */
  addVoice: (v) =>
    set((s) => {
      const c = s.cases[s.caseId];
      let raw = s.raw[s.caseId];
      if (raw.surveyResponses.some((x) => x.comment === v.text)) return {};
      const shopId = firstShopOf(raw, v.projectId);
      if (!shopId) return {};
      const rec = appendReceive(raw, { at: demoNowJst(s.seedNow), projectId: v.projectId, couponTypeId: v.giftId || firstCouponOf(c, v.projectId), answers: answersFromAttrs(c, v.attrs) });
      raw = rec.raw;
      const red = appendRedeem(raw, { at: demoNowJst(s.seedNow), ticketId: rec.ticket.ticketId, shopId, unitValue: c.projects.find((p) => p.id === v.projectId)?.unitValue });
      raw = red.raw;
      const sat = c.questions.find((q) => q.id === "sat");
      const res = appendSurvey(raw, { at: demoNowJst(s.seedNow), redemptionId: red.redemption.redemptionId, answers: sat ? { sat: 5 } : {}, comment: v.text, publish: true, theme: v.theme });
      return { raw: { ...s.raw, [s.caseId]: res.raw }, flashVoiceId: res.response.responseId };
    }),
  countShareView: () =>
    set((s) => {
      const c = s.cases[s.caseId];
      return { cases: { ...s.cases, [s.caseId]: { ...c, corp: { ...c.corp, viewed: c.corp.viewed + 1 } } } };
    }),

  setPhoneStep: (phoneStep) => set({ phoneStep }),
  setReg: (i, v) => set((s) => ({ reg: { ...s.reg, [i]: v } })),
  setAnswer: (q, v) => set((s) => ({ answers: { ...s.answers, [q]: v } })),
  receive: (giftId) =>
    set((s) => {
      const c = s.cases[s.caseId];
      const d = c.donors.find((x) => x.id === giftId);
      if (!d) return {};
      const rec = appendReceive(s.raw[s.caseId], { at: demoNowJst(s.seedNow), projectId: d.projectId, couponTypeId: d.id, memberId: s.phoneMemberId ?? undefined, answers: regAnswers(c, s.reg) });
      return {
        raw: { ...s.raw, [s.caseId]: rec.raw },
        phoneMemberId: rec.member.memberId,
        phoneTicketId: rec.ticket.ticketId,
        phoneReceived: true,
        phoneStep: "open",
      };
    }),
  redeem: (giftId) =>
    set((s) => {
      const c = s.cases[s.caseId];
      const d = c.donors.find((x) => x.id === giftId);
      const raw = s.raw[s.caseId];
      const shopId = d ? firstShopOf(raw, d.projectId) : undefined;
      if (!d || !s.phoneTicketId || !shopId) return {};
      const red = appendRedeem(raw, { at: demoNowJst(s.seedNow), ticketId: s.phoneTicketId, shopId, unitValue: c.projects.find((p) => p.id === d.projectId)?.unitValue });
      return { raw: { ...s.raw, [s.caseId]: red.raw }, phoneRedemptionId: red.redemption.redemptionId, useCount: s.useCount + 1, phoneStep: "survey", answers: {} };
    }),
  submitSurvey: (_giftId, _projectId, text, publish) =>
    set((s) => {
      if (!s.phoneRedemptionId) return { phoneStep: "done" };
      const answers = Object.fromEntries(Object.entries(s.answers).filter(([, v]) => v !== "" && v != null)) as Record<string, string | number | string[]>;
      const res = appendSurvey(s.raw[s.caseId], { at: demoNowJst(s.seedNow), redemptionId: s.phoneRedemptionId, answers, comment: text.trim(), publish, theme: "届いたばかりの声" });
      return { raw: { ...s.raw, [s.caseId]: res.raw }, flashVoiceId: text.trim() && publish ? res.response.responseId : null, phoneStep: "done" };
    }),
  restartPhone: () => set({ ...phoneInit }),
  updateQuestion: (id, patch) =>
    set((s) =>
      editQs(s, (qs) =>
        qs.map((q) => {
          if (q.id !== id) return q;
          const n = { ...q, ...patch };
          if ((n.type === "choice" || n.type === "multi") && !n.opts?.length) n.opts = ["はい", "いいえ"];
          return n;
        }),
      ),
    ),
  addQuestion: (q) =>
    set((s) => {
      const id = `q${Date.now()}`;
      const c = s.cases[s.caseId];
      const agg = Object.fromEntries(Object.entries(c.agg).map(([pid, pa]) => [pid, { ...pa, [id]: emptyAgg(q.type, q.opts) }]));
      const r = editQs(s, (qs) => {
        // 自由記述（ひとこと）は最後に残す
        const last = qs[qs.length - 1]?.type === "text" ? qs.length - 1 : qs.length;
        return [...qs.slice(0, last), { ...q, id }, ...qs.slice(last)];
      });
      return { cases: { ...r.cases, [s.caseId]: { ...r.cases[s.caseId], agg } } };
    }),
  removeQuestion: (id) => set((s) => editQs(s, (qs) => qs.filter((q) => q.id !== id || q.locked))),
  moveQuestion: (id, dir) =>
    set((s) =>
      editQs(s, (qs) => {
        const i = qs.findIndex((q) => q.id === id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= qs.length || qs[j].locked) return qs;
        const n = [...qs];
        [n[i], n[j]] = [n[j], n[i]];
        return n;
      }),
    ),
  setCorpShow: (k, v) => set((s) => ({ corpShow: { ...s.corpShow, [k]: v } })),
  updateProject: (id, patch) => set((s) => editCase(s, (c) => ({ ...c, projects: c.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))),
  updateDonor: (id, patch) =>
    set((s) => {
      const next = editCase(s, (c) => ({ ...c, donors: c.donors.map((d) => (d.id === id ? { ...d, ...patch } : d)) }));
      return { ...next, raw: { ...s.raw, [s.caseId]: syncDonations(s.raw[s.caseId], next.cases[s.caseId], id, patch) } };
    }),
  addDonor: (projectId) =>
    set((s) => {
      let newId = "";
      const next = editCase(s, (c) => {
        const first = c.donors.find((d) => d.projectId === projectId);
        const d: Donor = {
          id: `d${Date.now()}`,
          name: "新しい寄附企業株式会社",
          amount: 1_000_000,
          projectId,
          giftName: first?.giftName ?? "クーポン",
          photo: first?.photo ?? "m1",
          weight: 0,
          donatedOn: "2026年10月1日",
        };
        newId = d.id;
        return { ...c, donors: [...c.donors, d] };
      });
      return { ...next, raw: { ...s.raw, [s.caseId]: syncDonations(s.raw[s.caseId], next.cases[s.caseId], newId) } };
    }),
  removeDonor: (id) =>
    set((s) => {
      const next = editCase(s, (c) => ({ ...c, donors: c.donors.filter((d) => d.id !== id) }));
      return { ...next, raw: { ...s.raw, [s.caseId]: syncDonations(s.raw[s.caseId], next.cases[s.caseId], id) } };
    }),
  updateRegField: (i, patch) => set((s) => editCase(s, (c) => ({ ...c, reg: c.reg.map((r, j) => (j === i ? { ...r, ...patch } : r)) }))),
  addRegField: () => set((s) => editCase(s, (c) => ({ ...c, reg: [...c.reg, { key: `r${Date.now()}`, label: "新しい項目", opts: ["はい", "いいえ"] }] }))),
  removeRegField: (i) => set((s) => editCase(s, (c) => ({ ...c, reg: c.reg.filter((_, j) => j !== i) }))),
  reset: () => {
    const m = seed();
    set({ cases: m, raw: seedRaw(m), hiddenVoices: {}, seedNow: Date.now(), extra: { matsumoto: {}, sapporo: {} }, liked: {}, flashVoiceId: null, corpGift: {}, muniGift: {}, muniProject: {}, ...phoneInit, useCount: 0 });
  },
}));

let cache: { m: CaseData; r: RawData; h: Record<string, boolean>; out: CaseData } | null = null;
function cached(m: CaseData, r: RawData, h: Record<string, boolean>, now: number) {
  if (cache && cache.m === m && cache.r === r && cache.h === h) return cache.out;
  cache = { m, r, h, out: buildCase(m, r, h, now) };
  return cache.out;
}

/** 画面が使う CaseData（数字はすべて元データから計算） */
export const useCase = () => {
  const m = useApp((s) => s.cases[s.caseId]);
  const r = useApp((s) => s.raw[s.caseId]);
  const h = useApp((s) => s.hiddenVoices);
  const now = useApp((s) => s.seedNow);
  return useMemo(() => cached(m, r, h, now), [m, r, h, now]);
};

/* ---------------- 元データへの足し方の補助 ---------------- */

/** 設定で寄附を直したら、元データの寄附一覧のその券種の行を1行に書き換える（消したら行も消す） */
function syncDonations(raw: RawData, c: CaseData, donorId: string, patch: Partial<Donor> = {}): RawData {
  const d = c.donors.find((x) => x.id === donorId);
  const rows = raw.donations.filter((x) => x.couponTypeId === donorId);
  const rest = raw.donations.filter((x) => x.couponTypeId !== donorId);
  if (!d) return { ...raw, donations: rest };
  const row = {
    donationId: rows[0]?.donationId ?? `G${String(raw.donations.length + 1).padStart(4, "0")}-${donorId}`,
    donor: d.name,
    couponTypeId: d.id,
    projectId: d.projectId,
    // 直した項目だけ設定の値にし、ほかは寄附一覧の今の値を残す（CSV で読み込んだ値を消さない）
    amount: patch.amount ?? (rows.length ? rows.reduce((a, x) => a + x.amount, 0) : d.amount),
    donatedOn: patch.donatedOn ?? rows[0]?.donatedOn ?? d.donatedOn ?? "",
  };
  return { ...raw, donations: [...rest, row] };
}

function firstShopOf(raw: RawData, projectId: string) {
  const tickets = new Set(raw.tickets.filter((t) => t.projectId === projectId).map((t) => t.ticketId));
  return raw.redemptions.find((r) => tickets.has(r.ticketId))?.shopId ?? raw.shops[0]?.shopId;
}
function firstCouponOf(c: CaseData, projectId: string) {
  return c.donors.find((d) => d.projectId === projectId)?.id ?? `${projectId}-city`;
}
/** スマホの登録（添字 → 値）を元データの形（key → 値）に */
function regAnswers(c: CaseData, reg: Record<number, string>) {
  return Object.fromEntries(c.reg.map((r, i) => [r.key, reg[i] ?? ""]).filter(([, v]) => v !== ""));
}
/** 声の属性（「3歳・中央地区・30代・父」「40代・関東」）から登録の回答を作る（デモの声用） */
function answersFromAttrs(c: CaseData, attrs: string): Record<string, string> {
  const [a, b, x, y] = attrs.split("・");
  if (c.id !== "matsumoto") return { age: a ?? "", home: b ?? "" };
  const band = /中学/.test(a) ? 3 : /小学/.test(a) ? 2 : /[3-5]歳/.test(a) ? 1 : 0;
  return { kids: [0, 1, 2, 3].map((i) => (i === band ? "1" : "0")).join(","), area: (b ?? "").replace(/地区$/, ""), age: x ?? "", relation: y ?? "" };
}
export const useExtra = () => useApp((s) => s.extra[s.caseId]);
