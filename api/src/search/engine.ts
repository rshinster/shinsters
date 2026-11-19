export interface SearchResult {
  url: string;
  title: string;
  description: string;
  score: number;
}

// Boundary between the search_pages tool and the library behind it.
export interface SearchEngine {
  search(query: string, limit: number): Promise<SearchResult[]>;
}
