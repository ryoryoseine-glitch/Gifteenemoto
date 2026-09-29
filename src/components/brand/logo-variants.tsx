import { cn } from "@/lib/utils";
import { mplusRounded, shippori, zenKaku, zenMaru } from "./fonts";

type P = { corp: string; city: string; className?: string };

/** 案A：丸ゴシック＋リボンの印。やわらかく親しみやすい */
export function LogoA({ corp, city, className }: P) {
  return (
    <span className={cn(zenMaru.className, "inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <circle cx="16" cy="16" r="16" fill="var(--orange)" />
        <path d="M9 14h14v10H9z" fill="#fff" />
        <path d="M8 11h16v4H8z" fill="#fff" />
        <path d="M15 11h2v13h-2z" fill="var(--orange)" />
        <path d="M16 11c-2.5-4-6-3.5-5.5-1S14 11 16 11c2 0 5 1.5 5.5-1s-3-3-5.5 1z" fill="#fff" />
      </svg>
      <span className="text-[18px] leading-none font-bold tracking-wide">
        {corp}
        <span className="mx-1.5 text-[14px] font-medium text-orange">×</span>
        {city}
      </span>
    </span>
  );
}

/** 案B：明朝。感謝状のような上品さ。企業を小さく、市を大きく */
export function LogoB({ corp, city, className }: P) {
  return (
    <span className={cn(shippori.className, "inline-flex flex-col leading-none", className)}>
      <span className="text-[11px] font-medium tracking-[0.2em] text-muted-foreground">{corp}から</span>
      <span className="mt-1 text-[20px] font-bold tracking-[0.12em]">
        {city}へ<span className="ml-1 text-[13px] font-medium tracking-normal text-orange">のおくりもの</span>
      </span>
    </span>
  );
}

/** 案C：丸ゴシック太め＋2つの円が重なる印（企業と市がつながる） */
export function LogoC({ corp, city, className }: P) {
  return (
    <span className={cn(mplusRounded.className, "inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 40 28" className="h-7 w-10 shrink-0" aria-hidden>
        <circle cx="14" cy="14" r="12" fill="var(--brand)" opacity="0.9" />
        <circle cx="26" cy="14" r="12" fill="var(--orange)" opacity="0.9" style={{ mixBlendMode: "multiply" }} />
      </svg>
      <span className="text-[18px] leading-none font-extrabold tracking-tight">
        {corp}
        <span className="mx-1 font-medium text-muted-foreground">×</span>
        {city}
      </span>
    </span>
  );
}

/** 案D：角ゴシック＋縦線。きちんとした印象、下に小さく「応援ギフト」 */
export function LogoD({ corp, city, className }: P) {
  return (
    <span className={cn(zenKaku.className, "inline-flex items-center gap-3", className)}>
      <span className="flex flex-col leading-none">
        <span className="text-[17px] font-bold tracking-wide">
          {corp}
          <span className="mx-2 inline-block h-4 w-px translate-y-0.5 bg-foreground/30" />
          {city}
        </span>
        <span className="mt-1 text-[10px] font-medium tracking-[0.3em] text-orange">応援ギフト</span>
      </span>
    </span>
  );
}
