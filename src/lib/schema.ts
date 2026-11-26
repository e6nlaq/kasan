import { z } from "zod";

export const countabilitySchema = z.enum(["countable", "uncountable", "both"]);

export const tierSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);

export const sourceSchema = z.object({
  name: z.string().min(1),
  url: z.string().min(1),
  license: z.string().min(1),
});

export const senseSchema = z.object({
  ja: z.string().min(1),
  countability: z.enum(["countable", "uncountable"]),
  pattern: z.string().min(1),
});

export const wordSchema = z.object({
  id: z.string().min(1),
  lemma: z.string().min(1),
  ja: z.array(z.string().min(1)).min(1),
  countability: countabilitySchema,
  tier: tierSchema,
  tags: z.array(z.string()),
  senses: z.array(senseSchema).min(2).optional(),
  note: z.string().min(1),
  patterns: z.array(z.string().min(1)).min(1),
  examples: z.array(z.object({ en: z.string().min(1), ja: z.string().min(1) })),
  plural: z.string().nullable(),
  sources: z.array(sourceSchema).min(1),
});

export const wordsSchema = z.array(wordSchema);

export type Word = z.infer<typeof wordSchema>;
export type Countability = z.infer<typeof countabilitySchema>;
export type Tier = z.infer<typeof tierSchema>;
export type Sense = z.infer<typeof senseSchema>;
export type Source = z.infer<typeof sourceSchema>;
