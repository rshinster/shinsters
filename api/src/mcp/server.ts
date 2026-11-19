import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { TOOLS } from "../tools/registry.ts";
import type { Tool, ToolContext, ToolResult } from "../tools/tool.ts";

export const SERVER_NAME = "shinsters";
export const SERVER_VERSION = "0.1.0";

// Exposes the same tools as the agent; each call goes through tool.call (validation + access).
export function createMcpServer(context: ToolContext): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  for (const tool of TOOLS) {
    registerTool(server, tool, context);
  }
  return server;
}

function registerTool(server: McpServer, tool: Tool, context: ToolContext): void {
  const config = {
    description: tool.description,
    inputSchema: tool.inputSchema,
  };
  server.registerTool(tool.name, config, async (args: unknown) => {
    const result = await tool.call(args, context);
    return toCallToolResult(result);
  });
}

function toCallToolResult(result: ToolResult): CallToolResult {
  if (!result.ok) {
    return {
      content: [{ type: "text", text: result.error }],
      isError: true,
    };
  }
  const text = JSON.stringify(result.data, null, 2);
  return {
    content: [{ type: "text", text }],
  };
}
