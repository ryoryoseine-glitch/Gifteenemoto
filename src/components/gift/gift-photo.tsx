/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";
import { PHOTO_CREDITS } from "@/data/photos";

/** ギフトの写真。何を届けているかが一目で分かるように */
export function GiftPhoto({ id, className, alt = "" }: { id: string; className?: string; alt?: string }) {
  if (!PHOTO_CREDITS[id]) return <div className={cn("bg-muted", className)} />;
  return <img src={`/gifts/${id}.jpg`} alt={alt} className={cn("object-cover", className)} draggable={false} />;
}

/** 複数のギフトをまとめたカード用。写真を2×2で並べる */
export function GiftCollage({ ids, className }: { ids: string[]; className?: string }) {
  const list = ids.filter((i) => PHOTO_CREDITS[i]).slice(0, 4);
  return (
    <div className={cn("grid", list.length > 2 ? "grid-cols-2 grid-rows-2" : "grid-cols-2", className)}>
      {list.map((id, i) => (
        <GiftPhoto key={id} id={id} className={cn("size-full", list.length === 3 && i === 0 && "row-span-2")} />
      ))}
    </div>
  );
}

export function PhotoCredits({ ids }: { ids: string[] }) {
  const list = [...new Set(ids)].filter((i) => PHOTO_CREDITS[i]);
  if (!list.length) return null;
  return (
    <p className="px-1 text-[11px] leading-relaxed text-muted-foreground/80">
      写真：
      {list.map((id, i) => (
        <span key={id}>
          {i > 0 && "／"}
          <a href={PHOTO_CREDITS[id].url} target="_blank" rel="noreferrer" className="hover:underline">
            {PHOTO_CREDITS[id].author}（{PHOTO_CREDITS[id].license}）
          </a>
        </span>
      ))}
    </p>
  );
}
