"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, Database, FileText, LayoutDashboard, MessageSquareText, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp, useCase } from "@/store/useApp";

const ITEMS = [
  { href: "/muni", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/muni/sponsors", label: "支援企業の情報", icon: Building2 },
  { href: "/muni/survey", label: "アンケートの結果", icon: MessageSquareText },
  { href: "/muni/report", label: "報告書の作成", icon: FileText },
];

export function MuniNav() {
  const path = usePathname();
  const router = useRouter();
  const c = useCase();
  const caseId = useApp((s) => s.caseId);
  const projectId = useApp((s) => s.muniProject[caseId]) ?? "all";
  const setProject = useApp((s) => s.setMuniProject);
  // ダッシュボードの下に事業を並べる（PCの幅だけ。スマホ幅はダッシュボード内のプルダウン）
  const projects = [{ id: "all", name: "すべての事業", closed: false }, ...c.projects.map((p) => ({ id: p.id, name: p.name, closed: p.status === "closed" }))];
  const sub = (
    <ul className="mt-0.5 mb-1 hidden space-y-0.5 lg:block">
      {projects.map((p) => {
        const on = path === "/muni" && projectId === p.id;
        return (
          <li key={p.id}>
            <button
              type="button"
              aria-current={on ? "page" : undefined}
              onClick={() => {
                setProject(p.id);
                if (path !== "/muni") router.push("/muni");
              }}
              className={cn(
                "flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 pl-9 text-left text-[12.5px] leading-snug text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                on && "bg-brand-soft font-bold text-brand hover:bg-brand-soft hover:text-brand",
              )}
            >
              <span className="min-w-0 flex-1">{p.name}</span>
              {p.closed && <span className="shrink-0 text-[10px] font-normal text-muted-foreground">終了</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
  const item = (it: { href: string; label: string; icon: typeof Settings }) => {
    // ダッシュボードは下の事業で選ばれている状態を示すので、見出しとして太字だけにする
    const isDash = it.href === "/muni";
    const on = path === it.href && !isDash;
    return (
      <Link
        key={it.href}
        href={it.href}
        aria-current={on ? "page" : undefined}
        className={cn(
          "flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          on && "bg-brand-soft font-bold text-brand hover:bg-brand-soft hover:text-brand",
          isDash && path === "/muni" && "font-bold text-foreground lg:bg-transparent",
          isDash && path === "/muni" && "max-lg:bg-brand-soft max-lg:text-brand",
        )}
      >
        <it.icon className="size-4 shrink-0" />
        {it.label}
      </Link>
    );
  };
  return (
    <nav aria-label="自治体メニュー" className="rounded-lg border bg-card p-2 lg:sticky lg:top-24">
      <div className="hidden px-3 pt-1 pb-2 text-xs text-muted-foreground lg:block">{c.muni}</div>
      <div className="flex gap-1 overflow-x-auto lg:flex-col">
        {item(ITEMS[0])}
        {sub}
        {ITEMS.slice(1).map(item)}
        <div className="mx-1 hidden border-t lg:my-1.5 lg:block" />
        {item({ href: "/muni/data", label: "元データ", icon: Database })}
        {item({ href: "/muni/settings", label: "設定", icon: Settings })}
      </div>
    </nav>
  );
}
