/**
 * データ取得スクリプト
 *
 * 取得元:
 *  - FrequencyWords (MIT License) https://github.com/hermitdave/FrequencyWords
 *  - English Wiktionary (CC BY-SA 4.0) https://en.wiktionary.org
 *  - Wikidata (CC0 1.0) https://www.wikidata.org
 *
 * 取得した生データは data/raw/ に保存し、リポジトリにコミットする。
 * 再実行時はキャッシュを利用するため、--force を付けた場合のみ再取得する。
 */

import { mkdir } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dir, "..");
const RAW = path.join(ROOT, "data", "raw");

const FREQUENCY_URL =
  "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_50k.txt";
const WIKTIONARY_API = "https://en.wiktionary.org/w/api.php";
const WIKIDATA_API = "https://www.wikidata.org/w/api.php";

const USER_AGENT = "kasan-quiz/0.1 (https://github.com/; educational countability quiz)";

const FORCE = process.argv.includes("--force");
const TOP_WORDS = Number(process.env.TOP_WORDS ?? 8000);
const MAX_PAGES = Number(process.env.MAX_PAGES ?? 3000);

type Countability = "countable" | "uncountable" | "both";

type WiktionaryEntry = {
  lemma: string;
  headwords: string[];
  definitions: string[];
  defLabels: string[][];
  firstPos: string | null;
  countability: Countability | null;
  concreteScore: number;
  abstractScore: number;
  tags: string[];
};

type WikidataEntry = {
  lemma: string;
  ja: string[];
  description: string | null;
};

const BLOCKLIST = new Set([
  "fuck",
  "fucking",
  "shit",
  "bitch",
  "cunt",
  "dick",
  "cock",
  "pussy",
  "ass",
  "asshole",
  "bastard",
  "whore",
  "slut",
  "rape",
  "nigger",
  "nigga",
  "fag",
  "faggot",
  "porn",
  "penis",
  "vagina",
  "sex",
  "suicide",
  "damn",
  "hell",
]);

async function exists(file: string): Promise<boolean> {
  return Bun.file(file).exists();
}

async function readJson<T>(file: string): Promise<T | null> {
  if (!(await exists(file))) return null;
  return (await Bun.file(file).json()) as T;
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await Bun.write(file, JSON.stringify(value, null, 2) + "\n");
}

async function fetchText(url: string): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "user-agent": USER_AGENT },
      });
      if (response.status === 429) {
        await Bun.sleep(5000 * (attempt + 1));
        continue;
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`);
      }
      return await response.text();
    } catch (error) {
      if (attempt === 5) throw error;
      await Bun.sleep(1500 * (attempt + 1));
    }
  }
  throw new Error(`unreachable: ${url}`);
}

async function fetchJson<T>(url: string): Promise<T> {
  return JSON.parse(await fetchText(url)) as T;
}

async function pool<T, R>(
  items: T[],
  size: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = Array.from({ length: items.length });
  let cursor = 0;

  async function run(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const item = items[index];
      if (item === undefined) continue;
      results[index] = await worker(item, index);
      await Bun.sleep(60);
    }
  }

  await Promise.all(Array.from({ length: Math.min(size, items.length) }, run));
  return results;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

// ---------------------------------------------------------------------------
// 1. 頻度リスト
// ---------------------------------------------------------------------------

async function loadFrequency(): Promise<Map<string, number>> {
  const file = path.join(RAW, "frequency-en.txt");
  let text: string;
  if (!FORCE && (await exists(file))) {
    text = await Bun.file(file).text();
  } else {
    text = await fetchText(FREQUENCY_URL);
    await mkdir(RAW, { recursive: true });
    await Bun.write(file, text);
  }

  const ranks = new Map<string, number>();
  const lines = text.split("\n");
  let rank = 0;
  for (const line of lines) {
    const [word] = line.trim().split(" ");
    if (!word) continue;
    if (!/^[a-z]{2,}$/.test(word)) continue;
    rank += 1;
    if (!ranks.has(word)) ranks.set(word, rank);
  }
  return ranks;
}

// ---------------------------------------------------------------------------
// 2. Wiktionary: 本文（見出しテンプレートと語義）
// ---------------------------------------------------------------------------

type RevisionResponse = {
  query?: {
    pages?: {
      title: string;
      missing?: boolean;
      revisions?: { slots?: { main?: { content?: string } } }[];
    }[];
  };
};

const CONCRETE_KEYWORDS = [
  "liquid",
  "substance",
  "material",
  "food",
  "drink",
  "beverage",
  "metal",
  "gas",
  "chemical",
  "plant",
  "animal",
  "tree",
  "flower",
  "fruit",
  "vegetable",
  "grain",
  "meat",
  "fish",
  "bird",
  "insect",
  "rock",
  "mineral",
  "wood",
  "cloth",
  "fabric",
  "fuel",
  "powder",
  "solid",
  "object",
  "container",
  "furniture",
  "clothing",
  "vehicle",
  "machine",
  "tool",
  "weapon",
  "building",
  "place",
  "body",
  "organ",
  "skin",
  "hair",
  "sound",
  "light",
  "fire",
  "smoke",
  "dust",
  "sand",
  "soil",
  "water",
  "ice",
  "snow",
  "rain",
  "wind",
  "air",
  "steam",
  "oil",
  "milk",
  "blood",
  "bone",
  "muscle",
];

const ABSTRACT_KEYWORDS = [
  "state",
  "quality",
  "condition",
  "feeling",
  "emotion",
  "idea",
  "concept",
  "abstract",
  "process",
  "action",
  "activity",
  "event",
  "occurrence",
  "situation",
  "fact",
  "information",
  "knowledge",
  "belief",
  "opinion",
  "attitude",
  "behavior",
  "behaviour",
  "relationship",
  "connection",
  "ability",
  "capacity",
  "power",
  "authority",
  "freedom",
  "right",
  "law",
  "rule",
  "system",
  "method",
  "way",
  "manner",
  "time",
  "period",
  "duration",
  "amount",
  "quantity",
  "degree",
  "level",
  "rate",
  "speed",
  "value",
  "price",
  "cost",
  "money",
  "income",
  "profit",
  "loss",
  "business",
  "work",
  "job",
  "education",
  "study",
  "research",
  "science",
  "art",
  "music",
  "literature",
  "language",
  "communication",
  "transport",
  "traffic",
  "weather",
  "climate",
  "nature",
  "environment",
  "society",
  "culture",
  "politics",
  "economy",
  "history",
  "health",
  "medicine",
  "treatment",
  "disease",
  "illness",
  "pain",
  "pleasure",
  "happiness",
  "sadness",
  "anger",
  "fear",
  "hope",
  "love",
  "hate",
  "trust",
  "respect",
  "support",
  "help",
  "advice",
  "guidance",
  "attention",
  "effort",
  "progress",
  "success",
  "failure",
  "change",
  "growth",
  "development",
  "improvement",
  "damage",
  "harm",
  "danger",
  "safety",
  "security",
  "peace",
  "war",
  "conflict",
  "cooperation",
  "competition",
  "demand",
  "supply",
  "trade",
  "industry",
  "agriculture",
  "production",
  "consumption",
  "employment",
  "unemployment",
  "poverty",
  "wealth",
  "equality",
  "justice",
  "truth",
  "beauty",
  "strength",
  "weakness",
  "skill",
  "experience",
  "practice",
  "training",
  "exercise",
  "sleep",
  "rest",
  "food",
  "noise",
];

function scoreKeywords(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const keyword of keywords) {
    if (lower.includes(keyword)) score += 1;
  }
  return score;
}

function cleanWikitext(input: string): string {
  return input
    .replace(/\{\{(?:lb|tlb|lb\/doc)\|en\|([^}]*)\}\}/g, " ")
    .replace(/\{\{[^{}]*\}\}/g, " ")
    .replace(/\[\[([^|\]]*)\|([^\]]*)\]\]/g, "$2")
    .replace(/\[\[([^\]]*)\]\]/g, "$1")
    .replace(/'''?/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function labelsOf(definition: string): string[] {
  const labels: string[] = [];
  for (const match of definition.matchAll(/\{\{(?:lb|tlb)\|en\|([^}]*)\}\}/g)) {
    const raw = match[1];
    if (!raw) continue;
    for (const part of raw.split("|")) {
      const label = part.trim().replace(/^_+$/, "").replace(/_/g, " ");
      if (label && !label.includes("=")) labels.push(label);
    }
  }
  return labels;
}

function parseHeadwordCountability(headwords: string[]): Countability | null {
  if (headwords.length === 0) return null;

  let sawUncountable = false;
  let sawCountable = false;

  for (const headword of headwords) {
    const inner = headword.replace(/^\{\{/, "").replace(/\}\}$/, "");
    const parts = inner.split("|").slice(1);
    const flags = parts.filter((part) => !part.includes("="));
    const first = flags[0];

    if (first === "~") {
      sawCountable = true;
      sawUncountable = true;
      continue;
    }
    if (first === "-" || first === "!") {
      sawUncountable = true;
      // "-|s" のように例外的な複数形が示される場合も、基本は不可算。
      continue;
    }
    sawCountable = true;
  }

  if (sawCountable && sawUncountable) return "both";
  if (sawUncountable) return "uncountable";
  if (sawCountable) return "countable";
  return null;
}

function parseEnglishSection(wikitext: string): string | null {
  const start = wikitext.indexOf("==English==");
  if (start < 0) return null;
  const rest = wikitext.slice(start + "==English==".length);
  const next = rest.search(/\n==[^=]/);
  return next >= 0 ? rest.slice(0, next) : rest;
}

function parseWiktionaryPage(lemma: string, wikitext: string): WiktionaryEntry | null {
  const english = parseEnglishSection(wikitext);
  if (!english) return null;

  const lines = english.split("\n");
  const headwords = lines
    .map((line) => line.trim())
    .filter((line) => /^\{\{en-(?:noun|plural noun)(?:\||\})/.test(line));

  if (headwords.length === 0) return null;

  const definitionLines = lines
    .map((line) => line.trim())
    .filter((line) => /^#[^#:*]/.test(line))
    .slice(0, 12);

  const posNames = new Set([
    "Noun",
    "Verb",
    "Adjective",
    "Adverb",
    "Pronoun",
    "Preposition",
    "Conjunction",
    "Interjection",
    "Determiner",
    "Numeral",
    "Proper noun",
    "Article",
    "Particle",
    "Prefix",
    "Suffix",
    "Symbol",
    "Letter",
  ]);

  const posHeadings = lines
    .map((line) => line.trim().match(/^===\s*([^=]+?)\s*===$/)?.[1])
    .filter((value): value is string => typeof value === "string" && posNames.has(value));

  const labels = definitionLines.flatMap(labelsOf);
  const hasUncountable = labels.some((label) =>
    /uncountable|singular only|plural only/.test(label),
  );
  const hasCountable = labels.some((label) => /countable/.test(label));
  let countability: Countability | null;
  if (hasUncountable && hasCountable) countability = "both";
  else if (hasUncountable) countability = "uncountable";
  else if (hasCountable) countability = "countable";
  else countability = parseHeadwordCountability(headwords);

  const definitionText = definitionLines.map(cleanWikitext).join(" ");
  const concreteScore = scoreKeywords(definitionText, CONCRETE_KEYWORDS);
  const abstractScore = scoreKeywords(definitionText, ABSTRACT_KEYWORDS);

  const tags: string[] = [];
  if (concreteScore >= abstractScore && concreteScore > 0) tags.push("concrete");
  if (abstractScore > concreteScore) tags.push("abstract");

  return {
    lemma,
    headwords,
    definitions: definitionLines.map(cleanWikitext).slice(0, 4),
    defLabels: definitionLines.map(labelsOf),
    firstPos: posHeadings[0] ?? null,
    countability,
    concreteScore,
    abstractScore,
    tags,
  };
}

async function fetchWiktionary(lemmas: string[]): Promise<Map<string, WiktionaryEntry>> {
  const cacheFile = path.join(RAW, "wiktionary-entries.json");
  const cached = (await readJson<Record<string, WiktionaryEntry>>(cacheFile)) ?? {};
  const pending = lemmas.filter((lemma) => !(lemma in cached));

  if (pending.length > 0) {
    const batches = chunk(pending, 50);
    const results = await pool(batches, 3, async (batch) => {
      const url = `${WIKTIONARY_API}?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=${encodeURIComponent(batch.join("|"))}`;
      const data = await fetchJson<RevisionResponse>(url);
      const pages = data.query?.pages ?? [];
      return pages.map((page) => ({
        title: page.title,
        content: page.revisions?.[0]?.slots?.main?.content ?? "",
      }));
    });

    for (const batch of results) {
      for (const page of batch) {
        if (!page.content) continue;
        const parsed = parseWiktionaryPage(page.title, page.content);
        if (parsed) cached[page.title] = parsed;
      }
    }
    await writeJson(cacheFile, cached);
  }

  return new Map(Object.entries(cached));
}

// ---------------------------------------------------------------------------
// 4. Wikidata: 日本語ラベル
// ---------------------------------------------------------------------------

type WikidataResponse = {
  entities?: Record<
    string,
    {
      missing?: string;
      labels?: Record<string, { value: string }>;
      descriptions?: Record<string, { value: string }>;
    }
  >;
};

async function fetchWikidata(lemmas: string[]): Promise<Map<string, WikidataEntry>> {
  const cacheFile = path.join(RAW, "wikidata-ja.json");
  const cached = (await readJson<Record<string, WikidataEntry>>(cacheFile)) ?? {};
  const pending = lemmas.filter((lemma) => !(lemma in cached));

  if (pending.length > 0) {
    const batches = chunk(pending, 50);
    const results = await pool(batches, 1, async (batch) => {
      const titles = batch.map((lemma) => lemma.charAt(0).toUpperCase() + lemma.slice(1));
      const url = `${WIKIDATA_API}?action=wbgetentities&sites=enwiki&props=labels%7Cdescriptions&languages=ja%7Cen&format=json&formatversion=2&titles=${encodeURIComponent(titles.join("|"))}`;
      const data = await fetchJson<WikidataResponse>(url);
      return { batch, entities: data.entities ?? {} };
    });

    for (const { batch, entities } of results) {
      for (const lemma of batch) {
        const title = lemma.charAt(0).toUpperCase() + lemma.slice(1);
        const entry = Object.values(entities).find(
          (candidate) => candidate.labels?.en?.value.toLowerCase() === lemma.toLowerCase(),
        );
        const ja = entry?.labels?.ja?.value?.trim();
        cached[lemma] = {
          lemma,
          ja: ja && ja.toLowerCase() !== lemma ? [ja] : [],
          description: entry?.descriptions?.ja?.value ?? null,
        };
        void title;
      }
    }
    await writeJson(cacheFile, cached);
  }

  return new Map(Object.entries(cached));
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  await mkdir(RAW, { recursive: true });

  console.log("1/4 頻度リストを準備しています…");
  const frequency = await loadFrequency();
  const topWords = [...frequency.entries()]
    .sort((a, b) => a[1] - b[1])
    .slice(0, TOP_WORDS)
    .map(([word]) => word)
    .filter((word) => !BLOCKLIST.has(word));
  console.log(`   対象語: ${topWords.length}`);

  console.log("2/3 Wiktionary の本文を取得しています…");
  const wiktionary = await fetchWiktionary(topWords.slice(0, MAX_PAGES));
  console.log(`   解析済み: ${wiktionary.size}`);

  const usable = [...wiktionary.values()].filter((entry) => entry.countability !== null);

  console.log("3/3 Wikidata の日本語ラベルを取得しています…");
  const wikidata = await fetchWikidata(usable.map((entry) => entry.lemma));
  console.log(`   ラベル取得: ${wikidata.size}`);

  const candidates = usable.map((entry) => ({
    ...entry,
    ja: wikidata.get(entry.lemma)?.ja ?? [],
    description: wikidata.get(entry.lemma)?.description ?? null,
    frequencyRank: frequency.get(entry.lemma) ?? Number.MAX_SAFE_INTEGER,
  }));

  await writeJson(path.join(RAW, "candidates.json"), candidates);
  await writeJson(path.join(RAW, "meta.json"), {
    generatedAt: new Date().toISOString(),
    sources: {
      frequency: {
        name: "FrequencyWords",
        url: "https://github.com/hermitdave/FrequencyWords",
        license: "MIT",
      },
      wiktionary: {
        name: "English Wiktionary",
        url: "https://en.wiktionary.org",
        license: "CC BY-SA 4.0",
      },
      wikidata: {
        name: "Wikidata",
        url: "https://www.wikidata.org",
        license: "CC0 1.0",
      },
    },
    counts: {
      frequencyWords: topWords.length,
      parsed: wiktionary.size,
      candidates: candidates.length,
    },
  });

  console.log(`完了: ${candidates.length} 語を data/raw/candidates.json に保存しました。`);
}

await main();
