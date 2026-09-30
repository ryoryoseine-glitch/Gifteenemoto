"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FileText, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCase } from "@/store/useApp";

const ITEMS = [
  { href: "/muni/numbers", label: "利用実績・アンケート結果", icon: BarChart3 },
  { href: "/muni/report", label: "報告書（Word）", icon: FileText },
];

export function MuniNav() {
  const path = usePathname();
  const c = useCase();
  return (
    <nav aria-label="自治体メニュー" className="rounded-lg border bg-card p-2 lg:sticky lg:top-24">
      <div className="hidden px-3 pt-1 pb-2 text-xs text-muted-foreground lg:block">{c.muni}</div>
      <div className="flex gap-1 overflow-x-auto lg:flex-col">
        <Link
          href="/muni/existing"
          aria-current={path === "/muni/existing" ? "page" : undefined}
          className={cn(
            "flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            path === "/muni/existing" && "bg-muted font-bold text-foreground",
          )}
        >
          <LayoutDashboard className="size-4 shrink-0" />
          ダッシュボード
          <span className="ml-auto rounded bg-muted px-1.5 py-px text-[10px] font-bold">既存</span>
        </Link>
        <p className="hidden px-3 pt-2 pb-1 text-[11px] font-bold text-orange lg:block">ダッシュボードに追加する予定</p>
        {ITEMS.map((it) => {
          const on = path === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={on ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:ml-3",
                on && "bg-brand-soft font-bold text-brand hover:bg-brand-soft hover:text-brand",
              )}
            >
              <it.icon className="size-4 shrink-0" />
              {it.label}
              <span className="ml-auto rounded bg-orange-soft px-1.5 py-px text-[10px] font-bold text-orange">追加</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
