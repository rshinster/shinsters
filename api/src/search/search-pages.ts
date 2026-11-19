import type { SearchEngine, SearchResult } from "./engine.ts";

export const DEFAULT_LIMIT = 5;
export const MAX_LIMIT = 10;

export interface SearchPagesOptions {
  query: string;
  limit?: number;
}

// Input rules for the search_pages tool, independent of the engine.
export async function searchPages(
  engine: SearchEngine,
  options: SearchPagesOptions,
): Promise<SearchResult[]> {
  const query = options.query.trim();
  if (!query) {
    return [];
  }
  const limit = clampLimit(options.limit);
  return engine.search(query, limit);
}

function clampLimit(limit: number | undefined): number {
  if (limit === undefined) {
    return DEFAULT_LIMIT;
  }
  const whole = Math.floor(limit);
  return Math.min(Math.max(whole, 1), MAX_LIMIT);
}
