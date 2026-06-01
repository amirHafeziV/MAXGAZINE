import { callClaudeJSON } from "../anthropic.js";
import { LANGS } from "../config.js";
import { localizedSchema } from "./_schema.js";
import type { RankedEntity, RankingTable } from "../types.js";

const SYSTEM = `You are MAXGAZINE's ratings desk. You re-score the ranked list of
{kind}s using a fixed, transparent methodology and refresh the localized blurbs.
Be conservative and consistent: scores 0-10 with one decimal; keep relative order
defensible. Do NOT invent regulators or fees — preserve provided metric/url and the
sponsored flag exactly. Blurbs: <= 6 words, native phrasing in en/fa/ar/tr.`;

const schema = {
  type: "object",
  properties: {
    entries: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          blurb: localizedSchema,
          score: { type: "number" },
          metric: { type: "string" },
          url: { type: "string" },
          sponsored: { type: "boolean" },
        },
        required: ["name", "blurb", "score", "metric", "url", "sponsored"],
        additionalProperties: false,
      },
    },
  },
  required: ["entries"],
  additionalProperties: false,
} as const;

export async function rerank(table: RankingTable): Promise<RankingTable> {
  const prompt = `Kind: ${table.kind}
Current table (JSON):
${JSON.stringify(table.entries, null, 2)}

Re-score and refresh localized blurbs (${LANGS.join(", ")}). Keep metric/url/sponsored.`;

  const { entries } = await callClaudeJSON<{ entries: RankedEntity[] }>({
    system: SYSTEM.replace("{kind}", table.kind),
    prompt,
    schema,
    toolName: "rerank",
    temperature: 0.3,
    maxTokens: 4000,
  });

  entries.sort((a, b) => b.score - a.score);
  return { ...table, updated: new Date().toISOString().slice(0, 10), entries };
}
