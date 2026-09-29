"use client";

import { useEffect, useMemo, useState } from "react";
import { Heart, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { ago, fmt, pct, pctText, publicAttrs, yen } from "@/lib/format";
import type { CaseData } from "@/data/types";
import { MIN_CELL, corpSupports, giftProject, projectTotals, sum } from "@/lib/metrics";
import { useApp, useCase, useExtra } from "@/store/useApp";
import { GiftPhoto, PhotoCredits } from "@/components/gift/gift-photo";
import { VoiceBubble } from "@/components/insight/voice-bubble";
import { LIVE_VOICES } from "@/data/live-voices";

/** 社内共有ページ（ログインなし）。ギフトの写真がめくれていき、その下に感謝の声 */
export function SharePage() {
  const c = useCase();
  const extra = useExtra();

  // 支援している事業（寄附の割合で按分する考え方。数字は事業全体）
  const supports = useMemo(() => corpSupports(c, extra).filter((g) => g.base.status === "active"), [c, extra]);
  const pids = supports.map((g) => g.base.id);
  const voices = c.voices.filter((v) => pids.includes(v.projectId) && !v.hidden).sort((a, b) => (b.postedAt ?? 0) - (a.postedAt ?? 0));
  const reached = sum(supports.map((g) => projectTotals(g.project).received));
  const donated = sum(supports.map((g) => g.amount));
  const coupons = supports.flatMap((g) => g.coupons.map((d) => ({ d, base: g.base, t: projectTotals(giftProject(g.base, d, extra)) })));

  // スライド：最初に市の子どもたち（事例による）、そのあとクーポンごと
  type SlideData = { id: string; photo: string; eyebrow: string; title: string; line: string };
  const slides: SlideData[] = [
    c.id === "matsumoto"
      ? { id: "intro", photo: "nursery-event", eyebrow: c.muniShort, title: `${c.muniShort}の子どもたちへ`, line: `${supports.length}つの事業を支えています` }
      : { id: "intro", photo: "hokkaido", eyebrow: c.muniShort, title: "北海道を旅する人へ", line: `${supports.length}つの事業を支えています` },
    ...coupons.map(({ d, base, t }) => ({
      id: d.id,
      photo: d.photo,
      eyebrow: `${c.muniShort}　${base.name}`,
      title: d.giftName,
      line: `${fmt(t.received)}${c.unit}に届いています`,
    })),
  ];
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    if (!playing || slides.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), 4500);
    return () => clearInterval(t);
  }, [playing, slides.length]);
  const cur = slides[i % Math.max(slides.length, 1)];
  const prev = slides[(i - 1 + slides.length) % Math.max(slides.length, 1)];

  // 一定の間隔で新しい声が届く（モック）。届いた声は企業の画面にも入る
  const addVoice = useApp((s) => s.addVoice);
  const [freshIds, setFreshIds] = useState<string[]>([]);
  const arrived = freshIds.length;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 20_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const mine = new Set(c.donors.filter((d) => d.name === c.corp.name).map((d) => d.projectId));
    const pool = LIVE_VOICES[c.id].filter((lv) => mine.has(lv.projectId) && !c.voices.some((v) => v.id === lv.id));
    if (!pool.length) return;
    const t = setTimeout(() => {
      addVoice({ ...pool[0], postedAt: Date.now() });
      setFreshIds((f) => [pool[0].id, ...f]);
    }, 9000);
    return () => clearTimeout(t);
  }, [c.id, c.voices, c.donors, c.corp.name, addVoice]);

  return (
    <div className="mx-auto max-w-[980px]">

      {/* 上部：めくれていくギフトの写真の上に、応援の成果といちばん新しい声 */}
      {cur && (
        <section className="relative -mx-4 overflow-hidden bg-black text-white sm:mx-0 sm:rounded-2xl" aria-roledescription="スライド" aria-label="届けているギフト">
          <div className="absolute inset-0 z-0">
            {prev && prev !== cur && <Slide key={`under-${prev.id}`} s={prev} still />}
            <Slide key={`${cur.id}-${i}`} s={cur} />
          </div>
          <div className="absolute inset-0 z-[1] bg-gradient-to-r from-black/75 via-black/45 to-black/10" />
          <div className="relative z-[2] grid gap-8 px-6 pt-10 pb-16 sm:px-10 sm:pt-14 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-end">
            <div>
              <p className="text-sm text-white/85">{c.corp.name}　社内共有ページ</p>
              <h1 className="mt-3 text-[25px] leading-[1.4] font-bold tracking-tight sm:text-[32px]">
                <span className="inline-block">わたしたちも支える事業が、</span>
                <span className="inline-block">
                  {c.muniShort}の<span className="mx-1 text-[1.25em] tnum">{fmt(reached)}</span>
                  {c.unit}に
                </span>
                <span className="inline-block">届いています</span>
              </h1>
              <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
                <div>
                  <dt className="text-white/70">寄附した金額</dt>
                  <dd className="text-xl font-bold tnum">{yen(donated)}</dd>
                </div>
                <div>
                  <dt className="text-white/70">届いた声</dt>
                  <dd className="text-xl font-bold tnum">{fmt(voices.length)}</dd>
                </div>
                <div>
                  <dt className="text-white/70">社員からの共感</dt>
                  <dd className="text-xl font-bold tnum">{fmt(sum(voices.map((v) => v.likes)))}</dd>
                </div>
              </dl>
            </div>
            {voices[0] && (
              <figure key={voices[0].id} className="rise rounded-xl bg-white/92 p-5 text-[#232323] shadow-lg backdrop-blur dark:bg-[#1c1d1f]/92 dark:text-[#ececec]">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1.5 font-medium text-orange">
                    <Heart className="size-3.5 fill-current" />
                    いちばん新しい声
                  </span>
                  <span className="text-muted-foreground tnum">{ago(voices[0].postedAt ?? now, now)}</span>
                </div>
                <blockquote className="text-[15px] leading-relaxed">{voices[0].text}</blockquote>
                <figcaption className="mt-3 text-xs text-muted-foreground">{publicAttrs(c.id, voices[0].attrs)}</figcaption>
              </figure>
            )}
          </div>
          <p className="absolute bottom-4 left-6 z-20 text-xs text-white/80 sm:left-10">
            {cur.eyebrow}　<span className="font-bold text-white">{cur.title}</span>
          </p>
          <div className="absolute right-4 bottom-3.5 z-20 flex items-center gap-2">
            {slides.map((sl, k) => (
              <button
                key={sl.id}
                type="button"
                aria-label={`${sl.title}を表示`}
                aria-current={k === i % slides.length}
                onClick={() => setI(k)}
                className={cn("h-1.5 rounded-full bg-white/50 transition-all", k === i % slides.length ? "w-6 bg-white" : "w-1.5")}
              />
            ))}
            <button type="button" onClick={() => setPlaying(!playing)} aria-label={playing ? "止める" : "動かす"} className="ml-1 grid size-7 place-items-center rounded-full bg-black/40 text-white">
              {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            </button>
          </div>
        </section>
      )}

      <SurveyFindings c={c} projectIds={pids} />

      {/* 感謝の声（リアルタイムに届く） */}
      <h2 className="mt-12 text-center text-lg font-bold">受け取った方から届いた「ありがとう」</h2>
      <div className="mt-2 mb-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <span className="size-1.5 animate-pulse rounded-full bg-live" />
        いまも届いています
        {arrived > 0 && <span className="rise rounded-full bg-orange-soft px-2 py-0.5 font-medium text-orange">新しい声が{arrived}件届きました</span>}
      </div>
      <ul className="columns-1 gap-6 sm:columns-2 lg:columns-3">
        {voices.map((v) => (
          <VoiceBubble key={v.id} v={v} gift={c.donors.find((x) => x.id === v.giftId)} caseId={c.id} now={now} fresh={freshIds.includes(v.id)} />
        ))}
      </ul>
      {voices.length === 0 && <p className="mt-8 text-center text-sm text-muted-foreground">声が届くと、ここに並びます。</p>}

      <div className="mt-10">
        <PhotoCredits ids={slides.map((sl) => sl.photo)} />
      </div>
    </div>
  );
}

function Slide({ s, still }: { s: { photo: string; title: string }; still?: boolean }) {
  return (
    <div className={cn("absolute inset-0", still ? "z-0" : "page-turn z-10")}>
      <div className="absolute inset-0 overflow-hidden">
        <GiftPhoto id={s.photo} className={cn("absolute inset-0 size-full", !still && "slow-zoom")} alt={s.title} />
      </div>
    </div>
  );
}

/** アンケートでわかったこと（企業に出してよい設問だけ。数字は事業全体） */
function SurveyFindings({ c, projectIds }: { c: CaseData; projectIds: string[] }) {
  const addWord = c.kind === "観光" ? "このギフトがなければ来なかった" : "このクーポンがなければ利用しなかった";
  const cards = projectIds
    .map((id) => {
      const p = c.projects.find((x) => x.id === id)!;
      const a = c.agg[id];
      if (!a) return null;
      const sat = (a.sat as number[] | undefined) ?? [];
      const add = (a.add as number[] | undefined) ?? [];
      const n = sum(sat);
      if (n < MIN_CELL) return null;
      return { p, n, top2: pct((sat[3] ?? 0) + (sat[4] ?? 0), n), notWithout: pct(add[add.length - 1] ?? 0, sum(add)) };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);
  if (!cards.length) return null;
  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold">使った人のアンケートから</h2>
      <p className="mt-1 text-xs text-muted-foreground">使った直後の1分アンケートの集計。事業全体の数字で、回答が10件未満の事業は出さない</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {cards.map(({ p, n, top2, notWithout }) => (
          <li key={p.id} className="rounded-xl border bg-card p-5">
            <p className="text-[13px] font-bold">{p.name}</p>
            <dl className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-muted-foreground">満足・やや満足</dt>
                <dd className="mt-0.5 text-2xl font-bold tnum">{pctText(top2)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{addWord}</dt>
                <dd className="mt-0.5 text-2xl font-bold tnum">{pctText(notWithout)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">回答 {fmt(n)}件</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
