import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Home, RotateCcw, Trophy, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TIERS, parseTier, wordsById } from "@/lib/dataset";
import { loadLastResult } from "@/lib/session";

export const Route = createFileRoute("/result")({
  component: ResultPage,
});

const KIND_LABEL = {
  judgment: "可算性の判定",
  gap: "空所補充",
  correction: "正しい形を選ぶ",
} as const;

function titleOf(difficulty: string): string {
  if (difficulty === "all") return "ランダム10問";
  if (difficulty === "review") return "間違えた語の復習";
  const tier = parseTier(difficulty);
  if (typeof tier !== "number") return difficulty;
  const info = TIERS.find((entry) => entry.id === tier);
  return info ? `${info.label} ${info.title}` : difficulty;
}

function scoreMessage(accuracy: number): string {
  if (accuracy === 100) return "全問正解です。すばらしい！";
  if (accuracy >= 80) return "よくできました。この調子で続けましょう。";
  if (accuracy >= 50) return "あと少しです。解説を読んで整理しましょう。";
  return "間違えた語を復習すると、ぐっと定着します。";
}

function ResultPage() {
  const result = loadLastResult();

  if (!result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>結果がまだありません</CardTitle>
          <CardDescription>クイズを1セット解くと、ここに結果が表示されます。</CardDescription>
        </CardHeader>
        <CardContent>
          <Button nativeButton={false} render={<Link to="/" />}>
            <Home className="size-4" aria-hidden="true" />
            ホームへ戻る
          </Button>
        </CardContent>
      </Card>
    );
  }

  const correct = result.answers.filter((answer) => answer.correct).length;
  const total = result.questions.length;
  const accuracy = total === 0 ? 0 : Math.round((correct / total) * 100);
  const wrongWordIds = [
    ...new Set(
      result.questions
        .filter((question) => {
          const answer = result.answers.find((entry) => entry.questionId === question.id);
          return answer ? !answer.correct : false;
        })
        .map((question) => question.wordId),
    ),
  ];

  return (
    <div className="space-y-6">
      <section className="space-y-3 text-center">
        <Badge variant="secondary">{titleOf(result.difficulty)}</Badge>
        <div className="flex items-baseline justify-center gap-2">
          <span className="font-heading text-5xl font-semibold tracking-tight">{correct}</span>
          <span className="text-lg text-muted-foreground">/ {total} 問正解</span>
        </div>
        <p className="text-3xl font-semibold">{accuracy}%</p>
        <p className="text-sm text-muted-foreground">{scoreMessage(accuracy)}</p>
      </section>

      <Card>
        <CardHeader className="gap-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="size-4 text-muted-foreground" aria-hidden="true" />
            問題ごとの結果
          </CardTitle>
          <CardDescription>
            間違えた語は復習リストに追加されました。正解した語も、解説で用法を確認できます。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {result.questions.map((question, index) => {
            const answer = result.answers.find((entry) => entry.questionId === question.id);
            const word = wordsById.get(question.wordId);
            const correctLabel = question.choices.find(
              (choice) => choice.id === question.answerId,
            )?.label;

            return (
              <div key={question.id}>
                {index > 0 ? <Separator className="my-2" /> : null}
                <div className="flex items-start gap-3 py-1 text-sm">
                  {answer?.correct ? (
                    <CheckCircle2
                      className="mt-0.5 size-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                  ) : (
                    <XCircle
                      className="mt-0.5 size-4 shrink-0 text-destructive"
                      aria-hidden="true"
                    />
                  )}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{word?.lemma ?? question.wordId}</span>
                      {word ? (
                        <span className="text-xs text-muted-foreground">{word.ja.join("／")}</span>
                      ) : null}
                      <Badge variant="outline" className="text-[10px]">
                        {KIND_LABEL[question.kind]}
                      </Badge>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {answer?.correct ? "正解" : <>正しい答え: {correctLabel ?? "—"}</>}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-center gap-2">
        <Button
          nativeButton={false}
          render={<Link to="/quiz/$difficulty" params={{ difficulty: result.difficulty }} />}
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          もう一度解く
        </Button>
        {wrongWordIds.length > 0 ? (
          <Button variant="outline" nativeButton={false} render={<Link to="/review" />}>
            <ArrowRight className="size-4" aria-hidden="true" />
            間違えた語を確認（{wrongWordIds.length}語）
          </Button>
        ) : null}
        <Button variant="ghost" nativeButton={false} render={<Link to="/" />}>
          <Home className="size-4" aria-hidden="true" />
          ホーム
        </Button>
      </div>
    </div>
  );
}
