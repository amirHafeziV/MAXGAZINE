import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: config.anthropicApiKey });
  return _client;
}

export interface CallOptions {
  model?: string;
  system: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

/** Plain text completion. */
export async function callClaude(opts: CallOptions): Promise<string> {
  const msg = await client().messages.create({
    model: opts.model ?? config.models.writer,
    max_tokens: opts.maxTokens ?? 4096,
    temperature: opts.temperature ?? 0.7,
    system: opts.system,
    messages: [{ role: "user", content: opts.prompt }],
  });
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

/**
 * Structured output. We force the model to emit a single tool call whose input
 * matches `schema`, which the SDK validates shape-wise. This is more reliable
 * than parsing prose JSON.
 */
export async function callClaudeJSON<T>(
  opts: CallOptions & { schema: Record<string, unknown>; toolName?: string },
): Promise<T> {
  const toolName = opts.toolName ?? "emit";
  const msg = await client().messages.create({
    model: opts.model ?? config.models.writer,
    max_tokens: opts.maxTokens ?? 4096,
    temperature: opts.temperature ?? 0.4,
    system: opts.system,
    messages: [{ role: "user", content: opts.prompt }],
    tools: [
      {
        name: toolName,
        description: "Return the result in the required structured form.",
        // Schemas are built dynamically per agent; pass through as-is.
        input_schema: opts.schema as any,
      },
    ],
    tool_choice: { type: "tool", name: toolName },
  });
  const tool = msg.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!tool) throw new Error(`Model did not return a "${toolName}" tool call`);
  return tool.input as T;
}
