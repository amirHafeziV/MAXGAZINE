import { callClaudeJSON } from "../anthropic.js";
import { LANGS } from "../config.js";
import { marketSnapshot } from "../tools/markets.js";
import { localizedSchema } from "./_schema.js";
import type { Forecast, ForecastSet } from "../types.js";

const SYSTEM = `You are MAXGAZINE's Future desk (premium forecasts).
Given a live market snapshot, produce probabilistic directional calls for the
listed assets. Rules:
- bias is one of bullish/bearish/neutral; confidence 0-100 = model conviction, NOT certainty.
- thesis: <= 12 words, native phrasing in en/fa/ar/tr; never phrase as a guarantee.
- These are clearly-labelled forecasts, not financial advice.`;

const schema = {
  type: "object",
  properties: {
    forecasts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          asset: { type: "string" },
          thesis: localizedSchema,
          bias: { type: "string", enum: ["bullish", "bearish", "neutral"] },
          confidence: { type: "number" },
        },
        required: ["asset", "thesis", "bias", "confidence"],
        additionalProperties: false,
      },
    },
  },
  required: ["forecasts"],
  additionalProperties: false,
} as const;

const DEFAULT_ASSETS = ["BTC", "ETH", "SOL", "EUR/USD", "USD/JPY"];

export async function forecast(assets: string[] = DEFAULT_ASSETS): Promise<ForecastSet> {
  const snapshot = await marketSnapshot().catch(() => "Market snapshot unavailable.");
  const prompt = `Live market snapshot:
${snapshot}

Produce one forecast per asset: ${assets.join(", ")}.
Localize the thesis into ${LANGS.join(", ")}.`;

  const { forecasts } = await callClaudeJSON<{ forecasts: Forecast[] }>({
    system: SYSTEM,
    prompt,
    schema,
    toolName: "forecast",
    temperature: 0.5,
    maxTokens: 3000,
  });

  return { updated: new Date().toISOString().slice(0, 10), forecasts };
}
