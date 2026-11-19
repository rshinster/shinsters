import { canView, type Viewer } from "../access/viewer.ts";
import type { SearchEngine, SearchResult } from "./engine.ts";

export const DEFAULT_LIMIT = 5;
export const MAX_LIMIT = 10;

export interface SearchPagesOptions {
  query: string;
  limit: number;
  viewer: Viewer;
  // Only this user's pages and files when set.
  user?: string;
}

// Expects validated input (see the search_pages tool); filters out pages the viewer may not see.
export async function searchPages(
  engine: SearchEngine,
  options: SearchPagesOptions,
): Promise<SearchResult[]> {
  return engine.search(options.query, {
    limit: options.limit,
    accept: (result) => isWanted(result, options),
  });
}

function isWanted(result: SearchResult, options: SearchPagesOptions): boolean {
  if (!canView(options.viewer, result)) {
    return false;
  }
  if (options.user === undefined) {
    return true;
  }
  return result.owner === options.user;
}
