import type { Model, ModelRequest, ModelResponse, ToolCall } from "../../src/agent/model.ts";

export interface ScriptedStep {
  content?: string;
  toolCalls?: ToolCall[];
}

export interface ScriptedModel extends Model {
  // A copy of each request, in order, to check what the agent sent.
  requests: ModelRequest[];
}

const STEP_USAGE = { inputTokens: 100, outputTokens: 10 };

// Fake model for tests: replays the given steps, then repeats the last one.
export function createScriptedModel(steps: ScriptedStep[]): ScriptedModel {
  const requests: ModelRequest[] = [];
  return {
    requests,
    async complete(request: ModelRequest): Promise<ModelResponse> {
      const snapshot = { messages: [...request.messages], tools: request.tools };
      requests.push(snapshot);
      const index = Math.min(requests.length, steps.length) - 1;
      const step = steps[index] ?? {};
      return {
        content: step.content ?? "",
        toolCalls: step.toolCalls ?? [],
        usage: STEP_USAGE,
      };
    },
  };
}
