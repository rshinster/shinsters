import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { ANONYMOUS, type Viewer } from "../src/access/viewer.ts";
import { FALLBACK_REPLY, runAgent } from "../src/agent/agent.ts";
import { extractLinks } from "../src/agent/links.ts";
import { SYSTEM_PROMPT } from "../src/agent/prompt.ts";
import { createToolContext, TOOLS } from "../src/tools/registry.ts";
import type { ToolContext } from "../src/tools/tool.ts";
import { PAGES } from "./fixtures/pages.ts";
import { createScriptedModel } from "./fixtures/scripted-model.ts";

const MEMBER: Viewer = { kind: "member", id: "rshin" };
const QUESTION = [{ role: "user" as const, content: "Can I see Alice's resume?" }];

let anonymous: ToolContext;
let member: ToolContext;

before(async () => {
  anonymous = await createToolContext(PAGES, ANONYMOUS);
  member = await createToolContext(PAGES, MEMBER);
});

describe("agent loop", () => {
  test("answers directly when the model calls no tool", async () => {
    const model = createScriptedModel([{ content: "Hello! Which user are you looking for?" }]);
    const reply = await runAgent({ model, context: anonymous, messages: QUESTION });
    assert.equal(reply.status, "answered");
    assert.equal(reply.text, "Hello! Which user are you looking for?");
    assert.deepEqual(reply.links, []);
    assert.deepEqual(reply.tools, []);
    assert.equal(reply.steps, 1);
    assert.deepEqual(reply.usage, { inputTokens: 100, outputTokens: 10 });
  });

  test("sends the system prompt, the visitor messages and every tool", async () => {
    const model = createScriptedModel([{ content: "Hi." }]);
    const messages = [
      { role: "user" as const, content: "Professional work?" },
      { role: "assistant" as const, content: "For which user?" },
      { role: "user" as const, content: "alice" },
    ];
    await runAgent({ model, context: anonymous, messages });
    const request = model.requests[0];
    assert.ok(request);
    assert.deepEqual(request.messages, [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: "Professional work?" },
      { role: "assistant", content: "For which user?", toolCalls: [] },
      { role: "user", content: "alice" },
    ]);
    const names = request.tools.map((tool) => tool.name);
    const toolNames = TOOLS.map((tool) => tool.name);
    assert.deepEqual(names, toolNames);
    for (const tool of request.tools) {
      assert.equal(tool.parameters.type, "object", tool.name);
      assert.equal("$schema" in tool.parameters, false, tool.name);
    }
  });

  test("runs a tool, sends its result back, then answers with a link", async () => {
    const model = createScriptedModel([
      { toolCalls: [{ id: "call_1", name: "search_pages", input: { query: "resume" } }] },
      { content: "Here it is: [Resume](/alice/profile/resume.pdf)." },
    ]);
    const reply = await runAgent({ model, context: anonymous, messages: QUESTION });
    const toolMessage = model.requests[1]?.messages.at(-1);
    assert.equal(toolMessage?.role, "tool");
    assert.match(toolMessage?.role === "tool" ? toolMessage.content : "", /resume\.pdf/);
    assert.equal(reply.status, "answered");
    assert.equal(reply.text, "Here it is: Resume.");
    assert.deepEqual(reply.links, [
      { url: "/alice/profile/resume.pdf", title: "Download resume (PDF)", kind: "file" },
    ]);
    assert.deepEqual(reply.tools, [{ name: "search_pages", input: { query: "resume" }, ok: true }]);
    assert.equal(reply.steps, 2);
    assert.deepEqual(reply.usage, { inputTokens: 200, outputTokens: 20 });
  });

  test("tool errors go back to the model as text", async () => {
    const model = createScriptedModel([
      {
        toolCalls: [
          { id: "call_1", name: "search_pages", input: { limit: 1000 } },
          { id: "call_2", name: "delete_everything", input: {} },
          { id: "call_3", name: "get_page", input: "{not json" },
        ],
      },
      { content: "Sorry, I could not find it." },
    ]);
    const reply = await runAgent({ model, context: anonymous, messages: QUESTION });
    const toolMessages = model.requests[1]?.messages.filter((message) => message.role === "tool");
    const contents = toolMessages?.map((message) => {
      return message.role === "tool" ? message.content : "";
    });
    assert.equal(contents?.length, 3);
    assert.match(contents?.[0] ?? "", /^Error: Invalid input for search_pages/);
    assert.equal(contents?.[1], "Error: unknown tool delete_everything.");
    assert.match(contents?.[2] ?? "", /^Error: Invalid input for get_page/);
    const outcomes = reply.tools.map((tool) => tool.ok);
    assert.deepEqual(outcomes, [false, false, false]);
    assert.equal(reply.status, "answered");
  });

  test("an empty answer becomes the fallback reply", async () => {
    const model = createScriptedModel([{ content: "  " }]);
    const reply = await runAgent({ model, context: anonymous, messages: QUESTION });
    assert.equal(reply.status, "empty");
    assert.equal(reply.text, FALLBACK_REPLY);
    assert.deepEqual(reply.links, []);
  });

  test("stops after the maximum number of steps", async () => {
    const model = createScriptedModel([
      { toolCalls: [{ id: "call", name: "platform_info", input: {} }] },
    ]);
    const reply = await runAgent({ model, context: anonymous, messages: QUESTION, maxSteps: 3 });
    assert.equal(model.requests.length, 3);
    assert.equal(reply.status, "max_steps");
    assert.equal(reply.text, FALLBACK_REPLY);
    assert.deepEqual(reply.links, []);
    assert.equal(reply.tools.length, 3);
  });
});

describe("reply links", () => {
  const text =
    "[Profile](/alice/profile) [Phishing](https://evil.example/login) " +
    "[Roadmap](/members/roadmap/) [Made up](/alice/secret/) " +
    "[Again](https://shinsters.fr/alice/profile/)";

  test("only indexed pages the viewer may see become links, once each", () => {
    const parts = extractLinks(text, anonymous);
    const urls = parts.links.map((link) => link.url);
    assert.deepEqual(urls, ["/alice/profile/"]);
  });

  test("the text keeps the labels and loses every url", () => {
    const parts = extractLinks(text, anonymous);
    assert.equal(parts.text, "Profile Phishing Roadmap Made up Again");
  });

  test("members also get links to private pages", () => {
    const parts = extractLinks(text, member);
    const urls = parts.links.map((link) => link.url);
    assert.deepEqual(urls, ["/alice/profile/", "/members/roadmap/"]);
  });
});
