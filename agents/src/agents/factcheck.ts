import { callClaudeJSON } from "../anthropic.js";
import { marketSnapshot } from "../tools/markets.js";
import type { Draft, FactCheck } from "../types.js";

const SYSTEM = `You are the Fact-Check desk for MAXGAZINE.
Verify the English draft against the live market snapshot and the cited sources.
Flag: wrong or stale numbers, claims not supported by sources, hype or advice framing,
and anything stated as certain that is actually speculation. If you can fix issues
without inventing facts, return a corrected body; otherwise list the issues.`;

const schema = {
  type: "object",
  properties: {
    ok: { type: "boolean" },
    issues: { type: "array", items: { type: "string" } },
    revisedBody: { type: "string", description: "Only if ok is false and fixable." },
  },
  required: ["ok", "issues"],
  additionalProperties: false,
} as const;

export async function factCheck(draft: Draft): Promise<FactCheck> {
  const snapshot = await marketSnapshot().catch(() => "Market snapshot unavailable.");
  const prompt = `Headline: ${draft.headline}
Dek: ${draft.dek}

Body:
${draft.body}

Sources:
${draft.sources.map((s) => `- ${s.title}: ${s.url}`).join("\n")}

Live market snapshot:
${snapshot}

Check it.`;

  return callClaudeJSON<FactCheck>({
    system: SYSTEM,
    prompt,
    schema,
    toolName: "report",
    temperature: 0.2,
    maxTokens: 3000,
  });
}
