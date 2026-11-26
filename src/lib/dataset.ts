import metaJson from "@/data/meta.json";
import wordsJson from "@/data/words.json";

import { wordsSchema, type Tier, type Word } from "./schema";

export const words: Word[] = wordsSchema.parse(wordsJson);

export const datasetMeta = metaJson as {
  generatedAt: string;
  counts: {
    total: number;
    L1: number;
    L2: number;
    L3: number;
    L4: number;
    curated: number;
    auto: number;
    countable: number;
    uncountable: number;
    both: number;
  };
  sources: { name: string; url: string; license: string; note: string }[];
};

export const wordsById = new Map(words.map((word) => [word.id, word]));

export const TIERS: {
  id: Tier;
  label: string;
  title: string;
  description: string;
}[] = [
  {
    id: 1,
    label: "L1",
    title: "基本の物質・具体物",
    description: "水・パン・本など、日本語でもイメージしやすい語から確認します。",
  },
  {
    id: 2,
    label: "L2",
    title: "抽象名詞",
    description: "情報・助言・考えなど、目に見えない名詞の可算性を学びます。",
  },
  {
    id: 3,
    label: "L3",
    title: "意味で変わる語",
    description: "paper（紙／新聞）のように、語義によって可算性が変わる語を練習します。",
  },
  {
    id: 4,
    label: "L4",
    title: "日本語とのズレ",
    description: "furniture や information など、複数形にしがちな語を重点的に確認します。",
  },
];

export function wordsOfTier(tier: Tier | "all"): Word[] {
  if (tier === "all") return words;
  return words.filter((word) => word.tier === tier);
}

export function tierCount(tier: Tier): number {
  return words.filter((word) => word.tier === tier).length;
}

export function parseTier(value: string): Tier | "all" | null {
  if (value === "all") return "all";
  if (value === "L1" || value === "L2" || value === "L3" || value === "L4") {
    return Number(value.slice(1)) as Tier;
  }
  return null;
}
