import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  CornerDownLeft,
  ExternalLink,
  Lightbulb,
  RotateCcw,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { wordsById } from "@/lib/dataset";
import {
  countabilityLabel,
  isCorrect,
  type Answer,
  type Question,
  type QuestionKind,
} from "@/lib/quiz";
import {
  clearCurrentSession,
  loadCurrentSession,
  nowIso,
  saveCurrentSession,
  saveLastResult,
  type QuizMode,
} from "@/lib/session";
import { recordAnswer, recordSession } from "@/lib/storage";

const KIND_LABEL: Record<QuestionKind, string> = {
  judgment: "可算性の判定",
  gap: "空所補充",
  correction: "正しい形を選ぶ",
};

const KIND_HINT: Record<QuestionKind, string> = {
  judgment: "意味と可算性の組み合わせを考えましょう。",
  gap: "空所の前後から、much / many のどちらが合うか判断します。",
  correction: "不可算名詞に a / an や複数形を付けていないか確認します。",
};

type QuizPlayerProps = {
  questions: Question[];
  difficulty: string;
  mode: QuizMode;
  title: string;
};

export function QuizPlayer({ questions: generated, difficulty, mode, title }: QuizPlayerProps) {
  const navigate = useNavigate();
  const [restored] = useState(() => loadCurrentSession(difficulty));
  const [questions] = useState<Question[]>(() => restored?.questions ?? generated);
  const [answers, setAnswers] = useState<Answer[]>(() => restored?.answers ?? []);
  const [index, setIndex] = useState(() => {
    const value = restored?.index ?? 0;
    return Math.min(Math.max(value, 0), Math.max(questions.length - 1, 0));
  });
  const [startedAt] = useState(() => restored?.startedAt ?? nowIso());
  const finished = useRef(false);

  const total = questions.length;
  const question = questions[index];
  const answer = question ? answers.find((entry) => entry.questionId === question.id) : undefined;
  const answered = Boolean(answer);

  useEffect(() => {
    if (finished.current) return;
    if (questions.length === 0) return;
    saveCurrentSession({
      version: 1,
      difficulty,
      mode,
      questions,
      answers,
      index,
      startedAt,
    });
  }, [answers, difficulty, index, mode, questions, startedAt]);

  const finish = useCallback(
    (finalAnswers: Answer[]) => {
      if (finished.current) return;
      finished.current = true;
      recordSession({
        at: new Date().toISOString(),
        tier: difficulty,
        mode,
        correct: finalAnswers.filter((entry) => entry.correct).length,
        total: questions.length,
      });
      saveLastResult({
        version: 1,
        difficulty,
        mode,
        questions,
        answers: finalAnswers,
        finishedAt: new Date().toISOString(),
      });
      clearCurrentSession();
      void navigate({ to: "/result" });
    },
    [difficulty, mode, navigate, questions],
  );

  const next = useCallback(() => {
    if (!answered) return;
    if (index + 1 >= total) {
      finish(answers);
      return;
    }
    setIndex((value) => value + 1);
  }, [answered, answers, finish, index, total]);

  const choose = useCallback(
    (choiceId: string) => {
      if (!question || answered) return;
      const correct = isCorrect(question, choiceId);
      setAnswers((current) => [
        ...current,
        {
          questionId: question.id,
          wordId: question.wordId,
          choiceId,
          correct,
        },
      ]);
      recordAnswer(question.wordId, correct);
    },
    [answered, question],
  );

  useEffect(() => {
    if (!question) return;
    const handler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;

      if (answered) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          next();
        }
        return;
      }

      const choiceNumber = Number(event.key);
      if (
        Number.isInteger(choiceNumber) &&
        choiceNumber >= 1 &&
        choiceNumber <= question.choices.length
      ) {
        const choice = question.choices[choiceNumber - 1];
        if (choice) {
          event.preventDefault();
          choose(choice.id);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [answered, choose, next, question]);

  if (!question) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>問題を用意できませんでした</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            この条件で出題できる語がありません。ホームから別の難易度を選んでください。
          </p>
          <Button nativeButton={false} render={<Link to="/" />}>
            ホームへ戻る
          </Button>
        </CardContent>
      </Card>
    );
  }

  const correctChoice = question.choices.find((choice) => choice.id === question.answerId);
  const word = wordsById.get(question.wordId);
  const correctCount = answers.filter((entry) => entry.correct).length;
  const progress = ((index + (answered ? 1 : 0)) / total) * 100;

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{title}</Badge>
            <span className="text-muted-foreground">
              第 {index + 1} 問 / {total} 問
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              正解 {correctCount} / 回答 {answers.length}
            </span>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                clearCurrentSession();
                window.location.reload();
              }}
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              最初から
            </Button>
          </div>
        </div>
        <Progress value={progress} aria-label={`進捗 ${Math.round(progress)}%`} />
      </div>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{KIND_LABEL[question.kind]}</Badge>
            <span className="text-xs text-muted-foreground">{KIND_HINT[question.kind]}</span>
          </div>
          <CardTitle className="text-xl leading-relaxed sm:text-2xl">
            {question.kind === "judgment" ? (
              question.prompt
            ) : (
              <span className="font-normal">{question.prompt}</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {question.sentence ? (
            <p className="rounded-xl bg-muted px-4 py-5 text-lg leading-relaxed sm:text-xl">
              {question.sentence.split("___").map((part, partIndex, parts) => (
                <span key={`${part}-${partIndex}`}>
                  {part}
                  {partIndex < parts.length - 1 ? (
                    <span className="mx-1 inline-block min-w-16 border-b-2 border-primary align-middle" />
                  ) : null}
                </span>
              ))}
            </p>
          ) : null}

          <div className="grid gap-2" role="group" aria-label="選択肢">
            {question.choices.map((choice, choiceIndex) => {
              const isAnswer = choice.id === question.answerId;
              const isSelected = choice.id === answer?.choiceId;
              const showCorrect = answered && isAnswer;
              const showWrong = answered && isSelected && !isAnswer;
              return (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => choose(choice.id)}
                  disabled={answered}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-sm transition-colors sm:text-base",
                    !answered && "hover:bg-muted/70",
                    showCorrect && "border-primary bg-primary/5",
                    showWrong && "border-destructive bg-destructive/5",
                    answered && !showCorrect && !showWrong && "opacity-60",
                    answered && "disabled:opacity-100",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-full border text-xs font-semibold",
                      showCorrect && "border-primary bg-primary text-primary-foreground",
                      showWrong && "border-destructive bg-destructive text-white",
                    )}
                    aria-hidden="true"
                  >
                    {showCorrect ? (
                      <CheckCircle2 className="size-4" />
                    ) : showWrong ? (
                      <XCircle className="size-4" />
                    ) : (
                      choiceIndex + 1
                    )}
                  </span>
                  <span className="flex-1">{choice.label}</span>
                  {showCorrect ? (
                    <Badge variant="secondary">正解</Badge>
                  ) : showWrong ? (
                    <Badge variant="destructive">あなたの回答</Badge>
                  ) : null}
                </button>
              );
            })}
          </div>

          {!answered ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <CornerDownLeft className="size-3.5" aria-hidden="true" />
              キーボードの 1 / 2 / 3 でも回答できます。
            </p>
          ) : null}
        </CardContent>
      </Card>

      {answer ? (
        <div className="space-y-4" aria-live="polite">
          <div
            className={cn(
              "flex items-start gap-3 rounded-xl border p-4",
              answer.correct
                ? "border-primary/30 bg-primary/5"
                : "border-destructive/30 bg-destructive/5",
            )}
          >
            {answer.correct ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            ) : (
              <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
            )}
            <div className="space-y-1 text-sm">
              <p className="font-semibold">{answer.correct ? "正解です" : "不正解です"}</p>
              {!answer.correct && correctChoice ? (
                <p className="text-muted-foreground">
                  正しい答え:{" "}
                  <span className="font-medium text-foreground">{correctChoice.label}</span>
                </p>
              ) : null}
            </div>
          </div>

          <Card>
            <CardHeader className="gap-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="size-4 text-muted-foreground" aria-hidden="true" />
                <CardTitle className="text-base">解説</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">
                {word?.lemma ?? question.wordId} ・{" "}
                {word ? countabilityLabel(word.countability) : ""}
              </p>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="leading-relaxed">{question.explanation.note}</p>

              {question.explanation.patterns.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">使い方のパターン</p>
                  <div className="flex flex-wrap gap-2">
                    {question.explanation.patterns.map((pattern) => (
                      <Badge key={pattern} variant="outline" className="h-auto py-1 font-mono">
                        {pattern}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              {question.explanation.examples.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">例文</p>
                  <ul className="space-y-2">
                    {question.explanation.examples.map((example) => (
                      <li key={example.en} className="rounded-lg bg-muted/60 px-3 py-2">
                        <p className="font-medium">{example.en}</p>
                        <p className="text-xs text-muted-foreground">{example.ja}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <Separator />
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>出典:</span>
                {question.explanation.sources.map((source) => (
                  <a
                    key={`${source.name}-${source.url}`}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 underline underline-offset-3 hover:text-foreground"
                  >
                    {source.name} ({source.license})
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono">Enter</kbd>{" "}
              で次へ進みます。
            </p>
            <Button onClick={next}>
              {index + 1 >= total ? "結果を見る" : "次の問題へ"}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
