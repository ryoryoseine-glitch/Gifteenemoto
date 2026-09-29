export type CaseId = "matsumoto" | "sapporo";

/** 内訳の種類。place＝使われた場所（地区・市町村）、kind＝体験の種類（券種・業種）、shop＝事業者・加盟店（自治体だけ） */
export type BreakdownKind = "place" | "kind" | "shop";

export type Breakdown = {
  key: string;
  label: string;
  kind: BreakdownKind;
  rows: [string, number][];
};

export type ProjectStatus = "active" | "closed" | "upcoming";

export type GiftTone = "blue" | "orange" | "green" | "rose";

/** 地域再生計画の KPI。actual は報告書で実績を取るところ */
export type Kpi = {
  name: string;
  unit: string;
  base: number;
  mid: number;
  target: number;
  actual: "used" | "received" | "firstTime" | "tour" | "isolation" | "satisfaction";
};

/** 事業費の内訳（期末に確定） */
export type Funding = { items: [string, number][]; otherSource: string };

export type Project = {
  /** 地域再生計画の名称（企業版ふるさと納税の対象事業） */
  plan?: string;
  kpis?: Kpi[];
  funding?: Funding;
  id: string;
  name: string;
  /** ギフトカードに出すアイコン（lucide の名前）と色味 */
  icon: string;
  tone: GiftTone;
  goal: string;
  target: string;
  period: string;
  status: ProjectStatus;
  budget: number;
  /** 1回の利用で使われる金額の目安（円）。使われた金額＝利用×これ（モック） */
  unitValue: number;
  issued: number;
  /** 月ごとの新規の数。受取・利用とも「その月に新しく増えた数」 */
  months: string[];
  received: number[];
  used: number[];
  /** 月ごとに新しく利用した世帯（元データの世帯IDから計算）。ないときは used から見積もる */
  usedHouseholds?: number[];
  receivedPrev: number[] | null;
  usedPrev: number[] | null;
  breakdowns: Breakdown[];
  /** 2回以上の利用（子育て）／同じ加盟店のリピート（観光） */
  repeat: number;
  /** 2市町村以上で使った人の割合（観光のみ） */
  tour: number | null;
  firstTime: number | null;
};

export type Donor = {
  id: string;
  name: string;
  amount: number;
  projectId: string;
  /** 企業の寄附で届けるギフト（カードの名前） */
  giftName: string;
  /** ギフトカードの写真（public/gifts/ のファイル名） */
  photo: string;
  /** 寄附日（受領証の日付） */
  donatedOn?: string;
  /** 事業全体の利用のうち、このギフトの分の割合（モック用） */
  weight: number;
};

/** 利用登録の項目。bands があるときは「年齢の区分ごとの人数」を聞く（値は "1,0,2,0" のように区分順の人数） */
export type RegField = { key: string; label: string; opts: string[]; bands?: string[] };

export type Gift = {
  icon: string;
  name: string;
  sub: string;
  left: string;
  sponsored?: boolean;
};

/** yen＝金額（円）。集計は [合計, 回答数] で持つ */
export type QuestionType = "scale" | "choice" | "multi" | "text" | "yen";

export type Question = {
  id: string;
  text: string;
  type: QuestionType;
  opts?: string[];
  locked?: boolean;
  /** 企業の報告書にこの設問の集計を入れるか */
  share: boolean;
};

export type Voice = {
  id: string;
  projectId: string;
  /** どのギフト（Donor.id）への声か */
  giftId: string;
  text: string;
  theme: string;
  attrs: string;
  /** 投稿からの経過分（シード用）。postedAt があればそちらを使う */
  minutesAgo?: number;
  postedAt?: number;
  likes: number;
  hidden?: boolean;
};

export type Corp = {
  name: string;
  employees: number;
  viewed: number;
  viewedPrevMonth: number;
};

export type SurveyAgg = Record<string, number[] | Record<string, number>>;

export type CaseData = {
  id: CaseId;
  muni: string;
  muniShort: string;
  kind: "子育て" | "観光";
  unit: string;
  placeWord: string;
  kindWord: string;
  projects: Project[];
  donors: Donor[];
  reg: RegField[];
  gifts: Gift[];
  useTarget: string;
  questions: Question[];
  /** アンケートの集計。事業（projectId）ごと → 設問ごと。アンケートをしていない事業は持たない */
  agg: Record<string, SurveyAgg>;
  voices: Voice[];
  corp: Corp;
};
