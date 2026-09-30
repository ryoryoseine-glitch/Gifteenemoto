"use client";

import { useEffect, useState } from "react";
import { MessageSquareQuote } from "lucide-react";
import { PersonAvatar } from "@/components/insight/voice-bubble";
import { cn } from "@/lib/utils";
import { ago, publicAttrs } from "@/lib/format";
import type { CaseData } from "@/data/types";
import { useApp } from "@/store/useApp";
import { EmptyState, UpdateBadge } from "@/components/shell/parts";
import { Button } from "@/components/ui/button";

/** 受け取った人の声（カード型・3列）。mode="muni" では非表示の切り替えができる */
export function VoicesGrid({
  c,
  projectIds,
  giftIds,
  showGift,
  closed,
  mode = "corp",
  pageSize = 6,
}: {
  c: CaseData;
  projectIds: string[];
  /** 指定したときはこのギフトへの声だけ */
  giftIds?: string[];
  showGift: boolean;
  closed?: boolean;
  mode?: "corp" | "muni" | "share";
  /** 最初に見せる件数（残りは「もっと見る」） */
  pageSize?: number;
}) {
  const toggleHidden = useApp((s) => s.toggleVoiceHidden);
  const raw = useApp((s) => s.raw[s.caseId]);
  const hiddenForShare = useApp((s) => s.hiddenForShare);
  const toggleForShare = useApp((s) => s.toggleHiddenForShare);
  const flashId = useApp((s) => s.flashVoiceId);
  const [theme, setTheme] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const voices = c.voices
    .filter((v) => projectIds.includes(v.projectId) && (!giftIds || giftIds.includes(v.giftId)) && (mode === "muni" || !v.hidden))
    .sort((a, b) => (b.postedAt ?? 0) - (a.postedAt ?? 0));
  const themes = [...new Set(voices.map((v) => v.theme))];
  const filtered = theme ? voices.filter((v) => v.theme === theme) : voices;
  const list = more ? filtered : filtered.slice(0, pageSize);
  const giftName = (id: string) => c.donors.find((x) => x.id === id)?.giftName ?? "";
  const hiddenCount = voices.filter((v) => v.hidden).length;
  // 自治体の画面では、声を元データ（アンケート回答 → 利用の明細 → チケット・加盟店）とつなげて全部出す
  const detail = (id: string) => {
    if (mode !== "muni") return null;
    const r = raw.surveyResponses.find((x) => x.responseId === id);
    const red = r ? raw.redemptions.find((x) => x.redemptionId === r.redemptionId) : undefined;
    const shop = red ? raw.shops.find((x) => x.shopId === red.shopId) : undefined;
    return { memberId: r?.memberId ?? "—", ticketId: red?.ticketId ?? "—", shop: shop ? `${shop.name}（${shop.area}）` : "—", usedAt: red ? red.usedAt.slice(0, 16).replace("T", " ") : "—", answeredAt: r ? r.answeredAt.slice(0, 16).replace("T", " ") : "—" };
  };

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          受け取った人の声
          <span className="font-normal text-muted-foreground tnum">
            {voices.length}件{mode === "muni" && hiddenCount > 0 && `（うち非表示 ${hiddenCount}件）`}
          </span>
        </h3>
        {closed ? <UpdateBadge kind="daily" text="期間終了" /> : <UpdateBadge kind="live" />}
      </div>
      {mode === "muni" && (
        <p className="-mt-1 mb-3 text-xs text-muted-foreground">公開に同意した声は、寄附企業の画面にすぐ表示されます。不適切なものは「企業に出さない」にチェックすると非表示になります。</p>
      )}

      {voices.length === 0 ? (
        <div className="rounded-lg border bg-card">
          {closed ? (
            <EmptyState icon={<MessageSquareQuote />} title="このギフトでは声を集めていません">
              利用後のアンケートを始める前に終わったギフトです。
            </EmptyState>
          ) : (
            <EmptyState icon={<MessageSquareQuote />} title="まだ声が届いていません">
              受け取った人がアンケートでひとことを書き、公開に同意すると、ここにすぐ表示されます。
            </EmptyState>
          )}
        </div>
      ) : (
        <>
          {themes.length > 1 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {[null, ...themes].map((th) => (
                <button
                  key={th ?? "all"}
                  type="button"
                  aria-pressed={theme === th}
                  onClick={() => setTheme(th)}
                  className={cn(
                    "rounded-full border bg-card px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground",
                    theme === th && "border-primary bg-brand-soft font-medium text-brand",
                  )}
                >
                  {th ?? "すべて"}
                </button>
              ))}
            </div>
          )}
          <ul className="divide-y rounded-lg border bg-card">
            {list.map((v) => (
              <li
                key={v.id}
                className={cn(
                  "grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 gap-y-2 px-4 py-3.5 md:grid-cols-[auto_12rem_minmax(0,1fr)_auto]",
                  flashId === v.id && "flash-in",
                  (v.hidden || (mode === "corp" && hiddenForShare[v.id])) && "opacity-55",
                )}
              >
                <PersonAvatar seed={v.id} withChild={c.id === "matsumoto"} />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground/80">{mode === "muni" ? v.attrs : publicAttrs(c.id, v.attrs)}</p>
                  <p className="mt-0.5 tnum">{ago(v.postedAt ?? now, now)}</p>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <p className="text-[14px] leading-relaxed">{v.text}</p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span className="rounded bg-muted px-1.5 py-px whitespace-nowrap">{v.theme}</span>
                    {showGift && <span className="whitespace-nowrap">{giftName(v.giftId)}</span>}
                  </p>
                  {(() => {
                    const d = detail(v.id);
                    if (!d) return null;
                    return (
                      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 rounded-md bg-muted/60 px-3 py-2 text-[11.5px] text-muted-foreground sm:grid-cols-[auto_1fr_auto_1fr]">
                        <dt>会員ID</dt>
                        <dd className="text-foreground tnum">{d.memberId}</dd>
                        <dt>チケットID</dt>
                        <dd className="text-foreground tnum">{d.ticketId}</dd>
                        <dt>使ったクーポン</dt>
                        <dd className="text-foreground">{giftName(v.giftId) || "—"}</dd>
                        <dt>使った店舗</dt>
                        <dd className="text-foreground">{d.shop}</dd>
                        <dt>使った日時</dt>
                        <dd className="text-foreground tnum">{d.usedAt}</dd>
                        <dt>回答した日時</dt>
                        <dd className="text-foreground tnum">{d.answeredAt}</dd>
                      </dl>
                    );
                  })()}
                </div>
                {mode === "corp" && (
                  <label className="col-span-2 inline-flex cursor-pointer items-center gap-1.5 justify-self-end text-xs text-muted-foreground md:col-span-1">
                    <input id={`share-hide-${v.id}`} type="checkbox" checked={!!hiddenForShare[v.id]} onChange={() => toggleForShare(v.id)} className="size-4 accent-[var(--brand)]" />
                    社内共有ページに出さない
                  </label>
                )}
                {mode === "muni" && (
                  <label className="col-span-2 inline-flex cursor-pointer items-center gap-1.5 justify-self-end text-xs text-muted-foreground md:col-span-1">
                    <input id={`hide-${v.id}`} type="checkbox" checked={!!v.hidden} onChange={() => toggleHidden(v.id)} className="size-4 accent-[var(--brand)]" />
                    企業に出さない
                  </label>
                )}
              </li>
            ))}
          </ul>
          {filtered.length > pageSize && (
            <div className="mt-3 text-center">
              <Button variant="ghost" size="sm" onClick={() => setMore(!more)}>
                {more ? "たたむ" : `もっと見る（残り ${filtered.length - pageSize}件）`}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
