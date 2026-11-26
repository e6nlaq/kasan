import { createFileRoute, Link } from "@tanstack/react-router";
import { Database, ExternalLink, Scale } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { datasetMeta } from "@/lib/dataset";

export const Route = createFileRoute("/licenses")({
  component: LicensesPage,
});

const LICENSE_LINKS: Record<string, string> = {
  "CC BY-SA 4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
  "CC0 1.0": "https://creativecommons.org/publicdomain/zero/1.0/",
  MIT: "https://opensource.org/license/mit",
};

function LicensesPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <Badge variant="secondary">ライセンス</Badge>
        <h1 className="font-heading text-2xl font-semibold sm:text-3xl">
          データの出典とライセンス
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          このサイトの語彙データは、寛容なライセンスで公開されているウィキメディアのデータをもとにしています。
          各語の解説には、参照したページへのリンクを表示しています。
        </p>
      </section>

      <Card>
        <CardHeader className="gap-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="size-4 text-muted-foreground" aria-hidden="true" />
            収録データ
          </CardTitle>
          <CardDescription>
            全 {datasetMeta.counts.total} 語（L1 {datasetMeta.counts.L1} / L2{" "}
            {datasetMeta.counts.L2} / L3 {datasetMeta.counts.L3} / L4 {datasetMeta.counts.L4}）
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-3">
          <div className="rounded-lg bg-muted/50 px-3 py-2">
            <p className="text-xs text-muted-foreground">可算名詞</p>
            <p className="font-medium">{datasetMeta.counts.countable} 語</p>
          </div>
          <div className="rounded-lg bg-muted/50 px-3 py-2">
            <p className="text-xs text-muted-foreground">不可算名詞</p>
            <p className="font-medium">{datasetMeta.counts.uncountable} 語</p>
          </div>
          <div className="rounded-lg bg-muted/50 px-3 py-2">
            <p className="text-xs text-muted-foreground">両方の用法</p>
            <p className="font-medium">{datasetMeta.counts.both} 語</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {datasetMeta.sources.map((source) => (
          <Card key={source.name}>
            <CardHeader className="gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">{source.name}</CardTitle>
                <Badge variant="outline">{source.license}</Badge>
              </div>
              <CardDescription>{source.note}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3 text-xs">
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 underline underline-offset-3 hover:text-foreground"
              >
                {source.url}
                <ExternalLink className="size-3" aria-hidden="true" />
              </a>
              {LICENSE_LINKS[source.license] ? (
                <a
                  href={LICENSE_LINKS[source.license]}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 underline underline-offset-3 hover:text-foreground"
                >
                  ライセンス全文
                  <ExternalLink className="size-3" aria-hidden="true" />
                </a>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="gap-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="size-4 text-muted-foreground" aria-hidden="true" />
            解説文とクイズについて
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            日本語の解説、例文、クイズの問題文は、このプロジェクトのために独自に作成したものです。
            Wiktionary の定義文をそのまま転載しているわけではありませんが、語義の判定には Wiktionary
            の 見出し語テンプレートとラベルを参照しています。
          </p>
          <p>
            Wiktionary の内容は CC BY-SA 4.0、Wikidata のラベルは CC0 1.0、FrequencyWords
            の頻度リストは MIT
            ライセンスで提供されています。各ライセンスの条件に従い、出典を明示しています。
          </p>
          <p>データの生成日時: {new Date(datasetMeta.generatedAt).toLocaleString("ja-JP")}</p>
        </CardContent>
      </Card>

      <div className="text-center text-sm">
        <Link to="/about" className="underline underline-offset-3 hover:text-foreground">
          このサイトについて
        </Link>
      </div>
    </div>
  );
}
