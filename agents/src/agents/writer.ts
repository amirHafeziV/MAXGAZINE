import { callClaudeJSON } from "../anthropic.js";
import { marketSnapshot } from "../tools/markets.js";
import { CATEGORIES, slugify } from "./_schema.js";
import type { Draft, Lead } from "../types.js";

const SYSTEM = `You are a senior markets writer for MAXGAZINE.
Write a tight, factual news article in English from the given lead. Rules:
- Lead with the news; no hype, no financial advice, no price predictions stated as fact.
- 400-650 words. Markdown body: short paragraphs, optional ## subheads, no H1.
- Ground every number in the provided live snapshot or the cited sources.
- Neutral, international register (readers in 4 languages will read translations).
- End with a one-line "Why it matters" takeaway (no heading).`;

const schema = {
  type: "object",
  properties: {
    headline: { type: "string" },
    dek: { type: "string", description: "One-sentence standfirst." },
    category: { type: "string", enum: [...CATEGORIES] },
    body: { type: "string", description: "Markdown, no H1." },
  },
  required: ["headline", "dek", "category", "body"],
  additionalProperties: false,
} as const;

export async function write(lead: Lead): Promise<Draft> {
  const snapshot = await marketSnapshot().catch(() => "Market snapshot unavailable.");
  const prompt = `Lead: ${lead.title}
Summary: ${lead.summary}
Suggested category: ${lead.category}

Live market snapshot (use for any figures):
${snapshot}

Sources:
${lead.sources.map((s) => `- ${s.title}: ${s.url}`).join("\n")}

Write the article.`;

  const out = await callClaudeJSON<Omit<Draft, "slug" | "sources">>({
    system: SYSTEM,
    prompt,
    schema,
    toolName: "write_article",
    temperature: 0.7,
    maxTokens: 3000,
  });

  return { ...out, slug: slugify(out.headline), sources: lead.sources };
}
