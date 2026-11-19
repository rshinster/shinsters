import assert from "node:assert/strict";
import { createServer, type IncomingHttpHeaders, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, beforeEach, describe, test } from "node:test";
import type { ModelRequest } from "../src/agent/model.ts";
import {
  createOpenAiCompatibleModel,
  MAX_OUTPUT_TOKENS,
  ModelError,
} from "../src/agent/openai-compatible-model.ts";
import type { ModelConfig } from "../src/config.ts";

interface Received {
  url: string;
  headers: IncomingHttpHeaders;
  body: Record<string, unknown>;
}

interface Reply {
  status: number;
  body: string;
}

const TOOL_CALL_REPLY = {
  choices: [
    {
      message: {
        content: "",
        tool_calls: [
          { id: "call_1", type: "function", function: { name: "list_users", arguments: "{}" } },
          { id: "call_2", type: "function", function: { name: "get_page", arguments: "{oops" } },
        ],
      },
    },
  ],
  usage: { prompt_tokens: 120, completion_tokens: 15 },
};

const REQUEST: ModelRequest = {
  messages: [
    { role: "system", content: "Be a guide." },
    { role: "user", content: "Who is here?" },
    {
      role: "assistant",
      content: "",
      toolCalls: [{ id: "call_0", name: "search_pages", input: { query: "cv" } }],
    },
    { role: "tool", toolCallId: "call_0", content: '{"pages":[]}' },
  ],
  tools: [{ name: "list_users", description: "List users.", parameters: { type: "object" } }],
};

// Stands in for the provider: records each request and sends the next reply.
let server: Server;
let baseUrl = "";
let received: Received[] = [];
let nextReply: Reply = { status: 200, body: "{}" };

before(async () => {
  server = createServer((request, response) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
    });
    request.on("end", () => {
      received.push({ url: request.url ?? "", headers: request.headers, body: JSON.parse(raw) });
      response.writeHead(nextReply.status, { "Content-Type": "application/json" });
      response.end(nextReply.body);
    });
  });
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}/v1/`;
});

after(() => {
  server.close();
});

beforeEach(() => {
  received = [];
  nextReply = { status: 200, body: JSON.stringify(TOOL_CALL_REPLY) };
});

function configWith(overrides: Partial<ModelConfig>): ModelConfig {
  return { baseUrl, name: "test-model", apiKey: "", reasoningEffort: "none", ...overrides };
}

describe("OpenAI-compatible model", () => {
  test("sends messages, tools and limits in the chat completions format", async () => {
    const model = createOpenAiCompatibleModel(configWith({}));
    await model.complete(REQUEST);
    const sent = received[0];
    assert.ok(sent);
    assert.equal(sent.url, "/v1/chat/completions");
    assert.equal(sent.headers.authorization, undefined);
    assert.equal(sent.body.model, "test-model");
    assert.equal(sent.body.max_tokens, MAX_OUTPUT_TOKENS);
    assert.equal(sent.body.reasoning_effort, "none");
    assert.deepEqual(sent.body.tools, [
      {
        type: "function",
        function: {
          name: "list_users",
          description: "List users.",
          parameters: { type: "object" },
        },
      },
    ]);
    assert.deepEqual(sent.body.messages, [
      { role: "system", content: "Be a guide." },
      { role: "user", content: "Who is here?" },
      {
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "call_0",
            type: "function",
            function: { name: "search_pages", arguments: '{"query":"cv"}' },
          },
        ],
      },
      { role: "tool", tool_call_id: "call_0", content: '{"pages":[]}' },
    ]);
  });

  test("sends the key only when set, and can omit reasoning_effort", async () => {
    const model = createOpenAiCompatibleModel(
      configWith({ apiKey: "test-key", reasoningEffort: "omit" }),
    );
    await model.complete(REQUEST);
    const sent = received[0];
    assert.equal(sent?.headers.authorization, "Bearer test-key");
    assert.equal("reasoning_effort" in (sent?.body ?? {}), false);
  });

  test("reads tool calls and usage; invalid JSON arguments stay a string", async () => {
    const model = createOpenAiCompatibleModel(configWith({}));
    const response = await model.complete(REQUEST);
    assert.equal(response.content, "");
    assert.deepEqual(response.toolCalls, [
      { id: "call_1", name: "list_users", input: {} },
      { id: "call_2", name: "get_page", input: "{oops" },
    ]);
    assert.deepEqual(response.usage, { inputTokens: 120, outputTokens: 15 });
  });

  test("reads a text answer without usage", async () => {
    const answer = { choices: [{ message: { content: "Hello.", tool_calls: null } }] };
    nextReply = { status: 200, body: JSON.stringify(answer) };
    const model = createOpenAiCompatibleModel(configWith({}));
    const response = await model.complete(REQUEST);
    assert.equal(response.content, "Hello.");
    assert.deepEqual(response.toolCalls, []);
    assert.deepEqual(response.usage, { inputTokens: 0, outputTokens: 0 });
  });

  test("HTTP errors, bad responses and an unreachable server throw ModelError", async () => {
    const model = createOpenAiCompatibleModel(configWith({}));
    nextReply = { status: 429, body: '{"error":"rate limited"}' };
    await assert.rejects(model.complete(REQUEST), (error: Error) => {
      return error instanceof ModelError && /\(429\).*rate limited/.test(error.message);
    });
    nextReply = { status: 200, body: '{"choices":[]}' };
    await assert.rejects(model.complete(REQUEST), ModelError);
    nextReply = { status: 200, body: "not json" };
    await assert.rejects(model.complete(REQUEST), /not JSON/);
    const offline = createOpenAiCompatibleModel(configWith({ baseUrl: "http://127.0.0.1:1/v1" }));
    await assert.rejects(offline.complete(REQUEST), /unreachable/);
  });
});
