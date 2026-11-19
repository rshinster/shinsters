import type { Viewer } from "../access/viewer.ts";
import type { Page } from "../index/page.ts";
import { createPageStore } from "../index/page-store.ts";
import { createMiniSearchEngine } from "../search/minisearch-engine.ts";
import { getPageTool } from "./get-page-tool.ts";
import { listUsersTool } from "./list-users-tool.ts";
import { platformInfoTool } from "./platform-info-tool.ts";
import { searchPagesTool } from "./search-pages-tool.ts";
import type { Tool, ToolContext } from "./tool.ts";

export const TOOLS: Tool[] = [searchPagesTool, getPageTool, listUsersTool, platformInfoTool];

export function findTool(name: string): Tool | undefined {
  return TOOLS.find((tool) => tool.name === name);
}

export async function createToolContext(pages: Page[], viewer: Viewer): Promise<ToolContext> {
  const engine = await createMiniSearchEngine(pages);
  const store = createPageStore(pages);
  return { viewer, pages: store, engine };
}
