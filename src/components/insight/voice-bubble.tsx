"use client";

import { cn } from "@/lib/utils";
import { ago, publicAttrs } from "@/lib/format";
import type { Donor, Voice } from "@/data/types";
import { GiftPhoto } from "@/components/gift/gift-photo";

const TINTS = ["#fde2d6", "#dcebf7", "#e3f2e6", "#fbe4ee", "#efe7fb", "#fdf0d0"];
const INK = ["#c8542a", "#2c5b84", "#2f7d4f", "#b8456b", "#6b4fb3", "#a8741a"];

/** 人の形のアイコン。子育ては大人と子ども、観光は大人ひとり */
export function PersonAvatar({ seed, withChild }: { seed: string; withChild: boolean }) {
  const h = [...seed].reduce((a, ch) => a + ch.charCodeAt(0), 0) % TINTS.length;
  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-full" style={{ background: TINTS[h] }} aria-hidden>
      <svg viewBox="0 0 44 44" className="size-11">
        <g fill={INK[h]} opacity="0.85">
          <circle cx={withChild ? 18 : 22} cy="16" r="6" />
          <path d={withChild ? "M8 36c0-7 4.5-11 10-11s10 4 10 11z" : "M11 37c0-8 5-12 11-12s11 4 11 12z"} />
          {withChild && (
            <>
              <circle cx="31" cy="23" r="4" />
              <path d="M24.5 37c0-5 3-7.5 6.5-7.5s6.5 2.5 6.5 7.5z" />
            </>
          )}
        </g>
      </svg>
    </span>
  );
}

/** 吹き出しの声（企業・社員向け。属性はぼかして出す） */
export function VoiceBubble({ v, gift, caseId, now, fresh }: { v: Voice; gift?: Donor; caseId: string; now: number; fresh?: boolean }) {
  return (
    <li className={cn("mb-4 break-inside-avoid", fresh && "rise")}>
      <div className="flex items-start gap-3">
        <PersonAvatar seed={v.id} withChild={caseId === "matsumoto"} />
        <div className="min-w-0 flex-1">
          <p className="mb-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/80">{publicAttrs(caseId, v.attrs)}</span>
            <span className="tnum">{ago(v.postedAt ?? now, now)}</span>
            {fresh && <span className="rounded-full bg-orange px-1.5 py-px text-[10px] font-bold text-white">NEW</span>}
          </p>
          <div className={cn("relative rounded-2xl rounded-tl-sm border bg-card px-4 py-3 shadow-sm", fresh && "flash-in")}>
            <p className="text-[15px] leading-relaxed">{v.text}</p>
            <div className="mt-2.5 flex items-center gap-2">
              {gift ? (
                <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <GiftPhoto id={gift.photo} className="size-5 shrink-0 rounded" />
                  <span className="truncate">{gift.giftName}</span>
                </span>
              ) : null}

            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
