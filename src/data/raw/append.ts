import type { AnswerValue, Member, MemberAnswers, RawData, Redemption, SurveyResponse, Ticket } from "./types";
import { nowJst } from "./calendar";

/**
 * スマホでの操作を元データに1行足す。
 * どれも元の raw は変えず、新しい RawData を返す（derive.ts は raw ごとに索引をキャッシュするため、中身を直接書き換えないこと）。
 */

let seq = 0;
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(++seq).toString(36)}`;

/** 会員がいなければ足す */
export function ensureMember(
  raw: RawData,
  m: { memberId?: string; householdId?: string; answers?: MemberAnswers; at?: string },
): { raw: RawData; member: Member } {
  const found = m.memberId ? raw.members.find((x) => x.memberId === m.memberId) : undefined;
  if (found) {
    if (!m.answers) return { raw, member: found };
    const member = { ...found, answers: { ...found.answers, ...m.answers } };
    return { raw: { ...raw, members: raw.members.map((x) => (x === found ? member : x)) }, member };
  }
  const memberId = m.memberId ?? uid("U");
  const member: Member = { memberId, householdId: m.householdId ?? memberId, registeredAt: m.at ?? nowJst(), answers: m.answers ?? {} };
  return { raw: { ...raw, members: [...raw.members, member] }, member };
}

/**
 * 受け取り。その事業・券種のまだ受け取られていないチケットを1枚受け取る（なければ1枚発行して受け取る）。
 * member に answers を渡すと、会員がいなければ登録もする。
 */
export function appendReceive(
  raw: RawData,
  a: { projectId: string; couponTypeId: string; memberId?: string; answers?: MemberAnswers; householdId?: string; at?: string; expiresAt?: string },
): { raw: RawData; ticket: Ticket; member: Member } {
  const at = a.at ?? nowJst();
  const m = ensureMember(raw, { memberId: a.memberId, householdId: a.householdId, answers: a.answers, at });
  raw = m.raw;
  const free = raw.tickets.find((t) => t.projectId === a.projectId && t.couponTypeId === a.couponTypeId && !t.receivedAt);
  if (free) {
    const ticket: Ticket = { ...free, memberId: m.member.memberId, receivedAt: at };
    return { raw: { ...raw, tickets: raw.tickets.map((t) => (t === free ? ticket : t)) }, ticket, member: m.member };
  }
  const same = raw.tickets.find((t) => t.projectId === a.projectId);
  const ticket: Ticket = {
    ticketId: uid("T"),
    couponTypeId: a.couponTypeId,
    projectId: a.projectId,
    memberId: m.member.memberId,
    issuedAt: at,
    receivedAt: at,
    expiresAt: a.expiresAt ?? same?.expiresAt ?? at,
  };
  return { raw: { ...raw, tickets: [...raw.tickets, ticket] }, ticket, member: m.member };
}

/**
 * 利用（消し込み）。ticketId を渡すか、memberId と projectId（と couponTypeId）で持っているチケットを探す。
 * 金額を省くと、同じ券種の直近の利用と同じ金額（なければ unitValue、それもなければ 0）。
 */
export function appendRedeem(
  raw: RawData,
  a: { shopId: string; ticketId?: string; memberId?: string; projectId?: string; couponTypeId?: string; amount?: number; unitValue?: number; count?: number; at?: string },
): { raw: RawData; redemption: Redemption } {
  const ticket =
    (a.ticketId && raw.tickets.find((t) => t.ticketId === a.ticketId)) ||
    raw.tickets.find(
      (t) =>
        t.memberId === a.memberId && t.receivedAt && (!a.projectId || t.projectId === a.projectId) && (!a.couponTypeId || t.couponTypeId === a.couponTypeId),
    );
  if (!ticket) throw new Error("appendRedeem: 使えるチケットがありません（先に appendReceive してください）");
  const memberId = a.memberId ?? ticket.memberId ?? "";
  const redemption: Redemption = {
    redemptionId: uid("R"),
    ticketId: ticket.ticketId,
    memberId,
    shopId: a.shopId,
    usedAt: a.at ?? nowJst(),
    amount: a.amount ?? a.unitValue ?? 0,
    count: a.count ?? 1,
  };
  return { raw: { ...raw, redemptions: [...raw.redemptions, redemption] }, redemption };
}

/** アンケートの回答。answers は設問ID → 値（5段階・金額は数値、1つ選ぶは文字列、複数は配列）。自由記述は comment に */
export function appendSurvey(
  raw: RawData,
  a: { redemptionId: string; answers: Record<string, AnswerValue>; comment?: string; publish?: boolean; theme?: string; at?: string },
): { raw: RawData; response: SurveyResponse } {
  const red = raw.redemptions.find((r) => r.redemptionId === a.redemptionId);
  if (!red) throw new Error("appendSurvey: 利用の明細が見つかりません");
  const projectId = raw.tickets.find((t) => t.ticketId === red.ticketId)?.projectId ?? "";
  const response: SurveyResponse = {
    responseId: uid("A"),
    redemptionId: red.redemptionId,
    memberId: red.memberId,
    projectId,
    answeredAt: a.at ?? nowJst(),
    answers: a.answers,
    comment: a.comment ?? "",
    publish: !!a.publish,
    theme: a.theme ?? "",
  };
  return { raw: { ...raw, surveyResponses: [...raw.surveyResponses, response] }, response };
}

/** 共感ボタン（+1 / -1） */
export function appendReaction(raw: RawData, responseId: string, delta: number): RawData {
  const cur = raw.reactions.find((r) => r.responseId === responseId);
  const reactions = cur
    ? raw.reactions.map((r) => (r === cur ? { ...r, likes: Math.max(0, r.likes + delta) } : r))
    : [...raw.reactions, { responseId, likes: Math.max(0, delta) }];
  return { ...raw, reactions };
}
