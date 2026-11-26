import type { CuratedWord } from "./types";

/** L1: 基本の具体的な物。自動収録語の不足分を補う。 */
export const l1ExtraWords: CuratedWord[] = [
  { lemma: "mirror", ja: ["鏡"], countability: "countable", tier: 1, tags: ["物"] },
  { lemma: "clock", ja: ["時計"], countability: "countable", tier: 1, tags: ["物"] },
  { lemma: "umbrella", ja: ["傘"], countability: "countable", tier: 1, tags: ["物"] },
  { lemma: "wallet", ja: ["財布"], countability: "countable", tier: 1, tags: ["物"] },
  { lemma: "towel", ja: ["タオル"], countability: "countable", tier: 1, tags: ["物"] },
  { lemma: "basket", ja: ["かご"], countability: "countable", tier: 1, tags: ["容器"] },
  { lemma: "brush", ja: ["ブラシ"], countability: "countable", tier: 1, tags: ["道具"] },
  { lemma: "sofa", ja: ["ソファ"], countability: "countable", tier: 1, tags: ["家具"] },
];
