"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useTheme } from "next-themes";
import { Moon, RotateCcw, Sun } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CASE_OPTIONS } from "@/data";
import { LogoA } from "@/components/brand/logo-variants";
import type { CaseId } from "@/data/types";
import { useApp } from "@/store/useApp";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const ROLES = [
  { href: "/", label: "提案の要点", sub: "" },
  { href: "/phone", label: "受け取る人", sub: "アンケート" },
  { href: "/muni/analysis", label: "自治体", sub: "分析・報告書" },
  { href: "/share", label: "寄附企業", sub: "社内共有ページ" },
];

export function TopBar() {
  const path = usePathname();
  const caseId = useApp((s) => s.caseId);
  const setCase = useApp((s) => s.setCase);
  const reset = useApp((s) => s.reset);
  const c = useApp((s) => s.cases[s.caseId]);
  const { resolvedTheme, setTheme } = useTheme();
  // ?case=sapporo で開いたときはその事例にする（共有・確認用）
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("case");
    if (q === "matsumoto" || q === "sapporo") setCase(q);
  }, [setCase]);

  return (
    <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 sm:px-6">
        <Link href="/" className="flex items-baseline gap-2 whitespace-nowrap">
          <LogoA corp={c.corp.name.replace("株式会社", "")} city={c.muniShort} />
        </Link>

        <nav aria-label="役割の切り替え" className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
          {ROLES.map((r) => {
            const on = r.href.startsWith("/muni") ? path.startsWith("/muni") : path === r.href;
            return (
              <Link
                key={r.href}
                href={r.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  on && "bg-brand-soft font-bold text-brand hover:bg-brand-soft hover:text-brand",
                )}
              >
                {r.label}
                <span className={cn("text-[11px] font-normal", on ? "text-brand/70" : "text-muted-foreground/70")}>{r.sub}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground md:inline">事例</span>
          <Select items={CASE_OPTIONS} value={caseId} onValueChange={(v) => v && setCase(v as CaseId)}>
            <SelectTrigger size="sm" className="min-w-[150px] bg-card" aria-label="事例">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CASE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="データを初期状態に戻す"
                  onClick={() => {
                    reset();
                    toast("データを初期状態に戻しました");
                  }}
                />
              }
            >
              <RotateCcw />
            </TooltipTrigger>
            <TooltipContent>データを初期状態に戻す</TooltipContent>
          </Tooltip>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="ライト／ダークの切り替え"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            <Sun className="hidden dark:block" />
            <Moon className="dark:hidden" />
          </Button>
        </div>
      </div>
      <div className="border-t bg-brand-soft/60 px-4 py-1 text-center text-[11px] text-muted-foreground">
        コンセプトプロトタイプ（非公式）。企業名・数字はすべて仮
      </div>
    </header>
  );
}
