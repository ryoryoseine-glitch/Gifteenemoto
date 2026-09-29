import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { TopBar } from "@/components/shell/top-bar";
import { ClientGate } from "@/components/shell/client-gate";
import "./globals.css";

const noto = Noto_Sans_JP({
  variable: "--font-noto",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: "寄付ギフト ダッシュボード（プロトタイプ）",
  description: "企業の寄附を体験ギフトとして届け、結果を自治体と企業に返すサービスの UI プロトタイプ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" suppressHydrationWarning className={`${noto.variable} h-full antialiased`}>
      <body className="min-h-full bg-page text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider>
            <TopBar />
            <main className="mx-auto w-full max-w-[1240px] px-4 pt-6 pb-16 sm:px-6">
              <ClientGate>{children}</ClientGate>
            </main>
            <footer className="pb-8 text-center text-[11px] text-muted-foreground/70">
              powered by giftee<span className="text-orange">*</span> e街　寄付ギフト
            </footer>
            <Toaster position="bottom-center" />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
