import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpenCheck, Layers, RotateCcw, Sparkles, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { datasetMeta, TIERS, tierCount } from "@/lib/dataset";
import { overallStats, reviewWordIds } from "@/lib/storage";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const progress = overallStats();
  const mistakes = reviewWordIds().length;
  const accuracy = progress.accuracy;

  return (
    <div className="space-y-10">
      <section className="space-y-5">
        <Badge variant="secondary">英語 × 日本語</Badge>
        <div className="space-y-4">
          <h1 className="font-heading text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
            数えられる？
            <br className="sm:hidden" />
            数えられない？
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            日本語では自然に数えられるものでも、英語では不可算名詞として扱う語がたくさんあります。
            難易度別の短いクイズで、可算・不可算の感覚を身につけましょう。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            nativeButton={false}
            render={<Link to="/quiz/$difficulty" params={{ difficulty: "all" }} />}
          >
            <Sparkles className="size-4" aria-hidden="true" />
            ランダムに10問解く
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link to="/review" />}>
            <RotateCcw className="size-4" aria-hidden="true" />
            間違えた語を復習
            {mistakes > 0 ? <Badge variant="secondary">{mistakes}</Badge> : null}
          </Button>
        </div>
      </section>

      <section aria-labelledby="tiers-heading" className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id="tiers-heading" className="font-heading text-xl font-semibold">
              難易度を選ぶ
            </h2>
            <p className="text-sm text-muted-foreground">
              日本語との距離が近い順に、4つのレベルを用意しています。
            </p>
          </div>
          <Badge variant="outline">全 {datasetMeta.counts.total} 語</Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {TIERS.map((tier) => (
            <Link
              key={tier.id}
              to="/quiz/$difficulty"
              params={{ difficulty: `L${tier.id}` }}
              className="group rounded-2xl focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <Card className="h-full transition-colors group-hover:bg-muted/40">
                <CardHeader className="gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <Badge>{tier.label}</Badge>
                    <span className="text-xs text-muted-foreground">{tierCount(tier.id)} 語</span>
                  </div>
                  <CardTitle className="text-base">{tier.title}</CardTitle>
                  <CardDescription className="leading-relaxed">{tier.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground">
                    このレベルを始める
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="stats-heading" className="space-y-4">
        <h2 id="stats-heading" className="font-heading text-xl font-semibold">
          学習の記録
        </h2>
        <Card>
          <CardHeader className="gap-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="size-4 text-muted-foreground" aria-hidden="true" />
              これまでの成績
            </CardTitle>
            <CardDescription>
              記録はこのブラウザにだけ保存されます。サーバーには送信しません。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-muted/60 px-2 py-3">
                <p className="text-2xl font-semibold">{progress.studiedWords}</p>
                <p className="text-xs text-muted-foreground">学習した語</p>
              </div>
              <div className="rounded-xl bg-muted/60 px-2 py-3">
                <p className="text-2xl font-semibold">{progress.attempts}</p>
                <p className="text-xs text-muted-foreground">回答数</p>
              </div>
              <div className="rounded-xl bg-muted/60 px-2 py-3">
                <p className="text-2xl font-semibold">{accuracy}%</p>
                <p className="text-xs text-muted-foreground">正答率</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>正答率</span>
                <span>{accuracy}%</span>
              </div>
              <Progress value={accuracy} aria-label={`正答率 ${accuracy}%`} />
            </div>
            {progress.attempts === 0 ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <BookOpenCheck className="size-3.5" aria-hidden="true" />
                まずは L1 から1セット解いてみましょう。
              </p>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="tips-heading" className="space-y-4">
        <h2 id="tips-heading" className="font-heading text-xl font-semibold">
          見分けのヒント
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Card size="sm">
            <CardHeader className="gap-1">
              <Layers className="size-4 text-muted-foreground" aria-hidden="true" />
              <CardTitle className="text-sm">数を数える単位を想像する</CardTitle>
              <CardDescription className="leading-relaxed">
                a piece of / a bottle of のように、容器や単位が必要なら不可算の可能性が高いです。
              </CardDescription>
            </CardHeader>
          </Card>
          <Card size="sm">
            <CardHeader className="gap-1">
              <BookOpenCheck className="size-4 text-muted-foreground" aria-hidden="true" />
              <CardTitle className="text-sm">a / an を付けてみる</CardTitle>
              <CardDescription className="leading-relaxed">
                a furniture とは言えません。a / an が自然に付くなら可算名詞です。
              </CardDescription>
            </CardHeader>
          </Card>
          <Card size="sm">
            <CardHeader className="gap-1">
              <Target className="size-4 text-muted-foreground" aria-hidden="true" />
              <CardTitle className="text-sm">意味によって変わる</CardTitle>
              <CardDescription className="leading-relaxed">
                paper は「紙」なら不可算、「新聞」なら可算。L3 ではこの違いを練習します。
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>
    </div>
  );
}
