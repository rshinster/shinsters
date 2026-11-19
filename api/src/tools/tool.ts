import { z } from "zod";
import type { Viewer } from "../access/viewer.ts";
import type { PageStore } from "../index/page-store.ts";
import type { SearchEngine } from "../search/engine.ts";

export interface ToolContext {
  viewer: Viewer;
  pages: PageStore;
  engine: SearchEngine;
}

export type ToolResult = { ok: true; data: unknown } | { ok: false; error: string };

export interface ToolDefinition<Schema extends z.ZodType> {
  name: string;
  description: string;
  inputSchema: Schema;
  run(input: z.output<Schema>, context: ToolContext): Promise<unknown>;
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  call(rawInput: unknown, context: ToolContext): Promise<ToolResult>;
}

// An expected failure whose message is safe to show to the model and the user.
export class ToolError extends Error {}

export function defineTool<Schema extends z.ZodType>(definition: ToolDefinition<Schema>): Tool {
  return {
    name: definition.name,
    description: definition.description,
    inputSchema: definition.inputSchema,
    async call(rawInput: unknown, context: ToolContext): Promise<ToolResult> {
      const parsed = definition.inputSchema.safeParse(rawInput);
      if (!parsed.success) {
        const details = z.prettifyError(parsed.error);
        return { ok: false, error: `Invalid input for ${definition.name}:\n${details}` };
      }
      try {
        const data = await definition.run(parsed.data, context);
        return { ok: true, data };
      } catch (error) {
        if (error instanceof ToolError) {
          return { ok: false, error: error.message };
        }
        throw error;
      }
    },
  };
}

export function toJsonSchema(tool: Tool): Record<string, unknown> {
  return z.toJSONSchema(tool.inputSchema, { io: "input" });
}
