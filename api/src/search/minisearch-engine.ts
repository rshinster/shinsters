import MiniSearch from "minisearch";
import type { Page } from "../index/page.ts";
import type { SearchEngine, SearchResult } from "./engine.ts";

const SEARCH_FIELDS = ["title", "headings", "description", "text"];

const FIELD_BOOST = {
  title: 3,
  headings: 2,
  description: 2,
  text: 1,
};

export async function createMiniSearchEngine(pages: Page[]): Promise<SearchEngine> {
  const index = new MiniSearch<Page>({
    idField: "url",
    fields: SEARCH_FIELDS,
    storeFields: ["url", "title", "description"],
    extractField: readField,
    processTerm: normalizeTerm,
    searchOptions: {
      boost: FIELD_BOOST,
      prefix: true,
      fuzzy: 0.2,
    },
  });
  index.addAll(pages);

  return {
    async search(query: string, limit: number): Promise<SearchResult[]> {
      const hits = index.search(query);
      const top = hits.slice(0, limit);
      return top.map((hit) => {
        return {
          url: hit.url,
          title: hit.title,
          description: hit.description,
          score: hit.score,
        };
      });
    },
  };
}

function readField(page: Page, field: string): string {
  const value = page[field as keyof Page];
  if (Array.isArray(value)) {
    return value.join(" ");
  }
  return String(value ?? "");
}

// MiniSearch only lowercases by default; strip accents so "ecole" finds "École".
function normalizeTerm(term: string): string {
  const decomposed = term.normalize("NFD");
  const withoutAccents = decomposed.replace(/\p{M}/gu, "");
  return withoutAccents.toLowerCase();
}
