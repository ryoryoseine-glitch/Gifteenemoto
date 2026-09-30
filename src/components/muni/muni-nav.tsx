"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCase } from "@/store/useApp";

const ITEMS = [
  { href: "/muni/numbers", label: "数字と声", icon: BarChart3 },
  { href: "/muni/report", label: "報告書（Word）", icon: FileText },
];

export function MuniNav() {
  const path = usePathname();
  const c = useCase();
  return (
    <nav aria-label="自治体メニュー" className="rounded-lg border bg-card p-2 lg:sticky lg:top-24">
      <div className="hidden px-3 pt-1 pb-2 text-xs text-muted-foreground lg:block">{c.muni}</div>
      <div className="flex gap-1 overflow-x-auto lg:flex-col">
        {ITEMS.map((it) => {
          const on = path === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={on ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                on && "bg-brand-soft font-bold text-brand hover:bg-brand-soft hover:text-brand",
              )}
            >
              <it.icon className="size-4 shrink-0" />
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
