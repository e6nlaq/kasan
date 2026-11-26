import { describe, expect, test } from "bun:test";

import meta from "../src/data/meta.json";
import rawWords from "../src/data/words.json";
import { wordsSchema, type Word } from "../src/lib/schema";

const words: Word[] = wordsSchema.parse(rawWords);

function byTier(tier: number): Word[] {
  return words.filter((word) => word.tier === tier);
}

describe("words.json", () => {
  test("zod スキーマを満たす", () => {
    expect(words.length).toBe(rawWords.length);
    expect(words.length).toBe(800);
  });

  test("難易度ごとの語数が 200 / 300 / 200 / 100", () => {
    expect(byTier(1)).toHaveLength(200);
    expect(byTier(2)).toHaveLength(300);
    expect(byTier(3)).toHaveLength(200);
    expect(byTier(4)).toHaveLength(100);
  });

  test("ID が重複しない", () => {
    const ids = words.map((word) => word.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("すべての語に出典と解説パターンがある", () => {
    for (const word of words) {
      expect(word.sources.length).toBeGreaterThan(0);
      expect(word.patterns.length).toBeGreaterThan(0);
      expect(word.ja.length).toBeGreaterThan(0);
      expect(word.note.length).toBeGreaterThan(0);
      for (const source of word.sources) {
        expect(source.license.length).toBeGreaterThan(0);
        expect(source.url.startsWith("https://")).toBe(true);
      }
    }
  });

  test("L3 は必ず両方の用法をもち、L4 は不可算", () => {
    for (const word of byTier(3)) {
      expect(word.countability).toBe("both");
      expect(word.senses?.length ?? 0).toBeGreaterThanOrEqual(2);
    }
    for (const word of byTier(4)) {
      expect(word.countability).toBe("uncountable");
      expect(word.senses).toBeUndefined();
    }
  });

  test("L1 / L2 には both を混ぜない", () => {
    for (const word of [...byTier(1), ...byTier(2)]) {
      expect(word.countability === "both").toBe(false);
    }
  });

  test("代表的な語の判定が正しい", () => {
    const lookup = new Map(words.map((word) => [word.id, word]));
    const expectations: [string, string, number][] = [
      ["information", "uncountable", 4],
      ["furniture", "uncountable", 4],
      ["advice", "uncountable", 4],
      ["news", "uncountable", 4],
      ["mathematics", "uncountable", 4],
      ["paper", "both", 3],
      ["water", "both", 3],
      ["experience", "both", 3],
      ["book", "countable", 1],
      ["milk", "uncountable", 1],
    ];
    for (const [id, countability, tier] of expectations) {
      const word = lookup.get(id);
      expect(word, id).toBeDefined();
      expect(word?.countability).toBe(countability as Word["countability"]);
      expect(word?.tier).toBe(tier as Word["tier"]);
    }
  });
});

describe("meta.json", () => {
  test("件数が words.json と一致する", () => {
    expect(meta.counts.total).toBe(words.length);
    expect(meta.counts.L1).toBe(byTier(1).length);
    expect(meta.counts.L2).toBe(byTier(2).length);
    expect(meta.counts.L3).toBe(byTier(3).length);
    expect(meta.counts.L4).toBe(byTier(4).length);
    expect(meta.counts.countable + meta.counts.uncountable + meta.counts.both).toBe(words.length);
  });

  test("sources が空でなく、必須の出典を含む", () => {
    expect(meta.sources.length).toBeGreaterThan(0);
    const names = meta.sources.map((source) => source.name);
    expect(names).toContain("English Wiktionary");
    expect(names).toContain("Wikidata");
    expect(names).toContain("FrequencyWords");
    for (const source of meta.sources) {
      expect(source.license.length).toBeGreaterThan(0);
    }
  });
});
