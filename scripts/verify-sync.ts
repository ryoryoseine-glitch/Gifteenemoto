// スマホの操作（受け取る→使う→答える）で、全画面の数字が同じ元データから動くかを確かめる
import { useApp } from "../src/store/useApp";
import { buildCase } from "../src/lib/build-case";
import { projectTotals, aggregateProjects, corpSupports } from "../src/lib/metrics";

const view = () => {
  const s = useApp.getState();
  const c = buildCase(s.cases[s.caseId], s.raw[s.caseId], s.hiddenVoices, s.seedNow);
  const p = c.projects.find((x) => x.id === "m1")!;
  const t = projectTotals(p);
  const all = aggregateProjects(c.projects);
  const sup = corpSupports(c, {}).filter((x) => x.project.id === "m1")[0];
  return {
    m1受け取った世帯: t.received,
    m1利用した世帯: t.usedHouseholds,
    m1利用回数: t.used,
    m1回答数: (c.agg.m1?.sat as number[]).reduce((a, b) => a + b, 0),
    全体の受け取った世帯: projectTotals(all).received,
    声の件数: c.voices.length,
    企業の按分: sup ? Math.round(sup.share * t.received) : null,
  };
};
const before = view();
const s = useApp.getState();
const d = s.cases.matsumoto.donors.find((x) => x.projectId === "m1")!;
s.receive(d.id);
useApp.getState().redeem(d.id);
useApp.getState().setAnswer("sat", 5);
useApp.getState().submitSurvey(d.id, "m1", "テストの声です。", true);
const after = view();
console.table(Object.fromEntries(Object.keys(before).map((k) => [k, { 前: (before as any)[k], 後: (after as any)[k] }])));
console.log("phoneStep", useApp.getState().phoneStep, "flash", useApp.getState().flashVoiceId);

// 届いた声の id と、画面の声の id がつながっているか
{
  const st = useApp.getState();
  const c = buildCase(st.cases[st.caseId], st.raw[st.caseId], st.hiddenVoices, st.seedNow);
  console.log("届いた声が画面にある:", c.voices.some((v) => v.id === st.flashVoiceId));
}
// 設定で寄附額を変える → 按分が変わる
{
  const st = useApp.getState();
  const d0 = st.cases.matsumoto.donors[0];
  const share = () => {
    const x = useApp.getState();
    const c = buildCase(x.cases[x.caseId], x.raw[x.caseId], x.hiddenVoices, x.seedNow);
    return corpSupports(c, {}).map((s) => `${s.project.id}:${(s.share * 100).toFixed(1)}%`).join(" ");
  };
  const b = share();
  st.updateDonor(d0.id, { amount: d0.amount * 2 });
  console.log("寄附額2倍 前", b, "\n          後", share());
}
// 別の人の声が届く
{
  const n = () => { const x = useApp.getState(); return buildCase(x.cases[x.caseId], x.raw[x.caseId], x.hiddenVoices, x.seedNow).voices.length; };
  const b = n();
  useApp.getState().addVoice({ id: "live-1", projectId: "m1", giftId: "", text: "新しい声のテスト", attrs: "3歳・中央地区・30代・父", theme: "休めた", likes: 0, minutesAgo: 0 } as any);
  console.log("声が届く 前", b, "後", n());
}
