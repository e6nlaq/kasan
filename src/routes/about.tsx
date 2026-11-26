import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpenCheck, Keyboard, ShieldCheck, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TIERS } from "@/lib/dataset";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

const KIND_ROWS = [
  {
    label: "可算性の判定",
    ratio: "50%",
    detail: "語の意味と可算性の組み合わせを選びます。L3 では語義ごとに考えます。",
  },
  {
    label: "空所補充",
    ratio: "35%",
    detail: "much / many など、空所に入る語を選びます。",
  },
  {
    label: "正しい形を選ぶ",
    ratio: "15%",
    detail: "a / an や複数形が付いた誤りの中から、正しい形を選びます。",
  },
];

function AboutPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <Badge variant="secondary">このサイトについて</Badge>
        <h1 className="font-heading text-2xl font-semibold sm:text-3xl">
          日本語話者のための可算・不可算クイズ
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          英語の名詞が「数えられるか」は、日本語の感覚だけでは判断しにくいことがあります。
          このサイトでは、日本語との距離を基準に語を4つのレベルに分け、短いクイズで確認できるようにしました。
        </p>
      </section>

      <Card>
        <CardHeader className="gap-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-muted-foreground" aria-hidden="true" />
            難易度の考え方
          </CardTitle>
          <CardDescription>上から順に、日本語話者にとって難しい語になります。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {TIERS.map((tier, index) => (
            <div key={tier.id}>
              {index > 0 ? <Separator className="mb-3" /> : null}
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{tier.label}</Badge>
                <span className="font-medium">{tier.title}</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {tier.description}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpenCheck className="size-4 text-muted-foreground" aria-hidden="true" />
            出題の構成
          </CardTitle>
          <CardDescription>1セット10問。同じ語は1回だけ出題されます。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {KIND_ROWS.map((row) => (
            <div key={row.label} className="flex items-start gap-3 text-sm">
              <Badge variant="outline" className="shrink-0 font-mono">
                {row.ratio}
              </Badge>
              <div>
                <p className="font-medium">{row.label}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{row.detail}</p>
              </div>
            </div>
          ))}
          <p className="text-xs leading-relaxed text-muted-foreground">
            語の数が10未満の復習セットでは、問題数がその語数になります。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Keyboard className="size-4 text-muted-foreground" aria-hidden="true" />
            操作と記録
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            選択肢は <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono">1</kbd> /{" "}
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono">2</kbd> /{" "}
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono">3</kbd>{" "}
            でも選べます。回答後は{" "}
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono">Enter</kbd>{" "}
            で次の問題へ進みます。正誤は色だけでなく、アイコンと文字でも表示します。
          </p>
          <p>
            学習履歴はブラウザの localStorage
            にのみ保存されます。アカウント登録やサーバーへの送信はありません。
            同じブラウザで続けると、間違えた語が復習リストにたまります。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4 text-muted-foreground" aria-hidden="true" />
            データと注意事項
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            語の選定には英語版 Wiktionary の見出し語とラベル、Wikidata の日本語ラベル、
            および頻度リストを用いています。自動収録した語には、文脈によって可算性が変わりうるものも含まれます。
          </p>
          <p>
            イギリス英語とアメリカ英語で用法が異なる場合があります（例: accommodation）。
            解説は代表的な用法を優先しており、専門分野や慣用表現のすべてを網羅するものではありません。
          </p>
          <p>
            出典とライセンスの詳細は{" "}
            <Link to="/licenses" className="underline underline-offset-3 hover:text-foreground">
              ライセンスページ
            </Link>{" "}
            をご覧ください。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
