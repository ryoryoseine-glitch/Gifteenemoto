"use client";

import { useEffect, useState } from "react";
import { EyeOff, Eye, Heart, MessageSquareQuote } from "lucide-react";
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
  const liked = useApp((s) => s.liked);
  const toggleLike = useApp((s) => s.toggleLike);
  const toggleHidden = useApp((s) => s.toggleVoiceHidden);
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
        <p className="-mt-1 mb-3 text-xs text-muted-foreground">公開に同意した声は、寄附企業の画面にすぐ表示されます。不適切なものは「企業に出さない」で非表示にできます。</p>
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
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((v) => (
              <li
                key={v.id}
                className={cn(
                  "flex flex-col rounded-lg border bg-card px-4 pt-4 pb-3",
                  flashId === v.id && "flash-in",
                  v.hidden && "border-dashed opacity-55",
                )}
              >
                <MessageSquareQuote className="mb-2 size-4 text-orange" />
                <p className="flex-1 text-[14px] leading-relaxed">{v.text}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t pt-2.5 text-xs text-muted-foreground">
                  <span>{mode === "muni" ? v.attrs : publicAttrs(c.id, v.attrs)}</span>
                  <span aria-hidden>·</span>
                  <span className="tnum">{ago(v.postedAt ?? now, now)}</span>
                  {mode === "muni" ? (
                    <span className="ml-auto inline-flex items-center gap-1 tnum">
                      <Heart className="size-3" />
                      {v.likes}
                    </span>
                  ) : (
                    <button
                      type="button"
                      aria-pressed={!!liked[v.id]}
                      onClick={() => toggleLike(v.id)}
                      className={cn(
                        "ml-auto inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 tnum transition-colors hover:border-orange hover:text-orange",
                        liked[v.id] && "border-orange bg-orange-soft text-orange",
                      )}
                    >
                      <Heart className={cn("size-3", liked[v.id] && "fill-current")} />
                      共感 {v.likes}
                    </button>
                  )}
                  <span className="flex w-full flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="rounded bg-muted px-1.5 py-px whitespace-nowrap">{v.theme}</span>
                    {showGift && <span className="whitespace-nowrap">{giftName(v.giftId)}</span>}
                    {mode === "muni" && (
                      <Button variant="ghost" size="xs" className="ml-auto" onClick={() => toggleHidden(v.id)}>
                        {v.hidden ? <Eye /> : <EyeOff />}
                        {v.hidden ? "企業に出す" : "企業に出さない"}
                      </Button>
                    )}
                  </span>
                </div>
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
