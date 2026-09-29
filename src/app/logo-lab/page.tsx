import { LogoA, LogoB, LogoC, LogoD } from "@/components/brand/logo-variants";

const PAIRS = [
  ["アルプス電装", "松本市"],
  ["北星ロジスティクス", "さっぽろ圏"],
];

export default function Page() {
  const rows = [
    ["A", "丸ゴシック＋リボンの印", LogoA],
    ["B", "明朝で「〇〇から〇〇へ」", LogoB],
    ["C", "太い丸ゴシック＋重なる円", LogoC],
    ["D", "角ゴシック＋縦線＋応援ギフト", LogoD],
  ] as const;
  return (
    <div className="space-y-4">
      {rows.map(([k, label, L]) => (
        <div key={k} className="rounded-lg border bg-card">
          <div className="border-b px-5 py-2 text-xs text-muted-foreground">
            案{k}　{label}
          </div>
          <div className="grid gap-6 px-6 py-5 sm:grid-cols-2">
            {PAIRS.map(([corp, city]) => (
              <div key={city} className="flex h-14 items-center rounded-md border bg-white px-5 text-[#232323]">
                <L corp={corp} city={city} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
