import { LANGS } from "../config.js";

/** JSON-schema object requiring a string for every language. */
export const localizedSchema = {
  type: "object",
  properties: Object.fromEntries(LANGS.map((l) => [l, { type: "string" }])),
  required: [...LANGS],
  additionalProperties: false,
} as const;

export const CATEGORIES = [
  "markets",
  "forex",
  "defi",
  "policy",
  "mining",
  "analysis",
  "tech",
  "cars",
] as const;

/** Make a kebab-case, ASCII slug. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 70);
}
