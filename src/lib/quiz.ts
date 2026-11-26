import type { Countability, Word } from "./schema";

export type Choice = { id: string; label: string };

export type QuestionKind = "judgment" | "gap" | "correction";

export type Explanation = {
  note: string;
  patterns: string[];
  examples: { en: string; ja: string }[];
  sources: Word["sources"];
};

export type Question = {
  id: string;
  kind: QuestionKind;
  wordId: string;
  prompt: string;
  sentence?: string;
  choices: Choice[];
  answerId: string;
  explanation: Explanation;
};

export type Answer = {
  questionId: string;
  wordId: string;
  choiceId: string;
  correct: boolean;
};

export const QUESTION_COUNT = 10;

const COUNTABILITY_CHOICES: Choice[] = [
  { id: "countable", label: "可算名詞（a / an を付けられる）" },
  { id: "uncountable", label: "不可算名詞（some / a lot of を使う）" },
  { id: "both", label: "両方の用法がある" },
];

/** 空所補充の枠に収まりにくい語（集合名詞・学問名など）。 */
const GAP_UNSAFE = new Set([
  "police",
  "cattle",
  "personnel",
  "staff",
  "mathematics",
  "physics",
  "economics",
  "politics",
  "news",
  "weather",
  "traffic",
  "scenery",
  "accommodation",
  "clothing",
  "footwear",
  "underwear",
  "bedding",
  "postage",
  "freight",
]);

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    const current = copy[index];
    const target = copy[swapIndex];
    if (current === undefined || target === undefined) continue;
    copy[index] = target;
    copy[swapIndex] = current;
  }
  return copy;
}

function article(lemma: string): string {
  const lower = lemma.toLowerCase();
  if (/^(hour|honest|honor|honour|heir)/.test(lower)) return "an";
  if (/^(uni|use|usu|eu|one|once|ewe|ufo)/.test(lower)) return "a";
  return /^[aeiou]/.test(lower) ? "an" : "a";
}

function pluralOf(word: Word): string {
  return word.plural ?? `${word.lemma}s`;
}

function explanationFor(word: Word): Explanation {
  return {
    note: word.note,
    patterns: word.patterns,
    examples: word.examples,
    sources: word.sources,
  };
}

function judgmentQuestion(word: Word, rng: () => number, index: number): Question {
  const useSense = word.countability === "both" && (word.senses?.length ?? 0) > 0 && rng() < 0.5;

  if (useSense && word.senses) {
    const sense = word.senses[Math.floor(rng() * word.senses.length)];
    if (sense) {
      return {
        id: `${word.id}:judgment:${index}`,
        kind: "judgment",
        wordId: word.id,
        prompt: `「${sense.ja}」という意味の ${word.lemma} は、どう使いますか？`,
        choices: shuffle(COUNTABILITY_CHOICES, rng),
        answerId: sense.countability,
        explanation: explanationFor(word),
      };
    }
  }

  return {
    id: `${word.id}:judgment:${index}`,
    kind: "judgment",
    wordId: word.id,
    prompt: `「${word.ja.join("／")}」を英語で使うとき、可算名詞ですか？`,
    choices: shuffle(COUNTABILITY_CHOICES, rng),
    answerId: word.countability,
    explanation: explanationFor(word),
  };
}

function gapQuestion(word: Word, rng: () => number, index: number): Question {
  if (word.countability === "uncountable") {
    return {
      id: `${word.id}:gap:${index}`,
      kind: "gap",
      wordId: word.id,
      prompt: "空所に入る語を選んでください。",
      sentence: `How ___ ${word.lemma} do you need?`,
      choices: shuffle(
        [
          { id: "much", label: "much" },
          { id: "many", label: "many" },
          { id: "few", label: "a few" },
        ],
        rng,
      ),
      answerId: "much",
      explanation: explanationFor(word),
    };
  }

  return {
    id: `${word.id}:gap:${index}`,
    kind: "gap",
    wordId: word.id,
    prompt: "空所に入る語を選んでください。",
    sentence: `How ___ ${pluralOf(word)} do you need?`,
    choices: shuffle(
      [
        { id: "much", label: "much" },
        { id: "many", label: "many" },
        { id: "little", label: "a little" },
      ],
      rng,
    ),
    answerId: "many",
    explanation: explanationFor(word),
  };
}

function correctionQuestion(word: Word, rng: () => number, index: number): Question {
  if (word.countability === "uncountable") {
    return {
      id: `${word.id}:correction:${index}`,
      kind: "correction",
      wordId: word.id,
      prompt: "正しい形を選んでください。",
      choices: shuffle(
        [
          { id: "correct", label: `some ${word.lemma}` },
          { id: "article", label: `${article(word.lemma)} ${word.lemma}` },
          { id: "many", label: `many ${word.lemma}` },
        ],
        rng,
      ),
      answerId: "correct",
      explanation: explanationFor(word),
    };
  }

  const plural = pluralOf(word);
  return {
    id: `${word.id}:correction:${index}`,
    kind: "correction",
    wordId: word.id,
    prompt: "正しい形を選んでください。",
    choices: shuffle(
      [
        { id: "correct", label: `${article(word.lemma)} ${word.lemma}` },
        { id: "much", label: `much ${plural}` },
        { id: "many", label: `many ${word.lemma}` },
      ],
      rng,
    ),
    answerId: "correct",
    explanation: explanationFor(word),
  };
}

function supports(word: Word, kind: QuestionKind): boolean {
  if (kind === "judgment") return true;
  if (word.countability === "both") return false;
  if (GAP_UNSAFE.has(word.id)) return false;
  return true;
}

function slotsFor(count: number, rng: () => number): QuestionKind[] {
  const judgment = Math.round(count * 0.5);
  const gapBase = Math.floor(count * 0.35);
  const correctionBase = Math.max(0, count - judgment - gapBase);
  // 10問では 5 / 3.5 / 1.5 が理想。端数はセッションごとに交互へ振る。
  const moveToGap = gapBase + 1 <= count - judgment && correctionBase > 0 && rng() < 0.5;
  const gap = moveToGap ? gapBase + 1 : gapBase;
  const correction = Math.max(0, count - judgment - gap);
  return [
    ...Array<QuestionKind>(judgment).fill("judgment"),
    ...Array<QuestionKind>(gap).fill("gap"),
    ...Array<QuestionKind>(correction).fill("correction"),
  ];
}

export function buildQuiz(
  pool: readonly Word[],
  count: number,
  seed: number,
  recentIds: ReadonlySet<string> = new Set(),
): Question[] {
  const rng = mulberry32(seed);
  const shuffledPool = shuffle(pool, rng);
  const orderedPool = [
    ...shuffledPool.filter((word) => !recentIds.has(word.id)),
    ...shuffledPool.filter((word) => recentIds.has(word.id)),
  ];
  const slots = shuffle(slotsFor(count, rng), rng);
  const used = new Set<string>();
  const questions: Question[] = [];

  for (const kind of slots) {
    const candidate =
      orderedPool.find((word) => !used.has(word.id) && supports(word, kind)) ??
      orderedPool.find((word) => !used.has(word.id));

    if (!candidate) break;
    used.add(candidate.id);

    if (kind === "gap" && supports(candidate, "gap")) {
      questions.push(gapQuestion(candidate, rng, questions.length));
    } else if (kind === "correction" && supports(candidate, "correction")) {
      questions.push(correctionQuestion(candidate, rng, questions.length));
    } else {
      questions.push(judgmentQuestion(candidate, rng, questions.length));
    }
  }

  return questions;
}

export function isCorrect(question: Question, choiceId: string): boolean {
  return question.answerId === choiceId;
}

export function countCorrect(answers: readonly Answer[]): number {
  return answers.filter((answer) => answer.correct).length;
}

export function countabilityLabel(value: Countability): string {
  if (value === "countable") return "可算名詞";
  if (value === "uncountable") return "不可算名詞";
  return "可算・不可算の両方";
}
