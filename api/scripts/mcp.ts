// MCP server over stdio. stdout carries the protocol, so log to stderr only.
import { existsSync } from "node:fs";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ANONYMOUS } from "../src/access/viewer.ts";
import { loadConfig } from "../src/config.ts";
import { readIndex } from "../src/index/store.ts";
import { createMcpServer } from "../src/mcp/server.ts";
import { resolveFromApiRoot } from "../src/paths.ts";
import { createToolContext } from "../src/tools/registry.ts";

const config = loadConfig(process.env);
const indexPath = resolveFromApiRoot(config.indexPath);
if (!existsSync(indexPath)) {
  console.error(`No index at ${indexPath}. Run make api-index first.`);
  process.exit(1);
}
const pages = await readIndex(indexPath);
const context = await createToolContext(pages, ANONYMOUS);

const server = createMcpServer(context);
const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`Shinsters MCP server ready (${pages.length} pages).`);
