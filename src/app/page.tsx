import { LogicTree } from "@/components/concept/logic-tree";

/** 提案の要点：価値から実装までのロジックツリー */
export default function Home() {
  return (
    <div className="mx-auto max-w-[1520px] space-y-4 py-2">
      <div>
        <p className="text-xs font-bold text-orange">giftee 提案・コンセプト版</p>
        <h1 className="mt-1 text-[24px] leading-snug font-bold tracking-tight sm:text-[30px]">寄附ギフトの試作：価値から実装までの分解</h1>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block size-3 rounded-sm border border-muted-foreground bg-muted" />
          既存（ギフティにある）
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block size-3 rounded-sm border border-orange bg-orange-soft" />
          新しく作る
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block size-3 rounded-sm border border-amber-600 bg-amber-100" />
          あるか要確認
        </span>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card p-2">
        <LogicTree />
      </div>
    </div>
  );
}
