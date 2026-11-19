import { canView, type Viewer } from "../access/viewer.ts";
import type { SearchEngine, SearchResult } from "./engine.ts";

export const DEFAULT_LIMIT = 5;
export const MAX_LIMIT = 10;

export interface SearchPagesOptions {
  query: string;
  limit: number;
  viewer: Viewer;
}

// Expects validated input (see the search_pages tool); filters out pages the viewer may not see.
export async function searchPages(
  engine: SearchEngine,
  options: SearchPagesOptions,
): Promise<SearchResult[]> {
  return engine.search(options.query, {
    limit: options.limit,
    accept: (result) => canView(options.viewer, result),
  });
}
