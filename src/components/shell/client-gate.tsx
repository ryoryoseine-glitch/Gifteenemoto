"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const subscribe = () => () => {};

/** モックの状態はブラウザだけに持つので、描画もブラウザで行う。待つ間は読み込み中の表示 */
export function ClientGate({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  if (!mounted) return <LoadingSkeleton />;
  return <>{children}</>;
}

export function LoadingSkeleton() {
  return (
    <div aria-busy="true" aria-label="読み込み中" className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-6 w-72" />
        <Skeleton className="h-3 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-3 rounded-lg border bg-card p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      <div className="space-y-3 rounded-lg border bg-card p-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}
