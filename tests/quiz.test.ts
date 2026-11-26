import { describe, expect, test } from "bun:test";

import rawWords from "../src/data/words.json";
import { buildQuiz, QUESTION_COUNT } from "../src/lib/quiz";
import { wordsSchema, type Word } from "../src/lib/schema";

const words: Word[] = wordsSchema.parse(rawWords);
const byId = new Map(words.map((word) => [word.id, word]));

describe("buildQuiz", () => {
  test("10問・語の重複なしで生成される", () => {
    const questions = buildQuiz(words, QUESTION_COUNT, 12345);
    expect(questions).toHaveLength(10);
    expect(new Set(questions.map((question) => question.id)).size).toBe(10);
    expect(new Set(questions.map((question) => question.wordId)).size).toBe(10);
  });

  test("同じシードなら同じ問題になる", () => {
    const first = buildQuiz(words, 10, 42);
    const second = buildQuiz(words, 10, 42);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  test("選択肢に正解が必ず含まれ、重複しない", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      for (const question of buildQuiz(words, 10, seed)) {
        const ids = question.choices.map((choice) => choice.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids).toContain(question.answerId);
        expect(question.choices.length).toBeGreaterThanOrEqual(2);
        expect(question.explanation.note.length).toBeGreaterThan(0);
        expect(question.explanation.sources.length).toBeGreaterThan(0);
      }
    }
  });

  test("問題構成は判定 5 問 + 空所/訂正 5 問", () => {
    for (const seed of [11, 12, 13, 14, 15, 16]) {
      const questions = buildQuiz(words, 10, seed);
      const judgment = questions.filter((question) => question.kind === "judgment").length;
      const gap = questions.filter((question) => question.kind === "gap").length;
      const correction = questions.filter((question) => question.kind === "correction").length;
      expect(judgment).toBe(5);
      expect(gap + correction).toBe(5);
      expect([3, 4]).toContain(gap);
      expect([1, 2]).toContain(correction);
    }
  });

  test("L3 の both 語は判定問題だけで出題される", () => {
    const both = words.filter((word) => word.tier === 3);
    const questions = buildQuiz(both, 10, 777);
    expect(questions).toHaveLength(10);
    for (const question of questions) {
      expect(question.kind).toBe("judgment");
    }
  });

  test("語数が10未満ならその語数だけ出題する", () => {
    const pool = words.slice(0, 3);
    expect(buildQuiz(pool, 10, 1)).toHaveLength(3);
  });

  test("直近に解いた語は後ろに回される", () => {
    const pool = words.slice(0, 10);
    const untouched = pool[0];
    if (!untouched) throw new Error("pool is empty");
    const recent = new Set(pool.slice(1).map((word) => word.id));
    const questions = buildQuiz(pool, 10, 99, recent);
    expect(questions[0]?.wordId).toBe(untouched.id);
  });

  test("空所補充の much / many が可算性と一致する", () => {
    for (const seed of [21, 22, 23, 24]) {
      for (const question of buildQuiz(words, 10, seed)) {
        if (question.kind !== "gap") continue;
        const word = byId.get(question.wordId);
        expect(word).toBeDefined();
        if (word?.countability === "uncountable") {
          expect(question.answerId).toBe("much");
          expect(question.sentence).toContain(` ${word.lemma} `);
        } else {
          expect(question.answerId).toBe("many");
        }
      }
    }
  });
});
