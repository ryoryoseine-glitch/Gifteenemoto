import type { CaseId, Voice } from "./types";

/** 社内共有ページで「いま届いた」ように順に足していく声（モック） */
export const LIVE_VOICES: Record<CaseId, Omit<Voice, "postedAt">[]> = {
  matsumoto: [
    { id: "lv-m1", projectId: "m1", giftId: "d2", text: "ファミサポの方が、娘の好きな絵本を一緒に読んでくれました。", theme: "頼れる人ができた", attrs: "3歳・中央地区・30代・父", likes: 0 },
    { id: "lv-m2", projectId: "m4", giftId: "d7", text: "産後ケアで、はじめてゆっくりお風呂に入れました。", theme: "休めた", attrs: "0歳・寿地区・20代・母", likes: 0 },
    { id: "lv-m3", projectId: "m1", giftId: "d1", text: "一時預かりの間に、上の子の授業参観に行けました。", theme: "通院・用事ができた", attrs: "1歳・芳川地区・30代・母", likes: 0 },
    { id: "lv-m4", projectId: "m3", giftId: "d5", text: "スイミング体験のあと、息子が習いたいと言い出しました。", theme: "新しい体験ができた", attrs: "小学1年・島立地区・40代・母", likes: 0 },
  ],
  sapporo: [
    { id: "lv-s1", projectId: "s2", giftId: "d3", text: "定山渓の温泉で、家族みんなでゆっくりできました。", theme: "ゆっくり過ごせた", attrs: "40代・関東", likes: 0 },
    { id: "lv-s2", projectId: "s1", giftId: "d1", text: "小樽の海鮮丼、ギフトのおかげで一品多く頼めました。", theme: "地元で買い物した", attrs: "30代・近畿", likes: 0 },
    { id: "lv-s3", projectId: "s1", giftId: "d1", text: "石狩の海を見に足をのばしました。また来ます。", theme: "足をのばした", attrs: "20代以下・東北", likes: 0 },
  ],
};
