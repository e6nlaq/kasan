export type Countability = "countable" | "uncountable" | "both";
export type Tier = 1 | 2 | 3 | 4;

export type CuratedSense = {
  ja: string;
  countability: "countable" | "uncountable";
  /** 解説に表示する用法パターン（例: "some paper / a piece of paper"） */
  pattern: string;
};

export type CuratedWord = {
  lemma: string;
  ja: string[];
  countability: Countability;
  tier: Tier;
  tags: string[];
  /** countability が "both" のときは必須 */
  senses?: CuratedSense[];
  note?: string;
  examples?: { en: string; ja: string }[];
};
