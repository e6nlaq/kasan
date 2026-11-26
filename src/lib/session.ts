import type { Answer, Question } from "./quiz";

export type QuizMode = "tier" | "random" | "review";

export type SavedSession = {
  version: 1;
  difficulty: string;
  mode: QuizMode;
  questions: Question[];
  answers: Answer[];
  index: number;
  startedAt: string;
};

export type QuizResult = {
  version: 1;
  difficulty: string;
  mode: QuizMode;
  questions: Question[];
  answers: Answer[];
  finishedAt: string;
};

const CURRENT_KEY = "kasan:current-session:v1";
const LAST_RESULT_KEY = "kasan:last-result:v1";

function readJson<T>(key: string, storage: Storage): T | null {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown, storage: Storage): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // 保存できなくても回答は続けられるようにする。
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function loadCurrentSession(difficulty: string): SavedSession | null {
  if (typeof window === "undefined") return null;
  const saved = readJson<SavedSession>(CURRENT_KEY, window.sessionStorage);
  if (!saved || saved.version !== 1 || saved.difficulty !== difficulty) return null;
  if (!Array.isArray(saved.questions) || saved.questions.length === 0) return null;
  return saved;
}

export function saveCurrentSession(session: SavedSession): void {
  if (typeof window === "undefined") return;
  writeJson(CURRENT_KEY, session, window.sessionStorage);
}

export function clearCurrentSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(CURRENT_KEY);
  } catch {
    // ignore
  }
}

export function saveLastResult(result: QuizResult): void {
  if (typeof window === "undefined") return;
  writeJson(LAST_RESULT_KEY, result, window.localStorage);
}

export function loadLastResult(): QuizResult | null {
  if (typeof window === "undefined") return null;
  const saved = readJson<QuizResult>(LAST_RESULT_KEY, window.localStorage);
  if (!saved || saved.version !== 1 || !Array.isArray(saved.questions)) return null;
  return saved;
}
