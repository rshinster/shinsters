import { findTool, TOOLS } from "../tools/registry.ts";
import { type Tool, type ToolContext, toJsonSchema } from "../tools/tool.ts";
import { extractLinks, type ReplyLink } from "./links.ts";
import type { ChatMessage, Model, ToolCall, ToolSpec, Usage } from "./model.ts";
import { SYSTEM_PROMPT } from "./prompt.ts";

const DEFAULT_MAX_STEPS = 5;

// Shown when the model gives no usable answer (step limit reached, or an empty reply).
export const FALLBACK_REPLY =
  "Sorry, I could not find an answer this time. Could you rephrase your question?";

// The conversation as the visitor sees it: their messages and the guide's replies.
export interface VisitorMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AgentRun {
  model: Model;
  context: ToolContext;
  messages: VisitorMessage[];
  // Model calls allowed for one reply; each call may run several tools.
  maxSteps?: number;
}

export interface ToolTrace {
  name: string;
  input: unknown;
  ok: boolean;
}

export interface AgentReply {
  status: "answered" | "max_steps" | "empty";
  text: string;
  links: ReplyLink[];
  tools: ToolTrace[];
  usage: Usage;
  steps: number;
}

interface ToolOutcome {
  ok: boolean;
  content: string;
}

export async function runAgent(run: AgentRun): Promise<AgentReply> {
  const maxSteps = run.maxSteps ?? DEFAULT_MAX_STEPS;
  const tools = TOOLS.map(toToolSpec);
  const history = run.messages.map(toChatMessage);
  const conversation: ChatMessage[] = [{ role: "system", content: SYSTEM_PROMPT }, ...history];
  const trace: ToolTrace[] = [];
  const usage: Usage = { inputTokens: 0, outputTokens: 0 };

  for (let step = 1; step <= maxSteps; step++) {
    const response = await run.model.complete({ messages: conversation, tools });
    usage.inputTokens += response.usage.inputTokens;
    usage.outputTokens += response.usage.outputTokens;
    conversation.push({
      role: "assistant",
      content: response.content,
      toolCalls: response.toolCalls,
    });

    if (response.toolCalls.length === 0) {
      const parts = extractLinks(response.content, run.context);
      if (!parts.text) {
        return {
          status: "empty",
          text: FALLBACK_REPLY,
          links: [],
          tools: trace,
          usage,
          steps: step,
        };
      }
      return { status: "answered", ...parts, tools: trace, usage, steps: step };
    }

    for (const call of response.toolCalls) {
      const outcome = await callTool(call, run.context);
      trace.push({ name: call.name, input: call.input, ok: outcome.ok });
      conversation.push({ role: "tool", toolCallId: call.id, content: outcome.content });
    }
  }

  return {
    status: "max_steps",
    text: FALLBACK_REPLY,
    links: [],
    tools: trace,
    usage,
    steps: maxSteps,
  };
}

function toToolSpec(tool: Tool): ToolSpec {
  const { $schema: _dialect, ...parameters } = toJsonSchema(tool);
  return { name: tool.name, description: tool.description, parameters };
}

function toChatMessage(message: VisitorMessage): ChatMessage {
  if (message.role === "assistant") {
    return { role: "assistant", content: message.content, toolCalls: [] };
  }
  return { role: "user", content: message.content };
}

// Errors go back to the model as text so it can retry or explain; only bugs throw.
async function callTool(call: ToolCall, context: ToolContext): Promise<ToolOutcome> {
  const tool = findTool(call.name);
  if (!tool) {
    return { ok: false, content: `Error: unknown tool ${call.name}.` };
  }
  const result = await tool.call(call.input, context);
  if (!result.ok) {
    return { ok: false, content: `Error: ${result.error}` };
  }
  const content = JSON.stringify(result.data);
  return { ok: true, content };
}
