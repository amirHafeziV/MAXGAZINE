import { callClaudeJSON } from "../anthropic.js";
import { config, LANGS, SOURCE_LANG, type Lang } from "../config.js";
import type { Draft, Localized } from "../types.js";

const TARGETS: Lang[] = LANGS.filter((l) => l !== SOURCE_LANG);

const SYSTEM = `You are MAXGAZINE's translation desk. Translate financial news from
English into Persian (fa), Arabic (ar) and Turkish (tr). Keep meaning, tone and
all numbers/tickers exact. Use natural native phrasing, not literal calque.
Persian and Arabic are right-to-left — write them correctly. Keep Markdown
structure (paragraphs, ## subheads) identical across languages.`;

function field() {
  return {
    type: "object",
    properties: Object.fromEntries(TARGETS.map((l) => [l, { type: "string" }])),
    required: TARGETS,
    additionalProperties: false,
  };
}

const schema = {
  type: "object",
  properties: { headline: field(), dek: field(), body: field() },
  required: ["headline", "dek", "body"],
  additionalProperties: false,
} as const;

/** Translate the three localized text fields; English is filled from the draft. */
export async function translate(draft: Draft): Promise<{
  headline: Localized;
  dek: Localized;
  body: Localized;
}> {
  const prompt = `Translate this article into ${TARGETS.join(", ")}.

HEADLINE:
${draft.headline}

DEK:
${draft.dek}

BODY (Markdown):
${draft.body}`;

  const out = await callClaudeJSON<{
    headline: Record<Lang, string>;
    dek: Record<Lang, string>;
    body: Record<Lang, string>;
  }>({
    model: config.models.fast,
    system: SYSTEM,
    prompt,
    schema,
    toolName: "translate",
    temperature: 0.3,
    maxTokens: 6000,
  });

  return {
    headline: { ...out.headline, en: draft.headline },
    dek: { ...out.dek, en: draft.dek },
    body: { ...out.body, en: draft.body },
  };
}
