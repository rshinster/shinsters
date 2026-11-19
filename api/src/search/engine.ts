import type { Visibility } from "../index/page.ts";

export interface SearchResult {
  url: string;
  title: string;
  description: string;
  visibility: Visibility;
  score: number;
}

export interface EngineSearchOptions {
  limit: number;
  accept: (result: SearchResult) => boolean;
}

// Boundary between the search_pages tool and the library behind it.
export interface SearchEngine {
  search(query: string, options: EngineSearchOptions): Promise<SearchResult[]>;
}
