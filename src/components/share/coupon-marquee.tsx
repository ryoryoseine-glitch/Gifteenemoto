"use client";

import type { CaseData } from "@/data/types";
import { GiftPhoto } from "@/components/gift/gift-photo";

/** 配布中のクーポン（寄附企業の枠）が横に流れる帯。社内共有ページと寄附企業のダッシュボードで使う */
export function CouponMarquee({ c, title = "配布中のクーポン" }: { c: CaseData; title?: string }) {
  const active = new Set(c.projects.filter((p) => p.status === "active").map((p) => p.id));
  const list = c.donors.filter((d) => d.name === c.corp.name && active.has(d.projectId));
  if (!list.length) return null;
  const projectName = (id: string) => c.projects.find((p) => p.id === id)?.name ?? "";
  // 帯の幅が足りないときは同じカードを繰り返して埋める
  const row = list.length < 4 ? [...list, ...list, ...list] : list;
  return (
    <section aria-label={title}>
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      <div className="marquee relative -mx-4 overflow-hidden sm:mx-0 sm:rounded-xl">
        <ul className="marquee-track flex w-max gap-4 py-1">
          {[...row, ...row].map((d, i) => (
            <li key={`${d.id}-${i}`} aria-hidden={i >= row.length} className="w-[220px] shrink-0 overflow-hidden rounded-xl border bg-card">
              <GiftPhoto id={d.photo} className="aspect-[4/3] w-full" alt={d.giftName} />
              <div className="px-3.5 py-3">
                <p className="truncate text-[11px] text-link">
                  {c.muniShort}　{projectName(d.projectId)}
                </p>
                <p className="mt-0.5 truncate text-[14px] font-bold">{d.giftName}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent" />
      </div>
    </section>
  );
}
