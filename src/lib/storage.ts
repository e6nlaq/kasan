export type Attempt = {
  correct: number;
  wrong: number;
  lastCorrect: boolean;
  lastAt: string;
};

export type SessionRecord = {
  at: string;
  tier: string;
  mode: "tier" | "random" | "review";
  correct: number;
  total: number;
};

export type Progress = {
  version: 1;
  attempts: Record<string, Attempt>;
  sessions: SessionRecord[];
};

const STORAGE_KEY = "kasan:progress:v1";
const MAX_SESSIONS = 30;

function emptyProgress(): Progress {
  return { version: 1, attempts: {}, sessions: [] };
}

function storageAvailable(): boolean {
  try {
    return typeof window !== "undefined" && Boolean(window.localStorage);
  } catch {
    return false;
  }
}

export function loadProgress(): Progress {
  if (!storageAvailable()) return emptyProgress();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as Progress;
    if (parsed.version !== 1 || typeof parsed.attempts !== "object") {
      return emptyProgress();
    }
    return {
      version: 1,
      attempts: parsed.attempts,
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    };
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(progress: Progress): void {
  if (!storageAvailable()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // 容量不足などで保存できなくても、学習自体は継続できるようにする。
  }
}

export function recordAnswer(wordId: string, correct: boolean): Progress {
  const progress = loadProgress();
  const previous = progress.attempts[wordId] ?? {
    correct: 0,
    wrong: 0,
    lastCorrect: false,
    lastAt: "",
  };
  progress.attempts[wordId] = {
    correct: previous.correct + (correct ? 1 : 0),
    wrong: previous.wrong + (correct ? 0 : 1),
    lastCorrect: correct,
    lastAt: new Date().toISOString(),
  };
  saveProgress(progress);
  return progress;
}

export function recordSession(session: SessionRecord): Progress {
  const progress = loadProgress();
  progress.sessions = [session, ...progress.sessions].slice(0, MAX_SESSIONS);
  saveProgress(progress);
  return progress;
}

export function resetProgress(): void {
  if (!storageAvailable()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function reviewWordIds(progress: Progress = loadProgress()): string[] {
  return Object.entries(progress.attempts)
    .filter(([, attempt]) => !attempt.lastCorrect)
    .map(([wordId]) => wordId);
}

/** 直近に解いた語。クイズの出題順で後ろに回して優先度を下げる。 */
export function recentWordIds(
  withinMs = 24 * 60 * 60 * 1000,
  progress: Progress = loadProgress(),
): Set<string> {
  const threshold = Date.now() - withinMs;
  return new Set(
    Object.entries(progress.attempts)
      .filter(([, attempt]) => {
        const time = Date.parse(attempt.lastAt);
        return Number.isFinite(time) && time >= threshold;
      })
      .map(([wordId]) => wordId),
  );
}

export function overallStats(progress: Progress = loadProgress()): {
  attempts: number;
  correct: number;
  accuracy: number;
  studiedWords: number;
} {
  const entries = Object.values(progress.attempts);
  const correct = entries.reduce((sum, attempt) => sum + attempt.correct, 0);
  const attempts = entries.reduce((sum, attempt) => sum + attempt.correct + attempt.wrong, 0);
  return {
    attempts,
    correct,
    accuracy: attempts === 0 ? 0 : Math.round((correct / attempts) * 100),
    studiedWords: entries.length,
  };
}
