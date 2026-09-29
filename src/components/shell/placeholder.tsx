export function Placeholder({ route }: { route: string }) {
  return (
    <div className="grid min-h-[50vh] place-items-center rounded-lg border border-dashed bg-card text-center">
      <div>
        <p className="text-sm font-medium">{route}</p>
        <p className="mt-1 text-xs text-muted-foreground">この画面は次の段階で作ります</p>
      </div>
    </div>
  );
}
