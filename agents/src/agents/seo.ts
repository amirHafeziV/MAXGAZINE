import { callClaudeJSON } from "../anthropic.js";
import { config, LANGS } from "../config.js";
import { localizedSchema } from "./_schema.js";
import type { Draft, Localized, SeoMeta } from "../types.js";

const SYSTEM = `You are MAXGAZINE's SEO desk. For a news article, produce search
metadata in all four languages (en, fa, ar, tr). Rules:
- title: <= 60 chars, includes the key entity, ends with " — MAXGAZINE".
- description: 120-155 chars, compelling, no clickbait, native phrasing per language.
- keywords: 3-6 high-intent terms per language (no hashtags).
Optimize for both Google and AI crawlers: clear, factual, entity-rich.`;

const keywordsSchema = {
  type: "object",
  properties: Object.fromEntries(
    LANGS.map((l) => [l, { type: "array", items: { type: "string" }, maxItems: 6 }]),
  ),
  required: [...LANGS],
  additionalProperties: false,
};

const schema = {
  type: "object",
  properties: {
    title: localizedSchema,
    description: localizedSchema,
    keywords: keywordsSchema,
  },
  required: ["title", "description", "keywords"],
  additionalProperties: false,
} as const;

export async function seo(
  draft: Draft,
  headlineByLang: Localized,
): Promise<SeoMeta> {
  const prompt = `Article (English):
Headline: ${draft.headline}
Dek: ${draft.dek}
Category: ${draft.category}

Localized headlines for reference:
${LANGS.map((l) => `${l}: ${headlineByLang[l]}`).join("\n")}

Produce SEO metadata in all four languages.`;

  return callClaudeJSON<SeoMeta>({
    model: config.models.fast,
    system: SYSTEM,
    prompt,
    schema,
    toolName: "seo_meta",
    temperature: 0.4,
    maxTokens: 2000,
  });
}
