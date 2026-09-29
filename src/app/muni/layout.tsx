import { MuniNav } from "@/components/muni/muni-nav";

export default function MuniLayout({ children }: LayoutProps<"/muni">) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[228px_minmax(0,1fr)]">
      <MuniNav />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
