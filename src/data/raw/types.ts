/**
 * e街の出力に似せた「元データ（1行ごとの明細）」の型。
 * 画面の数字はすべて src/lib/derive.ts でここから計算する。
 *
 * 日時は「+09:00 付きの ISO 文字列」（例 "2026-04-12T10:23:00+09:00"）で持つ。
 * 月の判定は文字列の先頭7文字（"2026-04"）で行うので、実行環境のタイムゾーンに左右されない。
 */

/** 登録項目の値（登録項目の key → 値）。年齢別の人数は "1,0,2,0" のように区分順の人数 */
export type MemberAnswers = Record<string, string>;

/** 会員情報（e街の会員。仮名ID） */
export type Member = {
  memberId: string;
  /** 世帯。松本は家族共有で1世帯に複数アカウントがありうる。さっぽろは memberId と同じ */
  householdId: string;
  registeredAt: string;
  answers: MemberAnswers;
};

/** チケット（発行・受取）。1行＝1枚のチケット（回数券なら1冊） */
export type Ticket = {
  ticketId: string;
  /** 券種。寄附企業のギフト（Donor.id）。寄附のない市の券種は "<事業ID>-city" */
  couponTypeId: string;
  projectId: string;
  /** 受け取った会員。未受取は null */
  memberId: string | null;
  issuedAt: string;
  /** 未受取は null */
  receivedAt: string | null;
  expiresAt: string;
};

/** 利用の明細（消し込み1回＝1行） */
export type Redemption = {
  redemptionId: string;
  ticketId: string;
  /** 使った会員。家族共有では、チケットの持ち主と違う会員になることがある */
  memberId: string;
  shopId: string;
  usedAt: string;
  /** 決済金額（円） */
  amount: number;
  /** 利用枚数（回数券は 1） */
  count: number;
};

/** 加盟店・事業者 */
export type Shop = {
  shopId: string;
  name: string;
  /** 体験の種類・業種（松本の子育て支援クーポンは券種名） */
  category: string;
  /** 所在。松本は35地区の名前、さっぽろは市町村名 */
  area: string;
};

/** アンケートの回答の値。5段階・金額は数値、1つ選ぶは文字列、複数は文字列の配列 */
export type AnswerValue = number | string | string[];

/** 利用後アンケートの回答（利用1回につき0か1件） */
export type SurveyResponse = {
  responseId: string;
  redemptionId: string;
  memberId: string;
  projectId: string;
  answeredAt: string;
  /** 設問ID → 値。自由記述（text）はここに入れず comment に入れる */
  answers: Record<string, AnswerValue>;
  comment: string;
  /** 「公開してよい」にチェック */
  publish: boolean;
  /** 声のテーマ（自治体・運用側で付ける。空なら「届いたばかりの声」） */
  theme: string;
};

/** 寄附（自治体が登録） */
export type Donation = {
  donationId: string;
  donor: string;
  /** どの券種（Donor.id）の寄附か */
  couponTypeId: string;
  projectId: string;
  amount: number;
  /** 受領証の日付。例 "2026年5月15日"（今の Donor.donatedOn と同じ書き方） */
  donatedOn: string;
};

/** 前年度の月別の実績（紙の年度を含む。自治体が登録） */
export type Baseline = {
  projectId: string;
  fiscalYear: number;
  /** "4月" など、Project.months と同じ書き方 */
  month: string;
  received: number;
  used: number;
};

/** 声への共感（このサービス側のデータ。e街の出力ではない） */
export type Reaction = { responseId: string; likes: number };

/** 事例ごとの元データ一式 */
export type RawData = {
  caseId: string;
  members: Member[];
  tickets: Ticket[];
  redemptions: Redemption[];
  shops: Shop[];
  surveyResponses: SurveyResponse[];
  donations: Donation[];
  baselines: Baseline[];
  reactions: Reaction[];
};

export type RawTableName = Exclude<keyof RawData, "caseId">;

export const RAW_TABLES: RawTableName[] = ["members", "tickets", "redemptions", "shops", "surveyResponses", "donations", "baselines", "reactions"];
