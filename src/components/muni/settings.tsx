"use client";

import { ArrowDown, ArrowUp, Lock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { yen } from "@/lib/format";
import type { QuestionType } from "@/data/types";
import { useApp, useCase, type CorpShow } from "@/store/useApp";
import { PageHeader, Section } from "@/components/shell/parts";
import { DonorsTab, ProjectTab, RegEditTab } from "./settings/master-tabs";
import { GiftPhoto } from "@/components/gift/gift-photo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TYPES: { value: QuestionType; label: string }[] = [
  { value: "scale", label: "5段階" },
  { value: "choice", label: "1つ選ぶ" },
  { value: "multi", label: "複数選ぶ" },
  { value: "text", label: "自由記述" },
  { value: "yen", label: "金額（円）" },
];

/** 設問のひな形（出典つき）。指標の調査結果で増やす */
const TEMPLATES: Record<string, { text: string; type: QuestionType; opts?: string[]; source: string; note?: string }[]> = {
  子育て: [
    {
      text: "子育てをする上で「仕事や自分のことが十分にできない」と感じるか",
      type: "choice",
      opts: ["そう思う", "ややそう思う", "あまりそう思わない", "そうは思わない"],
      source: "SIMI p.19 育児負担の軽減（問18-4）",
      note: "登録時と利用後の差を見る",
    },
    { text: "「自分の自由になる時間」についての満足度", type: "choice", opts: ["満足している", "まあ満足している", "やや不満である", "不満である"], source: "SIMI p.19 問40" },
    { text: "子育て中に孤立感を感じることがあるか", type: "choice", opts: ["よくある", "ときどきある", "たまにある", "めったにない"], source: "SIMI p.21 親の孤独感の軽減" },
    {
      text: "お子さんの子育て（教育を含む）をする上で、気軽に相談できる人はいますか。また、相談できる場所はありますか。",
      type: "choice",
      opts: ["いる/ある", "いない/ない"],
      source: "SIMI p.9 問13",
    },
    {
      text: "あなたは、子どもを育てている現在の生活に、満足していますか。",
      type: "choice",
      opts: ["満足している", "どちらかと言えば満足している", "どちらとも言えない", "どちらかと言えば満足していない", "満足していない"],
      source: "SIMI p.23 親が安心して子育てができる",
    },
  ],
  観光: [
    { text: "この旅行でギフト以外に払った金額（1人あたり・実際に払った分）", type: "yen", source: "交付金の効果検証・DMO手引書 p.11", note: "予定は含めない（会計検査院の指摘）" },
    { text: "さっぽろ圏への来訪は初めてか", type: "choice", opts: ["初めて", "2回目以上"], source: "DMO手引書 p.8 リピーター率" },
    { text: "ほかに立ち寄った市町村", type: "multi", opts: ["札幌市", "小樽市", "江別市", "恵庭市", "千歳市", "その他"], source: "DMO手引書 p.9 平均訪問地点数" },
  ],
};

export function Settings() {
  const c = useCase();
  return (
    <div>
      <PageHeader eyebrow={c.muni} title="設定" sub="変えた内容は、スマホと企業の画面にすぐ反映されます" />
      <Tabs defaultValue="survey">
        <TabsList variant="line" className="mb-5 w-full justify-start overflow-x-auto border-b">
          <TabsTrigger value="survey" className="flex-none px-3">アンケート</TabsTrigger>
          <TabsTrigger value="corp" className="flex-none px-3">企業に見せる項目</TabsTrigger>
          <TabsTrigger value="project" className="flex-none px-3">事業と KPI</TabsTrigger>
          <TabsTrigger value="donors" className="flex-none px-3">寄附企業</TabsTrigger>
          <TabsTrigger value="reg" className="flex-none px-3">登録項目</TabsTrigger>
          <TabsTrigger value="gifts" className="flex-none px-3">クーポン一覧</TabsTrigger>
          <TabsTrigger value="auth" className="flex-none px-3">権限</TabsTrigger>
        </TabsList>
        <TabsContent value="survey">
          <SurveyTab />
        </TabsContent>
        <TabsContent value="corp">
          <CorpTab />
        </TabsContent>
        <TabsContent value="project">
          <ProjectTab />
        </TabsContent>
        <TabsContent value="donors">
          <DonorsTab />
        </TabsContent>
        <TabsContent value="reg">
          <RegEditTab />
        </TabsContent>
        <TabsContent value="gifts">
          <GiftsTab />
        </TabsContent>
        <TabsContent value="auth">
          <AuthTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- アンケート ---------------- */

function SurveyTab() {
  const c = useCase();
  const update = useApp((s) => s.updateQuestion);
  const add = useApp((s) => s.addQuestion);
  const remove = useApp((s) => s.removeQuestion);
  const move = useApp((s) => s.moveQuestion);
  const tmpl = TEMPLATES[c.kind];

  return (
    <div className="space-y-5">
      <Section title="設問" meta={<span className="text-xs text-muted-foreground">スイッチ＝企業の報告書に集計を入れる</span>} bodyClassName="p-0">
        <p className="border-b px-5 py-2.5 text-xs text-muted-foreground">
          <Lock className="mr-1 inline size-3" />
          の設問（満足度・なかったら利用したか・ひとこと）は、ほかの事業と比べるための共通設問で外せません。
        </p>
        <ol>
          {c.questions.map((q, i) => (
            <li key={q.id} className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 border-b px-5 py-3 last:border-b-0 md:grid-cols-[28px_minmax(0,1fr)_130px_auto_auto]">
              <span className="text-xs text-muted-foreground tnum">Q{i + 1}</span>
              <Input value={q.text} disabled={q.locked} onChange={(e) => update(q.id, { text: e.target.value })} aria-label={`Q${i + 1}の設問文`} />
              <div className="col-start-2 md:col-start-auto">
                <Select items={TYPES} value={q.type} disabled={q.locked} onValueChange={(v) => v && update(q.id, { type: v as QuestionType })}>
                  <SelectTrigger className="w-full" aria-label="形式">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <label className="col-start-2 flex items-center gap-2 text-xs text-muted-foreground md:col-start-auto">
                <Switch checked={q.share} onCheckedChange={(v) => update(q.id, { share: v })} aria-label="企業の報告書に入れる" />
                <span className="md:hidden">企業の報告書に入れる</span>
              </label>
              <div className="col-start-2 flex items-center gap-1 md:col-start-auto">
                {q.locked ? (
                  <Badge variant="secondary">
                    <Lock />
                    共通
                  </Badge>
                ) : (
                  <>
                    <Button variant="ghost" size="icon-sm" aria-label="上へ" onClick={() => move(q.id, -1)}>
                      <ArrowUp />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label="下へ" onClick={() => move(q.id, 1)}>
                      <ArrowDown />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="削除"
                      onClick={() => {
                        remove(q.id);
                        toast("設問を削除しました。スマホのアンケートに反映されます");
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ol>
        <div className="border-t px-5 py-3">
          <Button variant="outline" size="sm" onClick={() => add({ text: "新しい設問", type: "choice", opts: ["はい", "いいえ"], share: true })}>
            <Plus />
            設問を追加
          </Button>
        </div>
      </Section>

      <Section title="ひな形から追加" meta={<span className="text-xs text-muted-foreground">出典の文言どおり。そろえるとほかの地域と比べられます</span>} bodyClassName="p-0">
        <ul>
          {tmpl.map((t) => (
            <li key={t.text} className="flex flex-wrap items-center gap-3 border-b px-5 py-3 last:border-b-0">
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium">{t.text}</span>
                <span className="text-xs text-muted-foreground">
                  {TYPES.find((x) => x.value === t.type)?.label}・出典：{t.source}
                  {t.note && `・${t.note}`}
                </span>
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={c.questions.some((q) => q.text === t.text)}
                onClick={() => {
                  add({ text: t.text, type: t.type, opts: t.opts, share: true });
                  toast("設問を追加しました。スマホのアンケートに反映されます");
                }}
              >
                {c.questions.some((q) => q.text === t.text) ? "追加済み" : "追加"}
              </Button>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

/* ---------------- 企業に見せる項目 ---------------- */

const CORP_ITEMS: { k: keyof CorpShow; label: string; sub?: string; indent?: boolean }[] = [
  { k: "voices", label: "受け取った人の声", sub: "公開に同意したものだけ" },
  { k: "cards", label: "数字のカード" },
  { k: "amount", label: "寄附額", indent: true },
  { k: "households", label: "届いた数", indent: true },
  { k: "userate", label: "利用率", indent: true },
  { k: "places", label: "使われた場所", sub: "1日1回更新。10件未満は「その他」" },
  { k: "report", label: "報告書（中間・期末）" },
];

function CorpTab() {
  const show = useApp((s) => s.corpShow);
  const set = useApp((s) => s.setCorpShow);
  return (
    <Section title="寄附企業の画面に出す項目" bodyClassName="p-0">
      <p className="border-b px-5 py-2.5 text-xs text-muted-foreground">
        事業ごとに自治体と企業ですり合わせて決めます。個票・10件未満の区分・店ごとの地図は、設定に関わらず出しません。リアルタイムの数字が要らない企業は「数字のカード」をオフにすると、声と報告書だけになります。
      </p>
      <ul>
        {CORP_ITEMS.map((it) => (
          <li key={it.k} className="flex items-center justify-between gap-3 border-b px-5 py-3 last:border-b-0">
            <span className={it.indent ? "pl-5 text-[13px] text-muted-foreground" : "text-[13px] font-medium"}>
              {it.label}
              {it.sub && <span className="ml-2 text-xs font-normal text-muted-foreground">{it.sub}</span>}
            </span>
            <Switch
              checked={show[it.k]}
              disabled={it.indent && !show.cards}
              onCheckedChange={(v) => {
                set(it.k, v);
                toast(v ? "企業の画面に表示します" : "企業の画面から外しました");
              }}
              aria-label={it.label}
            />
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* ---------------- 登録項目 ---------------- */

/* ---------------- 事業・ギフト ---------------- */

function GiftsTab() {
  const c = useCase();
  return (
    <div className="space-y-5">
      {c.projects.map((p) => (
        <Section
          key={p.id}
          title={
            <span className="flex items-center gap-2">
              {p.name}
              {p.status === "closed" && <Badge variant="secondary">終了</Badge>}
            </span>
          }
          meta={<span className="text-xs text-muted-foreground">{p.period}</span>}
          bodyClassName="p-0"
        >
          <p className="border-b px-5 py-2.5 text-xs text-muted-foreground">
            事業目標：{p.goal}　対象：{p.target}
            <br />
            企業への報告：寄附の割合で按分（標準）。自治体と企業が合意した場合は、企業ごとにクーポン（券種）を分けて、その実績を出すこともできる。
          </p>
          <ul>
            {c.donors
              .filter((d) => d.projectId === p.id)
              .map((d) => (
                <li key={d.id} className="flex items-center gap-3 border-b px-5 py-2.5 last:border-b-0">
                  <GiftPhoto id={d.photo} className="size-11 shrink-0 rounded-md" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium">{d.giftName}</span>
                    <span className="text-xs text-muted-foreground">{d.name}</span>
                  </span>
                  <span className="text-[13px] tnum">{yen(d.amount)}</span>
                </li>
              ))}
          </ul>
        </Section>
      ))}
    </div>
  );
}

/* ---------------- 権限 ---------------- */

function AuthTab() {
  const c = useCase();
  const rows =
    c.kind === "子育て"
      ? [
          ["こども家庭課（担当）", "閲覧・設定・報告書"],
          ["企画課", "閲覧・報告書"],
          ["ギフティ運用担当", "個票は運用に必要な範囲のみ"],
        ]
      : [
          ["観光機構 事務局（担当）", "閲覧・設定・報告書"],
          ["構成市町村の観光課", "自市町村の閲覧"],
          ["ギフティ運用担当", "個票は運用に必要な範囲のみ"],
        ];
  return (
    <Section title="見られる人" bodyClassName="p-0">
      <ul>
        {rows.map(([who, what]) => (
          <li key={who} className="flex items-center justify-between gap-3 border-b px-5 py-3 text-[13px] last:border-b-0">
            <span className="font-medium">{who}</span>
            <span className="text-muted-foreground">{what}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}
