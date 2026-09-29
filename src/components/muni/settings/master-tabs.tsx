"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { pctText, yen } from "@/lib/format";
import { sum } from "@/lib/metrics";
import type { Kpi, Project } from "@/data/types";
import { useApp, useCase } from "@/store/useApp";
import { Section } from "@/components/shell/parts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/** 数字の入力。空やおかしな値は無視する */
function NumInput({ value, onChange, className, suffix }: { value: number; onChange: (n: number) => void; className?: string; suffix?: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Input
        type="number"
        inputMode="numeric"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
        className={cn("text-right tnum", className)}
      />
      {suffix && <span className="text-xs whitespace-nowrap text-muted-foreground">{suffix}</span>}
    </span>
  );
}

function Field({ label, children, note }: { label: string; children: React.ReactNode; note?: string }) {
  return (
    <label className="grid gap-1.5 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-center">
      <span className="text-[13px] font-medium">{label}</span>
      <span>
        {children}
        {note && <span className="mt-1 block text-[11px] text-muted-foreground">{note}</span>}
      </span>
    </label>
  );
}

function ProjectPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const c = useCase();
  return (
    <div className="mb-4 flex flex-wrap gap-1.5">
      {c.projects.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onChange(p.id)}
          className={cn("rounded-full border bg-card px-3 py-1 text-[13px] text-muted-foreground", value === p.id && "border-primary bg-brand-soft font-bold text-brand")}
        >
          {p.name}
          {p.status === "closed" && "（終了）"}
        </button>
      ))}
    </div>
  );
}

/* ---------------- 事業と KPI ---------------- */

const ACTUALS: { value: Kpi["actual"]; label: string }[] = [
  { value: "used", label: "利用の数" },
  { value: "received", label: "受け取った数" },
  { value: "firstTime", label: "初めて利用した数" },
  { value: "tour", label: "周遊した割合" },
  { value: "isolation", label: "孤立感（アンケート）" },
  { value: "satisfaction", label: "満足度（アンケート）" },
];

export function ProjectTab() {
  const c = useCase();
  const update = useApp((s) => s.updateProject);
  const [pid, setPid] = useState(c.projects[0].id);
  const p = c.projects.find((x) => x.id === pid) ?? c.projects[0];
  const set = (patch: Partial<Project>) => update(p.id, patch);
  const kpis = p.kpis ?? [];
  const setKpi = (i: number, patch: Partial<Kpi>) => set({ kpis: kpis.map((k, j) => (j === i ? { ...k, ...patch } : k)) });
  const items = p.funding?.items ?? [];
  const setItems = (next: [string, number][]) => set({ funding: { items: next, otherSource: p.funding?.otherSource ?? "市の一般財源" } });

  return (
    <div>
      <ProjectPicker value={p.id} onChange={setPid} />
      <div className="space-y-5">
        <Section title="事業" meta={<span className="text-xs text-muted-foreground">変えるとダッシュボード・企業の画面・報告書にすぐ反映</span>}>
          <div className="space-y-3">
            <Field label="事業名">
              <Input value={p.name} onChange={(e) => set({ name: e.target.value })} />
            </Field>
            <Field label="地域再生計画の名称" note="企業版ふるさと納税の対象事業として認定を受けた計画">
              <Input value={p.plan ?? ""} onChange={(e) => set({ plan: e.target.value })} />
            </Field>
            <Field label="事業の目標">
              <Input value={p.goal} onChange={(e) => set({ goal: e.target.value })} />
            </Field>
            <Field label="対象">
              <Input value={p.target} onChange={(e) => set({ target: e.target.value })} />
            </Field>
            <Field label="期間">
              <Input value={p.period} onChange={(e) => set({ period: e.target.value })} />
            </Field>
            <Field label="事業費" note={`按分の分母になる（いま ${yen(p.budget)}）`}>
              <NumInput value={p.budget} onChange={(n) => set({ budget: n })} suffix="円" className="w-44" />
            </Field>
            <Field label="1回あたりの金額" note="使われた金額の目安（本番は精算データの金額を使う）">
              <NumInput value={p.unitValue} onChange={(n) => set({ unitValue: n })} suffix="円" className="w-32" />
            </Field>
          </div>
        </Section>

        <Section title="KPI（地域再生計画の目標）" meta={<span className="text-xs text-muted-foreground">報告書の「目標と実績」に入る</span>} bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-[13px]">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-normal">KPI</th>
                  <th className="px-2 py-2 font-normal">単位</th>
                  <th className="px-2 py-2 font-normal">現状値</th>
                  <th className="px-2 py-2 font-normal">中間の目安</th>
                  <th className="px-2 py-2 font-normal">年度の目標</th>
                  <th className="px-2 py-2 font-normal">実績の取り方</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {kpis.map((k, i) => (
                  <tr key={i} className="border-b last:border-b-0">
                    <td className="px-4 py-2">
                      <Input value={k.name} onChange={(e) => setKpi(i, { name: e.target.value })} />
                    </td>
                    <td className="px-2 py-2">
                      <Input value={k.unit} onChange={(e) => setKpi(i, { unit: e.target.value })} className="w-16" />
                    </td>
                    <td className="px-2 py-2">
                      <NumInput value={k.base} onChange={(n) => setKpi(i, { base: n })} className="w-24" />
                    </td>
                    <td className="px-2 py-2">
                      <NumInput value={k.mid} onChange={(n) => setKpi(i, { mid: n })} className="w-24" />
                    </td>
                    <td className="px-2 py-2">
                      <NumInput value={k.target} onChange={(n) => setKpi(i, { target: n })} className="w-24" />
                    </td>
                    <td className="px-2 py-2">
                      <select
                        value={k.actual}
                        onChange={(e) => setKpi(i, { actual: e.target.value as Kpi["actual"] })}
                        className="h-8 rounded-lg border bg-transparent px-2 text-[13px]"
                      >
                        {ACTUALS.map((a) => (
                          <option key={a.value} value={a.value}>
                            {a.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button variant="ghost" size="icon-sm" aria-label="KPI を削除" onClick={() => set({ kpis: kpis.filter((_, j) => j !== i) })}>
                        <Trash2 />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t px-4 py-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => set({ kpis: [...kpis, { name: "新しい KPI", unit: "件", base: 0, mid: 0, target: 100, actual: "used" }] })}
            >
              <Plus />
              KPI を追加
            </Button>
          </div>
        </Section>

        <Section title="事業費の内訳（期末に確定）" meta={<span className="text-xs text-muted-foreground tnum">合計 {yen(sum(items.map(([, v]) => v)))}</span>} bodyClassName="p-0">
          <ul>
            {items.map(([k, v], i) => (
              <li key={i} className="flex items-center gap-2 border-b px-4 py-2 last:border-b-0">
                <Input value={k} onChange={(e) => setItems(items.map((x, j) => (j === i ? [e.target.value, x[1]] : x)))} className="flex-1" />
                <NumInput value={v} onChange={(n) => setItems(items.map((x, j) => (j === i ? [x[0], n] : x)))} suffix="円" className="w-40" />
                <Button variant="ghost" size="icon-sm" aria-label="費目を削除" onClick={() => setItems(items.filter((_, j) => j !== i))}>
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3 border-t px-4 py-3">
            <Button variant="outline" size="sm" onClick={() => setItems([...items, ["新しい費目", 0]])}>
              <Plus />
              費目を追加
            </Button>
            <span className="text-xs text-muted-foreground">ほかの財源の名前</span>
            <Input
              value={p.funding?.otherSource ?? ""}
              onChange={(e) => set({ funding: { items, otherSource: e.target.value } })}
              className="w-48"
            />
          </div>
        </Section>
      </div>
    </div>
  );
}

/* ---------------- 寄附企業 ---------------- */

export function DonorsTab() {
  const c = useCase();
  const update = useApp((s) => s.updateDonor);
  const add = useApp((s) => s.addDonor);
  const remove = useApp((s) => s.removeDonor);
  const [pid, setPid] = useState(c.projects[0].id);
  const p = c.projects.find((x) => x.id === pid) ?? c.projects[0];
  const ds = c.donors.filter((d) => d.projectId === p.id);
  const total = sum(ds.map((d) => d.amount));

  return (
    <div>
      <ProjectPicker value={p.id} onChange={setPid} />
      <Section
        title="寄附企業（企業版ふるさと納税）"
        meta={
          <span className="text-xs text-muted-foreground tnum">
            寄附の合計 {yen(total)}（事業費 {yen(p.budget)} の {pctText((total / Math.max(1, p.budget)) * 100)}）
          </span>
        }
        bodyClassName="p-0"
      >
        <p className="border-b px-4 py-2.5 text-xs text-muted-foreground">
          企業ごとの実績は「事業全体の数字 × 事業費に占める寄附の割合」で按分して出します。寄附日と金額は受領証と同じ値にしてください。
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[13px]">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-normal">企業名</th>
                <th className="px-2 py-2 font-normal">寄附日</th>
                <th className="px-2 py-2 font-normal">寄附額</th>
                <th className="px-2 py-2 text-right font-normal">事業費に占める割合</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {ds.map((d) => (
                <tr key={d.id} className="border-b last:border-b-0">
                  <td className="px-4 py-2">
                    <span className="flex items-center gap-2">
                      <Input value={d.name} onChange={(e) => update(d.id, { name: e.target.value })} />
                      {d.name === c.corp.name && <Badge variant="secondary">企業画面を利用中</Badge>}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <Input value={d.donatedOn ?? ""} onChange={(e) => update(d.id, { donatedOn: e.target.value })} className="w-36" />
                  </td>
                  <td className="px-2 py-2">
                    <NumInput value={d.amount} onChange={(n) => update(d.id, { amount: n })} suffix="円" className="w-36" />
                  </td>
                  <td className="px-2 py-2 text-right tnum">{pctText((d.amount / Math.max(1, p.budget)) * 100)}</td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="寄附を削除"
                      onClick={() => {
                        if (ds.length <= 1) return toast("事業には寄附企業が1社以上必要です");
                        remove(d.id);
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t px-4 py-3">
          <Button variant="outline" size="sm" onClick={() => add(p.id)}>
            <Plus />
            寄附を登録
          </Button>
        </div>
      </Section>
    </div>
  );
}

/* ---------------- 登録項目 ---------------- */

export function RegEditTab() {
  const c = useCase();
  const update = useApp((s) => s.updateRegField);
  const add = useApp((s) => s.addRegField);
  const remove = useApp((s) => s.removeRegField);
  return (
    <Section title="利用登録の項目" bodyClassName="p-0">
      <p className="border-b px-4 py-2.5 text-xs text-muted-foreground">
        効果の計算（属性ごとの集計）に使います。本番では e街の会員登録の項目と合わせます。企業には10件以上の区分の集計値だけが出ます。選択肢は「、」で区切って入力。
      </p>
      <ul>
        {c.reg.map((r, i) => (
          <li key={r.key} className="grid gap-2 border-b px-4 py-3 last:border-b-0 sm:grid-cols-[220px_minmax(0,1fr)_auto] sm:items-center">
            <Input value={r.label} onChange={(e) => update(i, { label: e.target.value })} aria-label="項目名" />
            {r.bands ? (
              <span className="text-xs text-muted-foreground">年齢の区分ごとの人数：{r.bands.join(" / ")}</span>
            ) : (
              <Input
                value={r.opts.join("、")}
                onChange={(e) => update(i, { opts: e.target.value.split(/[、,]/).map((x) => x.trim()).filter(Boolean) })}
                aria-label="選択肢"
              />
            )}
            <Button variant="ghost" size="icon-sm" aria-label="項目を削除" onClick={() => remove(i)} disabled={["relation", "kids", "area", "home"].includes(r.key)}>
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
      <div className="border-t px-4 py-3">
        <Button variant="outline" size="sm" onClick={add}>
          <Plus />
          項目を追加
        </Button>
        <span className="ml-3 text-xs text-muted-foreground">間柄・子の人数・地区（住まい）は集計に使うため消せません</span>
      </div>
    </Section>
  );
}
