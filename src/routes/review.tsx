import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, RotateCcw, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { wordsById } from "@/lib/dataset";
import { countabilityLabel } from "@/lib/quiz";
import type { Word } from "@/lib/schema";
import { loadProgress, resetProgress, reviewWordIds } from "@/lib/storage";

export const Route = createFileRoute("/review")({
  component: ReviewPage,
});

function ReviewPage() {
  const [, setVersion] = useState(0);
  const progress = loadProgress();
  const mistakes = reviewWordIds(progress)
    .map((wordId) => wordsById.get(wordId))
    .filter((word): word is Word => Boolean(word))
    .sort((left, right) => left.tier - right.tier || left.lemma.localeCompare(right.lemma));

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <Badge variant="secondary">復習</Badge>
        <h1 className="font-heading text-2xl font-semibold sm:text-3xl">間違えた語のノート</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          直近の回答で間違えた語を集めています。正解すると、この一覧から外れます。
        </p>
      </section>

      {mistakes.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-primary" aria-hidden="true" />
              復習する語はありません
            </CardTitle>
            <CardDescription>
              クイズで間違えると、その語がここに追加されます。まずは1セット解いてみましょう。
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button nativeButton={false} render={<Link to="/" />}>
              難易度を選ぶ
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link to="/quiz/$difficulty" params={{ difficulty: "all" }} />}
            >
              ランダム10問
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/40 px-4 py-3">
            <p className="text-sm">
              <span className="text-xl font-semibold">{mistakes.length}</span> 語が復習対象です
            </p>
            <Button
              nativeButton={false}
              render={<Link to="/quiz/$difficulty" params={{ difficulty: "review" }} />}
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              復習を始める
            </Button>
          </div>

          <Card>
            <CardContent className="py-2">
              {mistakes.map((word, index) => (
                <div key={word.id}>
                  {index > 0 ? <Separator className="my-2" /> : null}
                  <div className="space-y-2 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-heading text-lg font-semibold">{word.lemma}</span>
                      <span className="text-sm text-muted-foreground">{word.ja.join("／")}</span>
                      <Badge variant="outline">L{word.tier}</Badge>
                      <Badge variant="secondary">{countabilityLabel(word.countability)}</Badge>
                    </div>
                    <p className="text-sm leading-relaxed">{word.note}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {word.patterns.slice(0, 4).map((pattern) => (
                        <Badge key={pattern} variant="outline" className="font-mono">
                          {pattern}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      {progress.sessions.length > 0 ? (
        <Card>
          <CardHeader className="gap-1">
            <CardTitle className="text-base">最近のセッション</CardTitle>
            <CardDescription>直近30セットまで記録しています。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {progress.sessions.slice(0, 5).map((session) => (
              <div
                key={`${session.at}-${session.tier}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2"
              >
                <span className="text-xs text-muted-foreground">
                  {new Date(session.at).toLocaleString("ja-JP")}・{sessionLabel(session.tier)}
                </span>
                <span className="font-medium">
                  {session.correct} / {session.total} 問
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (!window.confirm("学習履歴をすべて削除します。よろしいですか？")) return;
            resetProgress();
            setVersion((value) => value + 1);
          }}
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
          学習履歴をリセット
        </Button>
      </div>
    </div>
  );
}

function sessionLabel(tier: string): string {
  if (tier === "all") return "ランダム";
  if (tier === "review") return "復習";
  return tier;
}
