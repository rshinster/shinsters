import { z } from "zod";
import type { ModelConfig } from "../config.ts";
import type { ChatMessage, Model, ModelRequest, ModelResponse, ToolCall } from "./model.ts";

// Caps one model call; a guide reply is a few sentences.
export const MAX_OUTPUT_TOKENS = 1000;
export const TIMEOUT_MS = 60_000;
const ERROR_BODY_LENGTH = 300;
const OMIT_REASONING_EFFORT = "omit";

export class ModelError extends Error {}

const ResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().nullish(),
          tool_calls: z
            .array(
              z.object({
                id: z.string(),
                function: z.object({ name: z.string(), arguments: z.string() }),
              }),
            )
            .nullish(),
        }),
      }),
    )
    .min(1),
  usage: z.object({ prompt_tokens: z.number(), completion_tokens: z.number() }).nullish(),
});

type WireResponse = z.infer<typeof ResponseSchema>;

// Chat completions API, as spoken by Ollama, OpenAI and many hosted providers.
export function createOpenAiCompatibleModel(config: ModelConfig): Model {
  const url = `${config.baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }

  return {
    async complete(request: ModelRequest): Promise<ModelResponse> {
      const body = toWireRequest(config, request);
      const response = await send(url, { method: "POST", headers, body });
      const parsed = ResponseSchema.safeParse(response);
      if (!parsed.success) {
        throw new ModelError(`unexpected model response:\n${z.prettifyError(parsed.error)}`);
      }
      return fromWireResponse(parsed.data);
    },
  };
}

function toWireRequest(config: ModelConfig, request: ModelRequest): string {
  const tools = request.tools.map((tool) => {
    return {
      type: "function",
      function: { name: tool.name, description: tool.description, parameters: tool.parameters },
    };
  });
  const wire: Record<string, unknown> = {
    model: config.name,
    messages: request.messages.map(toWireMessage),
    tools,
    max_tokens: MAX_OUTPUT_TOKENS,
  };
  if (config.reasoningEffort !== OMIT_REASONING_EFFORT) {
    wire.reasoning_effort = config.reasoningEffort;
  }
  return JSON.stringify(wire);
}

function toWireMessage(message: ChatMessage): Record<string, unknown> {
  if (message.role === "tool") {
    return { role: "tool", tool_call_id: message.toolCallId, content: message.content };
  }
  if (message.role === "assistant" && message.toolCalls.length > 0) {
    const toolCalls = message.toolCalls.map((call) => {
      const args = typeof call.input === "string" ? call.input : JSON.stringify(call.input);
      return { id: call.id, type: "function", function: { name: call.name, arguments: args } };
    });
    return { role: "assistant", content: message.content, tool_calls: toolCalls };
  }
  return { role: message.role, content: message.content };
}

function fromWireResponse(response: WireResponse): ModelResponse {
  const message = response.choices[0]?.message;
  const wireCalls = message?.tool_calls ?? [];
  const toolCalls: ToolCall[] = wireCalls.map((call) => {
    const input = parseArguments(call.function.arguments);
    return { id: call.id, name: call.function.name, input };
  });
  return {
    content: message?.content ?? "",
    toolCalls,
    usage: {
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    },
  };
}

// Invalid JSON stays a string, so the tool rejects it with a readable error for the model.
function parseArguments(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

async function send(url: string, init: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    const signal = AbortSignal.timeout(TIMEOUT_MS);
    response = await fetch(url, { ...init, signal });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new ModelError(`model unreachable at ${url}: ${reason}`);
  }
  if (!response.ok) {
    const text = await response.text();
    const excerpt = text.slice(0, ERROR_BODY_LENGTH);
    throw new ModelError(`model request failed (${response.status}): ${excerpt}`);
  }
  try {
    return await response.json();
  } catch {
    throw new ModelError("model response is not JSON");
  }
}
