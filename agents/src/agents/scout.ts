import { callClaudeJSON } from "../anthropic.js";
import { config } from "../config.js";
import { fetchHeadlines } from "../tools/news.js";
import { marketSnapshot } from "../tools/markets.js";
import { CATEGORIES } from "./_schema.js";
import type { Lead } from "../types.js";

const SYSTEM = `You are the Scout for MAXGAZINE, a magazine covering crypto, forex,
technology and cars. Your job: from raw headlines and a live market snapshot, surface
the stories most worth covering RIGHT NOW. Prefer market-moving, verifiable,
non-duplicative topics. Use "tech" for technology/AI/hardware stories and "cars" for
automotive/EV stories; keep crypto and forex pieces in their existing categories.
Avoid hype, shills and pure price-prediction clickbait. Each lead must cite the
real source URLs it is based on. Score importance 0-100 by reader value + timeliness.`;

const schema = {
  type: "object",
  properties: {
    leads: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          category: { type: "string", enum: [...CATEGORIES] },
          importance: { type: "number" },
          sources: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                url: { type: "string" },
                publishedAt: { type: "string" },
              },
              required: ["title", "url"],
              additionalProperties: false,
            },
          },
        },
        required: ["title", "summary", "category", "importance", "sources"],
        additionalProperties: false,
      },
    },
  },
  required: ["leads"],
  additionalProperties: false,
} as const;

export async function scout(excludeTitles: string[] = []): Promise<Lead[]> {
  const [headlines, snapshot] = await Promise.all([
    fetchHeadlines(),
    marketSnapshot().catch(() => "Market snapshot unavailable."),
  ]);

  const headlineList = headlines
    .map((h, i) => `${i + 1}. ${h.title} — ${h.url}`)
    .join("\n");

  const prompt = `Live market snapshot:
${snapshot}

Recent headlines:
${headlineList || "(no headlines retrieved)"}

Already covered recently — do NOT re-propose these:
${excludeTitles.map((t) => `- ${t}`).join("\n") || "(none)"}

Propose the best leads to publish now.`;

  const { leads } = await callClaudeJSON<{ leads: Lead[] }>({
    model: config.models.fast,
    system: SYSTEM,
    prompt,
    schema,
    toolName: "propose_leads",
    maxTokens: 3000,
  });
  return leads.sort((a, b) => b.importance - a.importance);
}
