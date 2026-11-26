import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, RotateCcw } from "lucide-react";

import { QuizPlayer } from "@/components/quiz-player";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TIERS, parseTier, words, wordsById, wordsOfTier } from "@/lib/dataset";
import { QUESTION_COUNT, buildQuiz } from "@/lib/quiz";
import type { QuizMode } from "@/lib/session";
import type { Word } from "@/lib/schema";
import { recentWordIds, reviewWordIds } from "@/lib/storage";

export const Route = createFileRoute("/quiz/$difficulty")({
  component: QuizRoute,
});

type QuizConfig = {
  mode: QuizMode;
  pool: Word[];
  title: string;
};

function resolveConfig(difficulty: string): QuizConfig | null {
  if (difficulty === "all") {
    return { mode: "random", pool: words, title: "ランダム10問" };
  }
  if (difficulty === "review") {
    const pool = reviewWordIds()
      .map((wordId) => wordsById.get(wordId))
      .filter((word): word is Word => Boolean(word));
    return { mode: "review", pool, title: "間違えた語の復習" };
  }
  const tier = parseTier(difficulty);
  if (typeof tier !== "number") return null;
  const tierInfo = TIERS.find((entry) => entry.id === tier);
  if (!tierInfo) return null;
  return {
    mode: "tier",
    pool: wordsOfTier(tier),
    title: `${tierInfo.label} ${tierInfo.title}`,
  };
}

function QuizRoute() {
  const { difficulty } = Route.useParams();
  const config = useMemo(() => resolveConfig(difficulty), [difficulty]);
  const [seed] = useState(() => Math.floor(Math.random() * 0xffffffff));

  const questions = useMemo(() => {
    if (!config || config.pool.length === 0) return [];
    const count = Math.min(QUESTION_COUNT, config.pool.length);
    return buildQuiz(config.pool, count, seed, recentWordIds());
  }, [config, seed]);

  if (!config) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="size-5 text-muted-foreground" aria-hidden="true" />
            難易度が正しくありません
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            URL の難易度は L1〜L4、all、review のいずれかを指定してください。
          </p>
          <Button nativeButton={false} render={<Link to="/" />}>
            ホームへ戻る
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (config.pool.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="size-5 text-muted-foreground" aria-hidden="true" />
            復習する語がまだありません
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            クイズで間違えた語がここに集まります。まずは難易度別のクイズを解いてみましょう。
          </p>
          <div className="flex flex-wrap gap-2">
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
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <QuizPlayer
      key={difficulty}
      questions={questions}
      difficulty={difficulty}
      mode={config.mode}
      title={config.title}
    />
  );
}
