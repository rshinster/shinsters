import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ANONYMOUS } from "../src/access/viewer.ts";
import { writeIndex } from "../src/index/store.ts";
import { createMcpServer } from "../src/mcp/server.ts";
import { API_ROOT } from "../src/paths.ts";
import { createToolContext } from "../src/tools/registry.ts";
import { PAGES } from "./fixtures/pages.ts";

const CLIENT_INFO = { name: "shinsters-test", version: "0.0.0" };

function textOf(result: Awaited<ReturnType<Client["callTool"]>>): string {
  const content = (result as CallToolResult).content;
  const first = content[0];
  assert.equal(first?.type, "text");
  return first?.type === "text" ? first.text : "";
}

describe("MCP server (in memory)", () => {
  const client = new Client(CLIENT_INFO);

  before(async () => {
    const context = await createToolContext(PAGES, ANONYMOUS);
    const server = createMcpServer(context);
    const [serverSide, clientSide] = InMemoryTransport.createLinkedPair();
    await server.connect(serverSide);
    await client.connect(clientSide);
  });

  after(async () => {
    await client.close();
  });

  test("lists the tools with descriptions and schemas", async () => {
    const listed = await client.listTools();
    const names = listed.tools.map((tool) => tool.name);
    assert.deepEqual(names, ["search_pages", "get_page", "list_users", "platform_info"]);
    for (const tool of listed.tools) {
      assert.ok(tool.description, tool.name);
      assert.equal(tool.inputSchema.type, "object", tool.name);
    }
  });

  test("search_pages schema keeps limit optional", async () => {
    const listed = await client.listTools();
    const search = listed.tools.find((tool) => tool.name === "search_pages");
    assert.deepEqual(search?.inputSchema.required, ["query"]);
  });

  test("calls search_pages and returns JSON text", async () => {
    const result = await client.callTool({ name: "search_pages", arguments: { query: "webserv" } });
    const data = JSON.parse(textOf(result));
    assert.equal(result.isError ?? false, false);
    assert.equal(data.pages[0].url, "/alice/profile/");
  });

  test("bad input comes back as a tool error, not a crash", async () => {
    const result = await client.callTool({ name: "search_pages", arguments: { limit: 1000 } });
    const text = textOf(result);
    assert.equal(result.isError, true);
    assert.match(text, /query|limit/);
  });

  test("private pages stay hidden over MCP", async () => {
    const result = await client.callTool({
      name: "get_page",
      arguments: { url: "/members/roadmap/" },
    });
    const text = textOf(result);
    assert.equal(result.isError, true);
    assert.equal(text, "No page at /members/roadmap/.");
  });

  test("unknown tools are rejected", async () => {
    const result = await client.callTool({ name: "delete_everything", arguments: {} });
    assert.equal(result.isError, true);
  });
});

describe("MCP server (real process over stdio)", () => {
  const client = new Client(CLIENT_INFO);
  let dir = "";

  before(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "shinsters-mcp-"));
    const indexPath = path.join(dir, "pages.json");
    await writeIndex(indexPath, PAGES);
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [path.join(API_ROOT, "scripts", "mcp.ts")],
      env: { INDEX_PATH: indexPath },
      stderr: "ignore",
    });
    await client.connect(transport);
  });

  after(async () => {
    await client.close();
    await rm(dir, { recursive: true, force: true });
  });

  test("starts, lists tools and answers a call", async () => {
    const listed = await client.listTools();
    const result = await client.callTool({ name: "platform_info", arguments: {} });
    const data = JSON.parse(textOf(result));
    assert.equal(listed.tools.length, 4);
    assert.equal(data.name, "Shinsters");
  });
});
