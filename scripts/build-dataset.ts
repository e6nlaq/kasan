/**
 * キュレーションデータと取得済み生データをマージして、
 * アプリが読み込む src/data/words.json を生成する。
 */

import { mkdir } from "node:fs/promises";
import path from "node:path";

import pluralize from "pluralize";

import { abstractWords } from "../data/curated/abstract";
import { bothExtraWords } from "../data/curated/bothExtra";
import { bothWords } from "../data/curated/both";
import { countableWords } from "../data/curated/countable";
import { l1ExtraWords } from "../data/curated/l1Extra";
import type { Countability, CuratedWord, Tier } from "../data/curated/types";
import { uncountableWords } from "../data/curated/uncountable";

const ROOT = path.resolve(import.meta.dir, "..");
const RAW = path.join(ROOT, "data", "raw");
const OUT_DIR = path.join(ROOT, "src", "data");

type RawCandidate = {
  lemma: string;
  countability: Countability | null;
  definitions: string[];
  defLabels: string[][];
  firstPos: string | null;
  concreteScore: number;
  abstractScore: number;
  tags: string[];
  ja: string[];
  description: string | null;
  frequencyRank: number;
};

type Word = {
  id: string;
  lemma: string;
  ja: string[];
  countability: Countability;
  tier: Tier;
  tags: string[];
  senses?: { ja: string; countability: "countable" | "uncountable"; pattern: string }[];
  note: string;
  patterns: string[];
  examples: { en: string; ja: string }[];
  plural: string | null;
  sources: { name: string; url: string; license: string }[];
};

const TARGET: Record<Tier, number> = { 1: 200, 2: 300, 3: 200, 4: 100 };

const SKIP_AUTO = new Set([
  "god",
  "sir",
  "mum",
  "dad",
  "yeah",
  "hey",
  "okay",
  "hello",
  "goodbye",
  "please",
  "thanks",
  "sorry",
  "yes",
  "no",
  "thing",
  "stuff",
  "guy",
  "kid",
  "boy",
  "girl",
  "baby",
  "mom",
  "daddy",
  "mister",
  "lady",
  "gentleman",
  "fella",
  "buddy",
  "honey",
  "dear",
  "sweetheart",
  "lord",
  "lady",
  "minutes",
  "police",
  "machinery",
  "tableware",
  "silverware",
  "footwear",
  "bedding",
  "poultry",
  "breathing",
  "brown",
  "cutting",
  "baseball",
  "gym",
  "homicide",
  "chief",
  "fault",
  "grace",
  "operation",
  "gunshot",
  "ability",
  "beef",
  "contest",
  "ruth",
  "dope",
  "graham",
  "audition",
  "vessel",
  "scum",
  "cocaine",
  "celebrity",
  "forehead",
  "dice",
  "mandy",
  "privacy",
  "diamond",
  "fox",
  // L1 のテーマ（具体的な物）に合わない自動収録語
  "plan",
  "singing",
  "drinking",
  "funeral",
  "winter",
  "committee",
  "landing",
  "individual",
]);

function article(lemma: string): string {
  const lower = lemma.toLowerCase();
  if (/^(hour|honest|honor|honour|heir)/.test(lower)) return "an";
  if (/^(uni|use|usu|eu|one|once|ewe|ufo)/.test(lower)) return "a";
  return /^[aeiou]/.test(lower) ? "an" : "a";
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function wiktionarySource(lemma: string) {
  return {
    name: "Wiktionary",
    url: `https://en.wiktionary.org/wiki/${encodeURIComponent(lemma)}`,
    license: "CC BY-SA 4.0",
  };
}

function wikidataSource() {
  return {
    name: "Wikidata",
    url: "https://www.wikidata.org",
    license: "CC0 1.0",
  };
}

function patternsFor(word: {
  lemma: string;
  countability: Countability;
  plural: string | null;
  senses?: { pattern: string }[];
}): string[] {
  if (word.countability === "both" && word.senses && word.senses.length > 0) {
    return [...new Set(word.senses.map((sense) => sense.pattern))];
  }
  if (word.countability === "uncountable") {
    return [`some ${word.lemma}`, `a lot of ${word.lemma}`];
  }
  const plural = word.plural ?? pluralize(word.lemma);
  return [`${article(word.lemma)} ${word.lemma}`, plural, `many ${plural}`];
}

function defaultNote(_lemma: string, ja: string, countability: Countability, tier: Tier): string {
  if (countability === "both") {
    return "可算・不可算の両方の用法があります。不可算では some / much、可算では a / an や複数形を使います。";
  }
  if (countability === "uncountable") {
    if (tier === 1) {
      return `英語では不可算名詞として扱います。複数形にせず、some / a lot of を使います。`;
    }
    return `抽象名詞は原則として不可算です。an を付けたり複数形にしたりせず、some / a lot of で量を表します。`;
  }
  return `英語では可算名詞です。「${ja}」には a / an を付け、複数形にできます。`;
}

function normalizeCurated(word: CuratedWord): Word {
  const plural = word.countability === "uncountable" ? null : pluralize(word.lemma);
  const base = {
    id: word.lemma,
    lemma: word.lemma,
    ja: word.ja,
    countability: word.countability,
    tier: word.tier,
    tags: word.tags,
    note:
      word.note ?? defaultNote(word.lemma, word.ja[0] ?? word.lemma, word.countability, word.tier),
    examples: word.examples ?? [],
    plural,
    sources: [wiktionarySource(word.lemma)],
  };
  const senses = word.senses;
  const patterns = patternsFor({ ...base, senses });
  return {
    ...base,
    ...(senses ? { senses } : {}),
    patterns,
  };
}

function labelsOf(raw: RawCandidate, index: number): string[] {
  return raw.defLabels[index] ?? [];
}

function firstTwoLabels(raw: RawCandidate): { uncountable: boolean; countable: boolean } {
  const labels = [labelsOf(raw, 0), labelsOf(raw, 1)].flat().join(" ");
  return {
    uncountable: /uncountable|singular only|plural only/.test(labels),
    countable: /countable/.test(labels),
  };
}

function autoCountability(raw: RawCandidate): Countability | null {
  const firstTwo = firstTwoLabels(raw);
  if (firstTwo.uncountable && firstTwo.countable) return "both";
  if (firstTwo.uncountable) return "uncountable";
  if (firstTwo.countable) return "countable";

  if (raw.countability === "both") return null;
  return raw.countability;
}

function autoTier(raw: RawCandidate, countability: Countability): Tier {
  if (countability === "both") return 3;
  return raw.tags.includes("concrete") ? 1 : 2;
}

function normalizeAuto(raw: RawCandidate, countability: Countability): Word {
  const tier = autoTier(raw, countability);
  const plural = countability === "uncountable" ? null : pluralize(raw.lemma);
  const ja = raw.ja[0] ?? raw.lemma;
  const note = defaultNote(raw.lemma, ja, countability, tier);

  if (countability === "both") {
    const bothPlural = plural ?? pluralize(raw.lemma);
    const patterns = [`some ${raw.lemma}`, `${article(raw.lemma)} ${raw.lemma} / ${bothPlural}`];
    return {
      id: raw.lemma,
      lemma: raw.lemma,
      ja: raw.ja,
      countability,
      tier,
      tags: raw.tags.map((tag) =>
        tag === "concrete" ? "具体" : tag === "abstract" ? "抽象" : tag,
      ),
      senses: [
        { ja: "不可算の用法", countability: "uncountable", pattern: `some ${raw.lemma}` },
        {
          ja: "可算の用法",
          countability: "countable",
          pattern: `${article(raw.lemma)} ${raw.lemma} / ${bothPlural}`,
        },
      ],
      note,
      patterns,
      examples: [],
      plural,
      sources: [wiktionarySource(raw.lemma), wikidataSource()],
    };
  }

  const patterns =
    countability === "uncountable"
      ? [`some ${raw.lemma}`, `a lot of ${raw.lemma}`]
      : [
          `${article(raw.lemma)} ${raw.lemma}`,
          plural ?? pluralize(raw.lemma),
          `many ${plural ?? pluralize(raw.lemma)}`,
        ];

  return {
    id: raw.lemma,
    lemma: raw.lemma,
    ja: raw.ja,
    countability,
    tier,
    tags: raw.tags.map((tag) => (tag === "concrete" ? "具体" : tag === "abstract" ? "抽象" : tag)),
    note,
    patterns,
    examples: [],
    plural,
    sources: [wiktionarySource(raw.lemma), wikidataSource()],
  };
}

function isUsableAuto(raw: RawCandidate, curatedIds: Set<string>): boolean {
  if (curatedIds.has(raw.lemma)) return false;
  if (SKIP_AUTO.has(raw.lemma)) return false;
  if (raw.firstPos !== "Noun") return false;
  if (raw.frequencyRank < 200) return false;
  if (raw.lemma.endsWith("s")) return false;
  if (raw.ja.length === 0) return false;
  const ja = raw.ja[0] ?? "";
  if (!/[\u4e00-\u9fff\u3040-\u309f]/.test(ja)) return false;
  if (ja.length > 16) return false;
  return true;
}

async function main(): Promise<void> {
  const curated = [
    ...bothWords,
    ...bothExtraWords,
    ...uncountableWords,
    ...countableWords,
    ...abstractWords,
    ...l1ExtraWords,
  ].map(normalizeCurated);
  const curatedIds = new Set(curated.map((word) => word.id));

  const raw = (await Bun.file(path.join(RAW, "candidates.json")).json()) as RawCandidate[];
  const usable = raw
    .filter((candidate) => isUsableAuto(candidate, curatedIds))
    .sort((a, b) => a.frequencyRank - b.frequencyRank);

  const byTier = new Map<Tier, Word[]>([
    [1, []],
    [2, []],
    [3, []],
    [4, []],
  ]);
  for (const word of curated) {
    byTier.get(word.tier)?.push(word);
  }

  const autoAdded: Word[] = [];
  for (const candidate of usable) {
    const countability = autoCountability(candidate);
    if (!countability) continue;
    const word = normalizeAuto(candidate, countability);
    const bucket = byTier.get(word.tier);
    if (!bucket) continue;
    if (bucket.length >= TARGET[word.tier]) continue;
    bucket.push(word);
    autoAdded.push(word);
  }

  const words = [1, 2, 3, 4].flatMap((tier) => byTier.get(tier as Tier) ?? []);
  const ids = new Set<string>();
  for (const word of words) {
    if (ids.has(word.id)) throw new Error(`duplicate word: ${word.id}`);
    ids.add(word.id);
    if (word.ja.length === 0) throw new Error(`missing ja: ${word.id}`);
    if (!word.note) throw new Error(`missing note: ${word.id}`);
    if (word.sources.length === 0) throw new Error(`missing source: ${word.id}`);
    if (word.countability === "both" && (word.senses?.length ?? 0) < 2) {
      throw new Error(`both word needs senses: ${word.id}`);
    }
    if (word.countability !== "both" && word.senses) {
      throw new Error(`unexpected senses: ${word.id}`);
    }
  }

  const counts = {
    total: words.length,
    L1: byTier.get(1)?.length ?? 0,
    L2: byTier.get(2)?.length ?? 0,
    L3: byTier.get(3)?.length ?? 0,
    L4: byTier.get(4)?.length ?? 0,
    curated: curated.length,
    auto: autoAdded.length,
    countable: words.filter((word) => word.countability === "countable").length,
    uncountable: words.filter((word) => word.countability === "uncountable").length,
    both: words.filter((word) => word.countability === "both").length,
  };

  await mkdir(OUT_DIR, { recursive: true });
  await Bun.write(path.join(OUT_DIR, "words.json"), JSON.stringify(words, null, 2) + "\n");
  await Bun.write(
    path.join(OUT_DIR, "meta.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        counts,
        sources: [
          {
            name: "English Wiktionary",
            url: "https://en.wiktionary.org",
            license: "CC BY-SA 4.0",
            note: "見出し語の可算性・語義ラベルの参照",
          },
          {
            name: "Wikidata",
            url: "https://www.wikidata.org",
            license: "CC0 1.0",
            note: "自動収録語の日本語ラベル",
          },
          {
            name: "FrequencyWords",
            url: "https://github.com/hermitdave/FrequencyWords",
            license: "MIT",
            note: "収録語の選定に用いた頻度リスト",
          },
        ],
      },
      null,
      2,
    ) + "\n",
  );

  console.log(
    `生成: ${counts.total} 語 (L1 ${counts.L1} / L2 ${counts.L2} / L3 ${counts.L3} / L4 ${counts.L4})`,
  );
  console.log(
    `  内訳: キュレーション ${counts.curated} / 自動 ${counts.auto}、可算 ${counts.countable} / 不可算 ${counts.uncountable} / 両方 ${counts.both}`,
  );
  void capitalize;
}

await main();
