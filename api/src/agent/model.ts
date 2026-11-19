// Provider-neutral shapes between the agent loop and a model adapter.

export interface ToolCall {
  id: string;
  name: string;
  // Parsed JSON arguments; the raw string when the model sent invalid JSON (the tool rejects it).
  input: unknown;
}

export type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; toolCalls: ToolCall[] }
  | { role: "tool"; toolCallId: string; content: string };

export interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
}

export interface ModelRequest {
  messages: ChatMessage[];
  tools: ToolSpec[];
}

export interface ModelResponse {
  content: string;
  toolCalls: ToolCall[];
  usage: Usage;
}

export interface Model {
  complete(request: ModelRequest): Promise<ModelResponse>;
}
