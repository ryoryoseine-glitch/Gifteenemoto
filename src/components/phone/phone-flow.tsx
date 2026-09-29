"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { CalendarClock, ChevronLeft, ChevronRight, Gift, MapPin, Search, Store, Ticket, User, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CaseData, Donor, Question } from "@/data/types";
import { useApp, useCase, type PhoneStep } from "@/store/useApp";
import { GiftPhoto } from "@/components/gift/gift-photo";

/** 事例ごとのサイト名とクーポンの額面（モック） */
const SITE: Record<string, { name: string; value: string; expiry: string; howto: string }> = {
  matsumoto: { name: "松本市 子育て支援クーポン", value: "半日 × 1回", expiry: "2027年3月31日", howto: "施設の受付でQRコードを見せる" },
  sapporo: { name: "さっぽろ圏 e旅ギフト", value: "9,000円分", expiry: "2027年3月31日", howto: "加盟店のレジでQRコードを見せる" },
};

const STEPS: { key: PhoneStep; label: string }[] = [
  { key: "portal", label: "市の既存のサイト（入口）" },
  { key: "login", label: "ログイン" },
  { key: "register", label: "利用登録（初回だけ）" },
  { key: "get", label: "クーポンをもらう" },
  { key: "wallet", label: "手持ちのクーポン" },
  { key: "use", label: "使う" },
  { key: "survey", label: "アンケート" },
  { key: "done", label: "お礼" },
];

/** 支援している企業名（株式会社を除いて並べる） */
const supporters = (c: CaseData, projectId: string) =>
  [...new Set(c.donors.filter((d) => d.projectId === projectId).map((d) => d.name.replace("株式会社", "")))].join("、");

export function PhoneFlow() {
  const c = useCase();
  const step = useApp((s) => s.phoneStep);
  const setStep = useApp((s) => s.setPhoneStep);
  const restart = useApp((s) => s.restartPhone);
  // 受け取る人に届くクーポン：最初の実施中の事業の、最初の支援企業の枠
  const project = c.projects.find((p) => p.status === "active")!;
  const gift = c.donors.find((d) => d.projectId === project.id)!;
  const cur = STEPS.findIndex((x) => x.key === (step === "open" ? "get" : step === "mypage" ? "wallet" : step));

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_400px]">
      <aside className="order-2 lg:order-1 lg:pt-6">
        <h1 className="text-xl font-bold tracking-tight">受け取る人の画面（スマホ）</h1>
        <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-muted-foreground">
          市のサイト・会員登録・クーポンの受け取りと消し込みは、既存のe街の仕組みのまま。アンケートも giftee の既存の Survey を流用し、e街の消し込みの直後に出すようにつなぐ。
        </p>
        <div className="mt-4 max-w-lg rounded-lg border bg-card p-4 text-[13px]">
          <p className="font-bold">アンケートで集めるもの</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>満足度と「このクーポンがなければ利用しなかったか」（報告書の数字）</li>
            <li>市や支援企業へのひとこと（公開に同意したものだけ、企業の社内共有ページに届く）</li>
          </ol>
          <p className="mt-2 text-xs text-muted-foreground">回答は利用の記録（チケット）と会員の登録項目にひもづけて集計。企業には10件未満の区分を出さない集計値と、ぼかした属性だけを渡す。</p>
          <p className="mt-1 text-xs text-muted-foreground">画面はイメージ。松本市の場合、本番は市の LINE で申請・審査を受けたあとに届くシリアルコードでクーポンを受け取る。</p>
        </div>
        <ol className="mt-6 max-w-sm space-y-1">
          {STEPS.map((s, i) => (
            <li key={s.key}>
              {(i === 0 || i === 6) && (
                <p className={cn("px-3 pt-2 pb-1 text-[11px] font-bold", i === 0 ? "text-muted-foreground" : "text-orange")}>
                  {i === 0 ? "既存の仕組み（市のサイト・e街）" : "giftee Survey を消し込みの後につなぐ"}
                </p>
              )}
              <button
                type="button"
                onClick={() => setStep(s.key)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-[13px] transition-colors hover:bg-muted",
                  i === cur && "bg-brand-soft font-bold text-brand hover:bg-brand-soft",
                  i < cur && "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-full border text-xs tnum",
                    i === cur && "border-primary bg-primary text-primary-foreground",
                    i < cur && "border-transparent bg-muted",
                  )}
                >
                  {i + 1}
                </span>
                {s.label}
              </button>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-wrap gap-2 text-[13px]">
          <button type="button" onClick={restart} className="text-link hover:underline">
            最初から試す
          </button>
          <span className="text-muted-foreground">／</span>
          <Link href="/share" className="text-link hover:underline">
            社内共有ページをひらく
          </Link>
          <span className="text-muted-foreground">／</span>
          <Link href="/muni/report" className="text-link hover:underline">
            自治体の報告書をひらく
          </Link>
        </div>
      </aside>

      <div className="order-1 -mx-4 sm:mx-auto lg:order-2">
        <div className="relative mx-auto flex h-[calc(100dvh-110px)] w-full flex-col overflow-hidden bg-white text-[#232323] sm:h-[min(780px,calc(100dvh-130px))] sm:min-h-[620px] sm:w-[375px] sm:rounded-[36px] sm:border-[10px] sm:border-[#1d1d1f] sm:shadow-2xl">
          <Screen c={c} gift={gift} projectName={project.name} />
        </div>
      </div>
    </div>
  );
}

/* ---------------- サイトの枠 ---------------- */

function Screen({ c, gift, projectName }: { c: CaseData; gift: Donor; projectName: string }) {
  const step = useApp((s) => s.phoneStep);
  if (step === "portal") return <Portal c={c} />;
  if (step === "login") return <Login c={c} />;
  if (step === "register") return <Register c={c} />;
  if (step === "open") return <Opened c={c} gift={gift} projectName={projectName} />;
  if (step === "use" || step === "survey") return <UseAndSurvey c={c} gift={gift} projectName={projectName} />;
  if (step === "done") return <Done c={c} />;
  return (
    <Site c={c}>
      {step === "get" && <GetCoupons c={c} gift={gift} projectName={projectName} />}
      {step === "wallet" && <WalletList c={c} gift={gift} projectName={projectName} />}
      {step === "mypage" && <MyPage c={c} />}
    </Site>
  );
}

function SiteHeader({ c, back }: { c: CaseData; back?: PhoneStep }) {
  const setStep = useApp((s) => s.setPhoneStep);
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-[#ededed] bg-white px-3">
      {back ? (
        <button type="button" aria-label="戻る" onClick={() => setStep(back)} className="grid size-8 place-items-center">
          <ChevronLeft className="size-5" />
        </button>
      ) : (
        <span className="grid size-7 place-items-center rounded-md bg-[#2c5b84] text-[11px] font-bold text-white">{c.muniShort.slice(0, 1)}</span>
      )}
      <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{SITE[c.id].name}</span>
      <span className="text-[10px] text-[#888]">
        powered by giftee<span className="text-[#dc7f68]">*</span>
      </span>
    </div>
  );
}

function Site({ c, children }: { c: CaseData; children: ReactNode }) {
  const step = useApp((s) => s.phoneStep);
  const setStep = useApp((s) => s.setPhoneStep);
  const received = useApp((s) => s.phoneReceived);
  const tabs: { key: PhoneStep; label: string; icon: typeof Wallet; dot?: boolean }[] = [
    { key: "wallet", label: "手持ちのクーポン", icon: Wallet },
    { key: "get", label: "クーポンをもらう", icon: Ticket, dot: !received },
    { key: "mypage", label: "マイページ", icon: User },
  ];
  return (
    <>
      <SiteHeader c={c} />
      <div className="flex-1 overflow-y-auto bg-[#f6f6f6]">{children}</div>
      <nav className="grid shrink-0 grid-cols-3 border-t border-[#ededed] bg-white pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setStep(t.key)}
            className={cn("relative flex flex-col items-center gap-0.5 pt-2 pb-1 text-[10px]", step === t.key ? "font-bold text-[#dc7f68]" : "text-[#888]")}
          >
            <t.icon className="size-5" strokeWidth={step === t.key ? 2.2 : 1.8} />
            {t.label}
            {t.dot && <span className="absolute top-1.5 left-[calc(50%+8px)] size-2 rounded-full bg-[#dc7f68]" />}
          </button>
        ))}
      </nav>
    </>
  );
}

function Cta({ children, onClick, disabled, variant = "fill" }: { children: ReactNode; onClick?: () => void; disabled?: boolean; variant?: "fill" | "line" }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "block h-12 w-full rounded-full text-[15px] font-bold transition-opacity disabled:opacity-40",
        variant === "fill" ? "bg-[#dc7f68] text-white" : "border-2 border-[#dc7f68] bg-white text-[#dc7f68]",
      )}
    >
      {children}
    </button>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn("rounded-lg border px-3.5 py-2 text-[13px] transition-colors", on ? "border-[#232323] bg-white font-bold" : "border-[#e5e5e5] bg-white text-[#555]")}
    >
      {children}
    </button>
  );
}

/* ---------------- 市のサイト（入口） ---------------- */

/** 入口は市の既存のサイト（このサービスでは作らない）。ここでは作りのイメージだけを出す */
const PORTAL: Record<
  string,
  {
    name: string;
    purposes: string[];
    ages: string[];
    news: { date: string; text: string }[];
    banners: { label: string; coupon?: boolean }[];
    links: string[];
  }
> = {
  matsumoto: {
    name: "松本市 子育て応援サイト",
    purposes: ["お祝い・届出", "健康", "おかね", "あずける", "学ぶ・でかける", "相談する", "応援する"],
    ages: ["妊娠・出産", "乳幼児", "小・中学生", "ひとり親家庭"],
    news: [
      { date: "9月28日", text: "子育て支援クーポンに新しい券が加わりました" },
      { date: "9月25日", text: "保育施設の入園申込について" },
      { date: "9月20日", text: "秋の子育てひろばのご案内" },
    ],
    banners: [{ label: "子育て支援クーポン", coupon: true }, { label: "産後ケア" }, { label: "こどもプラザ" }, { label: "インクルーシブセンター" }],
    links: ["子育てコミュニティサイト", "市立病院", "図書館"],
  },
  sapporo: {
    name: "さっぽろ圏 観光案内サイト",
    purposes: ["見る", "食べる", "泊まる", "体験する", "買う", "交通", "イベント"],
    ages: ["札幌市", "小樽市", "江別市", "千歳市"],
    news: [
      { date: "9月28日", text: "e旅ギフトに平日の温泉・体験券が加わりました" },
      { date: "9月22日", text: "紅葉の見ごろ情報" },
      { date: "9月15日", text: "冬のイベントのご案内" },
    ],
    banners: [{ label: "さっぽろ圏 e旅ギフト", coupon: true }, { label: "旅先納税" }, { label: "観光案内所" }, { label: "交通案内" }],
    links: ["各市町村の観光サイト", "道の駅", "観光協会"],
  },
};

function Portal({ c }: { c: CaseData }) {
  const setStep = useApp((s) => s.setPhoneStep);
  const p = PORTAL[c.id];
  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 bg-[#3f6b4f] px-3 py-1 text-center text-[10px] text-white">市の既存のサイト（イメージ）・このサービスでは作りません</div>
      <div className="shrink-0 border-b border-[#e5e5e5] bg-white px-3 pt-2 pb-2">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded bg-[#3f6b4f] text-[12px] font-bold text-white">{c.muniShort.slice(0, 1)}</span>
          <span className="min-w-0 flex-1 truncate text-[14px] font-bold">{p.name}</span>
          <span className="rounded border border-[#ccc] px-1.5 text-[10px] text-[#555]">文字</span>
          <span className="rounded border border-[#ccc] px-1.5 text-[10px] text-[#555]">Language</span>
        </div>
        <div className="mt-2 flex h-8 items-center gap-2 rounded border border-[#ccc] px-2 text-[12px] text-[#999]">
          <Search className="size-3.5" />
          サイト内検索
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-white text-[#333]">
        <p className="px-3 pt-2 text-[10px] text-[#888]">ホーム ＞ {p.name}</p>

        <h2 className="mx-3 mt-3 border-l-4 border-[#3f6b4f] pl-2 text-[14px] font-bold">目的からさがす</h2>
        <div className="mx-3 mt-2 grid grid-cols-3 gap-1.5">
          {p.purposes.map((x) => (
            <span key={x} className="rounded border border-[#d8e4dc] bg-[#f3f8f4] px-1 py-2 text-center text-[11px] text-[#3f6b4f]">
              {x}
            </span>
          ))}
        </div>

        <h2 className="mx-3 mt-4 border-l-4 border-[#3f6b4f] pl-2 text-[14px] font-bold">{c.id === "matsumoto" ? "年齢からさがす" : "市町村からさがす"}</h2>
        <div className="mx-3 mt-2 grid grid-cols-2 gap-1.5">
          {p.ages.map((x) => (
            <span key={x} className="rounded border border-[#d8e4dc] px-2 py-2 text-[11px]">
              {x}
            </span>
          ))}
        </div>

        <h2 className="mx-3 mt-4 border-l-4 border-[#3f6b4f] pl-2 text-[14px] font-bold">新着情報</h2>
        <ul className="mx-3 mt-1 divide-y divide-[#eee]">
          {p.news.map((n) => (
            <li key={n.text} className="py-2 text-[12px]">
              <span className="mr-2 text-[10px] text-[#888]">{n.date}</span>
              <span className="text-[#1a5fb4] underline">{n.text}</span>
            </li>
          ))}
        </ul>

        <h2 className="mx-3 mt-4 border-l-4 border-[#3f6b4f] pl-2 text-[14px] font-bold">おすすめ</h2>
        <div className="mx-3 mt-2 grid grid-cols-2 gap-1.5">
          {p.banners.map((b) =>
            b.coupon ? (
              <button
                key={b.label}
                type="button"
                onClick={() => setStep("login")}
                className="relative col-span-2 flex items-center gap-2 rounded-lg border-2 border-[#dc7f68] bg-[#fdf1ec] p-2.5 text-left"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[#dc7f68] text-white">
                  <Ticket className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-bold">{b.label}</span>
                  <span className="block text-[10px] text-[#666]">ここから先がこのサービス（受け取り・消し込み・アンケート）</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-[#dc7f68]" />
              </button>
            ) : (
              <span key={b.label} className="rounded border border-[#ddd] bg-[#fafafa] px-2 py-3 text-center text-[11px] text-[#555]">
                {b.label}
              </span>
            ),
          )}
        </div>

        <h2 className="mx-3 mt-4 border-l-4 border-[#3f6b4f] pl-2 text-[14px] font-bold">関連リンク</h2>
        <div className="mx-3 mt-2 mb-4 flex flex-wrap gap-1.5">
          {p.links.map((l) => (
            <span key={l} className="text-[11px] text-[#1a5fb4] underline">
              {l}
            </span>
          ))}
        </div>

        <footer className="bg-[#3f6b4f] px-3 py-3 text-center text-[10px] text-white/85">{c.muni}（市の既存のサイトのイメージ）</footer>
      </div>
    </div>
  );
}

/* ---------------- ログイン・利用登録 ---------------- */

function Login({ c }: { c: CaseData }) {
  const setStep = useApp((s) => s.setPhoneStep);
  const reg = useApp((s) => s.reg);
  const registered = c.reg.every((r, i) => filled(r, reg[i]));
  return (
    <>
      <SiteHeader c={c} back="portal" />
      <div className="flex flex-1 flex-col justify-center px-6">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#2c5b84] text-[22px] font-bold text-white">{c.muniShort.slice(0, 1)}</div>
        <p className="mt-4 text-center text-[18px] font-bold">{SITE[c.id].name}</p>
        <p className="mt-1 text-center text-[12px] text-[#888]">{c.muni}の電子クーポン</p>
        <div className="mt-8 space-y-3">
          <div className="h-11 rounded-lg border border-[#e5e5e5] px-3 text-[13px] leading-[44px] text-[#aaa]">メールアドレス</div>
          <div className="h-11 rounded-lg border border-[#e5e5e5] px-3 text-[13px] leading-[44px] text-[#aaa]">パスワード</div>
        </div>
        <div className="mt-5">
          <Cta onClick={() => setStep(registered ? "wallet" : "register")}>（デモ）ログインする</Cta>
        </div>
        <p className="mt-4 text-center text-[12px] text-[#3f7fb5]">はじめての方はこちら（新規登録）</p>
      </div>
    </>
  );
}

function Register({ c }: { c: CaseData }) {
  const reg = useApp((s) => s.reg);
  const setReg = useApp((s) => s.setReg);
  const setStep = useApp((s) => s.setPhoneStep);
  const done = c.reg.every((r, i) => filled(r, reg[i]));
  return (
    <>
      <SiteHeader c={c} back="login" />
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <p className="text-[15px] font-bold">利用登録</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#888]">はじめてクーポンを使う前に一度だけ登録します。回答は集計にだけ使い、個人が分かる形で企業に伝わることはありません。</p>
        {c.reg.map((r, i) => (
          <fieldset key={r.label} className="mt-5">
            <legend className="mb-2 text-[13px] font-bold">
              {r.label}
              <span className="ml-1.5 text-[11px] font-normal text-[#dc7f68]">必須</span>
            </legend>
            {r.bands ? (
              <BandCounts bands={r.bands} value={reg[i]} onChange={(v) => setReg(i, v)} />
            ) : r.opts.length > 8 ? (
              <select
                value={reg[i] ?? ""}
                onChange={(e) => setReg(i, e.target.value)}
                className="h-11 w-full rounded-lg border border-[#e5e5e5] bg-white px-3 text-[14px] outline-none focus:border-[#232323]"
              >
                <option value="" disabled>
                  選んでください
                </option>
                {r.opts.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ) : (
              <div className="flex flex-wrap gap-2">
                {r.opts.map((o) => (
                  <Chip key={o} on={reg[i] === o} onClick={() => setReg(i, o)}>
                    {o}
                  </Chip>
                ))}
              </div>
            )}
          </fieldset>
        ))}
      </div>
      <div className="shrink-0 border-t border-[#ededed] p-4">
        <Cta disabled={!done} onClick={() => setStep("wallet")}>
          登録する
        </Cta>
      </div>
    </>
  );
}

/** 入力済みか。年齢別の人数は1人以上いれば入力済み */
function filled(r: CaseData["reg"][number], v?: string) {
  if (!v) return false;
  return r.bands ? v.split(",").some((n) => Number(n) > 0) : true;
}

function bandText(bands: string[], v: string) {
  const n = v.split(",").map(Number);
  return bands.map((b, i) => (n[i] ? `${b} ${n[i]}人` : "")).filter(Boolean).join("・");
}

/** 年齢の区分ごとに人数を入れる */
function BandCounts({ bands, value, onChange }: { bands: string[]; value?: string; onChange: (v: string) => void }) {
  const n = (value ?? bands.map(() => "0").join(",")).split(",").map(Number);
  const set = (i: number, d: number) => {
    const next = n.map((x, j) => (j === i ? Math.max(0, Math.min(9, x + d)) : x));
    onChange(next.join(","));
  };
  return (
    <div className="divide-y divide-[#ededed] rounded-lg border border-[#e5e5e5]">
      {bands.map((b, i) => (
        <div key={b} className="flex items-center justify-between px-3 py-2">
          <span className="text-[14px]">{b}</span>
          <span className="flex items-center gap-3">
            <button type="button" aria-label={`${b}を減らす`} onClick={() => set(i, -1)} disabled={!n[i]} className="grid size-8 place-items-center rounded-full border border-[#e5e5e5] text-[18px] leading-none disabled:opacity-30">
              −
            </button>
            <span className="w-8 text-center text-[15px] font-bold tnum">{n[i]}人</span>
            <button type="button" aria-label={`${b}を増やす`} onClick={() => set(i, 1)} className="grid size-8 place-items-center rounded-full border border-[#232323] text-[18px] leading-none">
              ＋
            </button>
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------------- クーポンをもらう ---------------- */

function GetCoupons({ c, gift, projectName }: { c: CaseData; gift: Donor; projectName: string }) {
  const received = useApp((s) => s.phoneReceived);
  const receive = useApp((s) => s.receive);
  const site = SITE[c.id];
  return (
    <div className="px-4 py-4">
      <p className="px-1 text-[15px] font-bold">受け取れるクーポン</p>
      {received ? (
        <p className="mt-6 rounded-xl bg-white p-5 text-center text-[13px] text-[#888]">いま受け取れるクーポンはありません</p>
      ) : (
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-white p-3">
          <span className="grid size-16 shrink-0 place-items-center rounded-lg bg-[#dc7f68] text-white">
            <Gift className="size-7" strokeWidth={1.6} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] text-[#3f7fb5]">
              {c.muniShort}　{projectName}
            </span>
            <span className="block text-[14px] font-bold">新しいクーポンが1枚あります</span>
            <span className="block text-[11px] text-[#888]">有効期限 {site.expiry}</span>
          </span>
          <button type="button" onClick={() => receive(gift.id)} className="h-9 shrink-0 rounded-full bg-[#dc7f68] px-4 text-[13px] font-bold text-white">
            受け取る
          </button>
        </div>
      )}
    </div>
  );
}

/* 受け取った直後：包みをタップしてひらく */
function Opened({ c, gift, projectName }: { c: CaseData; gift: Donor; projectName: string }) {
  const setStep = useApp((s) => s.setPhoneStep);
  const [open, setOpen] = useState(false);
  const site = SITE[c.id];

  if (!open) {
    return (
      <>
        <SiteHeader c={c} />
        <div className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-[#fdf1ec] to-white px-8 text-center">
          <p className="text-[12px] text-[#888]">{c.muniShort}からのお知らせ</p>
          <p className="mt-1.5 text-[16px] font-bold">新しいクーポンが届いています</p>
          <button type="button" onClick={() => setOpen(true)} className="gift-wiggle relative mt-10 aspect-[4/3] w-56 rounded-2xl bg-[#dc7f68] shadow-xl" aria-label="ひらく">
            <span className="absolute inset-y-0 left-1/2 w-7 -translate-x-1/2 bg-[#f4c5b7]" />
            <span className="absolute inset-x-0 top-1/2 h-7 -translate-y-1/2 bg-[#f4c5b7]" />
            <Gift className="absolute top-1/2 left-1/2 size-12 -translate-x-1/2 -translate-y-1/2 text-white" strokeWidth={1.5} />
            <span className="absolute right-3 bottom-2 text-[12px] font-bold text-white/90">
              giftee<span className="font-normal">*</span>
            </span>
          </button>
          <p className="mt-10 text-[12px] text-[#888]">タップしてひらく</p>
        </div>
      </>
    );
  }

  return (
    <>
      <SiteHeader c={c} />
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-[#fdf1ec] to-white">
        <div className="px-5 pt-6 text-center">
          <p className="rise text-[12px] text-[#888]">クーポンを受け取りました</p>
          <p className="rise mt-1 text-[18px] leading-snug font-bold" style={{ animationDelay: "0.15s" }}>
            {gift.giftName}
          </p>
        </div>
        <div className="gift-open mx-5 mt-4 overflow-hidden rounded-2xl border border-[#ededed] bg-white shadow-lg">
          <div className="relative aspect-[4/3]">
            <GiftPhoto id={gift.photo} className="absolute inset-0 size-full" alt={gift.giftName} />
          </div>
          <div className="px-4 pt-3 pb-4">
            <p className="text-[12px] text-[#3f7fb5]">
              {c.muniShort}　{projectName}
            </p>
            <p className="mt-0.5 text-[15px] font-bold">{gift.giftName}</p>
            <p className="mt-0.5 text-[17px] font-bold tnum">{site.value}</p>
            <div className="mt-2 space-y-1 text-[12px] text-[#555]">
              <p className="flex items-center gap-1.5">
                <CalendarClock className="size-3.5" />
                有効期限 {site.expiry}
              </p>
              <p className="flex items-center gap-1.5">
                <Store className="size-3.5" />
                {site.howto}
              </p>
            </div>
          </div>
        </div>
        <p className="rise mx-5 mt-4 text-[11px] leading-relaxed text-[#888]" style={{ animationDelay: "0.6s" }}>
          このクーポンは、地元企業（{supporters(c, gift.projectId)}）の支援を受けています。
        </p>
      </div>
      <div className="shrink-0 border-t border-[#ededed] bg-white p-4">
        <Cta onClick={() => setStep("wallet")}>手持ちのクーポンを見る</Cta>
      </div>
    </>
  );
}

/* ---------------- 手持ちのクーポン ---------------- */

function WalletList({ c, gift, projectName }: { c: CaseData; gift: Donor; projectName: string }) {
  const setStep = useApp((s) => s.setPhoneStep);
  const received = useApp((s) => s.phoneReceived);
  const useCount = useApp((s) => s.useCount);
  const site = SITE[c.id];
  const others = c.gifts.filter((g) => !g.sponsored);
  return (
    <div className="px-4 py-4">
      <p className="px-1 text-[15px] font-bold">手持ちのクーポン</p>
      <p className="px-1 text-[11px] text-[#888]">
        {c.muniShort}　{projectName}
      </p>
      <div className="mt-3 space-y-2">
        {received && (
          <button type="button" onClick={() => setStep("use")} className="flex w-full items-center gap-3 rounded-xl bg-white p-3 text-left">
            <GiftPhoto id={gift.photo} className="size-16 shrink-0 rounded-lg" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[14px] font-bold">{gift.giftName}</span>
              <span className="text-[12px] font-bold tnum">{site.value}</span>
              <span className="mt-0.5 text-[11px] text-[#888]">{useCount > 0 ? `${useCount}回使用` : `有効期限 ${site.expiry}`}</span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-[#bbb]" />
          </button>
        )}
        {others.map((g) => (
          <div key={g.name} className="flex items-center gap-3 rounded-xl bg-white p-3">
            <span className="grid size-16 shrink-0 place-items-center rounded-lg bg-[#e3eff7] text-[#2c5b84]">
              <Ticket className="size-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-bold">{g.name}</span>
              <span className="block truncate text-[11px] text-[#888]">{g.sub}</span>
            </span>
            <span className="text-[12px] font-bold whitespace-nowrap text-[#2c5b84]">{g.left}</span>
          </div>
        ))}
      </div>
      {!received && (
        <button type="button" onClick={() => setStep("get")} className="mt-4 flex w-full items-center justify-between rounded-xl border border-dashed border-[#dc7f68] bg-[#fdf1ec] p-3 text-left text-[13px]">
          <span>
            <span className="block font-bold text-[#dc7f68]">受け取れるクーポンがあります</span>
            <span className="text-[11px] text-[#888]">「クーポンをもらう」から受け取れます</span>
          </span>
          <ChevronRight className="size-4 text-[#dc7f68]" />
        </button>
      )}
    </div>
  );
}

function MyPage({ c }: { c: CaseData }) {
  const reg = useApp((s) => s.reg);
  const restart = useApp((s) => s.restartPhone);
  return (
    <div className="px-4 py-4">
      <p className="px-1 text-[15px] font-bold">マイページ</p>
      <div className="mt-3 divide-y divide-[#ededed] rounded-xl bg-white">
        {c.reg.map((r, i) => (
          <div key={r.label} className="flex items-center justify-between px-4 py-3 text-[13px]">
            <span className="text-[#888]">{r.label}</span>
            <span className="text-right font-medium">{reg[i] ? (r.bands ? bandText(r.bands, reg[i]) : reg[i]) : "未登録"}</span>
          </div>
        ))}
      </div>
      <button type="button" onClick={restart} className="mt-4 w-full rounded-xl bg-white py-3 text-[13px] text-[#888]">
        ログアウト
      </button>
    </div>
  );
}

/* ---------------- 使う → アンケート（使った直後にひらく） ---------------- */

function UseAndSurvey({ c, gift, projectName }: { c: CaseData; gift: Donor; projectName: string }) {
  const step = useApp((s) => s.phoneStep);
  const setStep = useApp((s) => s.setPhoneStep);
  const redeem = useApp((s) => s.redeem);
  const useCount = useApp((s) => s.useCount);
  const [used, setUsed] = useState(step === "survey");

  useEffect(() => {
    if (!used || step === "survey") return;
    const t = setTimeout(() => redeem(gift.id), 1500);
    return () => clearTimeout(t);
  }, [used, step, redeem, gift.id]);

  return (
    <div className="relative flex h-full flex-col">
      <SiteHeader c={c} back={used ? undefined : "wallet"} />
      <div className="flex-1 overflow-y-auto px-5 py-6 text-center">
        <p className="text-[12px] text-[#3f7fb5]">{projectName}</p>
        <p className="text-[15px] font-bold">{gift.giftName}</p>
        <p className="mt-1 flex items-center justify-center gap-1 text-[12px] text-[#888]">
          <MapPin className="size-3.5" />
          {c.useTarget}
        </p>
        <div className="relative mx-auto mt-5 w-52">
          <Qr dim={used} />
          {used && (
            <div className="stamp absolute inset-0 m-auto grid size-36 place-items-center rounded-full border-4 border-[#dc7f68] bg-white/85 text-[20px] font-bold text-[#dc7f68]">
              使用済み
            </div>
          )}
        </div>
        <p className="mt-4 text-[12px] text-[#888]">{used ? `使用しました（${useCount + (step === "survey" ? 0 : 1)}回目の利用）` : "お店の人にこの画面を見せてください"}</p>
      </div>
      {!used && (
        <div className="shrink-0 border-t border-[#ededed] p-4">
          <Cta onClick={() => setUsed(true)}>（デモ）お店の人が読み取る</Cta>
        </div>
      )}
      {step === "survey" && <Survey c={c} gift={gift} onClose={() => setStep("wallet")} />}
    </div>
  );
}

function Qr({ dim }: { dim: boolean }) {
  const cells = Array.from({ length: 21 * 21 }, (_, i) => {
    const r = Math.floor(i / 21);
    const col = i % 21;
    const finder = (a: number, b: number) => r >= a && r < a + 7 && col >= b && col < b + 7;
    if (finder(0, 0) || finder(0, 14) || finder(14, 0)) {
      const rr = r >= 14 ? r - 14 : r;
      const cc = col >= 14 ? col - 14 : col;
      const edge = rr === 0 || rr === 6 || cc === 0 || cc === 6;
      const core = rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4;
      return edge || core;
    }
    return (r * 7 + col * 13 + r * col) % 5 < 2;
  });
  return (
    <div className={cn("grid aspect-square grid-cols-[repeat(21,1fr)] rounded-xl border border-[#e5e5e5] bg-white p-3 transition-opacity", dim && "opacity-30")}>
      {cells.map((on, i) => (
        <span key={i} className={on ? "bg-[#232323]" : ""} />
      ))}
    </div>
  );
}

function Survey({ c, gift, onClose }: { c: CaseData; gift: Donor; onClose: () => void }) {
  const answers = useApp((s) => s.answers);
  const setAnswer = useApp((s) => s.setAnswer);
  const submit = useApp((s) => s.submitSurvey);
  const [text, setText] = useState("");
  const [pub, setPub] = useState(true);
  const qs = c.questions.filter((q) => q.type !== "text");
  const msgQ = c.questions.find((q) => q.type === "text");
  const ready = c.questions.filter((q) => q.locked && q.type !== "text").every((q) => answers[q.id] != null);

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-black/40">
      <div className="sheet-up mt-10 flex min-h-0 flex-1 flex-col rounded-t-2xl bg-white">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-[#ddd]" />
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6">
          <p className="text-[17px] font-bold">アンケートへのご協力のお願い</p>
          <p className="mt-2 rounded-lg bg-[#f6f6f6] p-3 text-[12px] leading-relaxed text-[#555]">
            この事業をこれからも続けていくために、いただいた回答を集計・分析し、{c.muniShort}と支援企業にお伝えします。個人が特定される形でお伝えすることはありません。所要時間は1分ほどです。
          </p>
          {qs.map((q) => (
            <QuestionField key={q.id} q={q} value={answers[q.id]} onChange={(v) => setAnswer(q.id, v)} />
          ))}
          {msgQ && (
            <div className="mt-6">
              <label htmlFor="msg" className="mb-2 block text-[13px] font-bold">
                {msgQ.text}
                <span className="ml-1.5 text-[11px] font-normal text-[#888]">任意</span>
              </label>
              <textarea
                id="msg"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                placeholder="例：半日預けられて、久しぶりに自分の時間が取れました"
                className="w-full rounded-lg border border-[#e5e5e5] p-3 text-[14px] outline-none focus:border-[#232323]"
              />
              <label className="mt-2 flex items-start gap-2 text-[12px] text-[#555]">
                <input type="checkbox" checked={pub} onChange={(e) => setPub(e.target.checked)} className="mt-0.5 accent-[#dc7f68]" />
                ひとことを{c.muniShort}と支援企業に公開してよい（お名前は出ません）
              </label>
            </div>
          )}
        </div>
        <div className="shrink-0 space-y-2 border-t border-[#ededed] p-4">
          <Cta disabled={!ready} onClick={() => submit(gift.id, gift.projectId, text, pub)}>
            回答を送る
          </Cta>
          <button type="button" onClick={onClose} className="block w-full py-1 text-[12px] text-[#888]">
            あとで答える
          </button>
        </div>
      </div>
    </div>
  );
}

function QuestionField({ q, value, onChange }: { q: Question; value: unknown; onChange: (v: string | number | string[]) => void }) {
  return (
    <fieldset className="mt-6">
      <legend className="mb-2 text-[13px] font-bold">
        {q.text}
        {q.locked && <span className="ml-1.5 text-[11px] font-normal text-[#dc7f68]">必須</span>}
      </legend>
      {q.type === "scale" && (
        <>
          <div className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={value === n}
                onClick={() => onChange(n)}
                className={cn("h-10 rounded-lg border text-[14px] tnum", value === n ? "border-[#dc7f68] bg-[#dc7f68] font-bold text-white" : "border-[#e5e5e5] text-[#555]")}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-[#888]">
            <span>不満</span>
            <span>満足</span>
          </div>
        </>
      )}
      {q.type === "choice" && (
        <div className="flex flex-wrap gap-2">
          {q.opts?.map((o) => (
            <Chip key={o} on={value === o} onClick={() => onChange(o)}>
              {o}
            </Chip>
          ))}
        </div>
      )}
      {q.type === "yen" && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={100}
            value={value == null ? "" : String(value)}
            onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="例：3000"
            className="h-11 w-40 rounded-lg border border-[#e5e5e5] px-3 text-right text-[15px] outline-none tnum focus:border-[#232323]"
          />
          <span className="text-[14px]">円</span>
          <span className="text-[11px] text-[#888]">使っていなければ 0</span>
        </div>
      )}
      {q.type === "multi" && (
        <div className="flex flex-wrap gap-2">
          {q.opts?.map((o) => {
            const arr = Array.isArray(value) ? (value as string[]) : [];
            const on = arr.includes(o);
            return (
              <Chip key={o} on={on} onClick={() => onChange(on ? arr.filter((x) => x !== o) : [...arr, o])}>
                {o}
              </Chip>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}

/* ---------------- お礼 ---------------- */

function Done({ c }: { c: CaseData }) {
  const setStep = useApp((s) => s.setPhoneStep);
  const flash = useApp((s) => s.flashVoiceId);
  return (
    <>
      <SiteHeader c={c} />
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div className="rise grid size-16 place-items-center rounded-full bg-[#fdf1ec] text-[#dc7f68]">
          <Gift className="size-8" strokeWidth={1.5} />
        </div>
        <p className="rise mt-5 text-[19px] font-bold" style={{ animationDelay: "0.1s" }}>
          ご回答ありがとうございました
        </p>
        <p className="rise mt-3 text-[13px] leading-relaxed text-[#555]" style={{ animationDelay: "0.2s" }}>
          {flash ? `いただいた声は、${c.muniShort}と支援企業にお届けしました。` : "いただいた回答は、事業の改善と報告に使わせていただきます。"}
          <br />
          引き続き、よろしくお願いいたします。
        </p>
      </div>
      <div className="shrink-0 space-y-2 p-4">
        {flash && (
          <Link href="/share" className="flex h-12 w-full items-center justify-center rounded-full bg-[#dc7f68] text-[15px] font-bold text-white">
            （デモ）企業の社内共有ページで見る
          </Link>
        )}
        <Cta variant="line" onClick={() => setStep("wallet")}>
          手持ちのクーポンに戻る
        </Cta>
      </div>
    </>
  );
}
