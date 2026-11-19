import MiniSearch from "minisearch";
import type { Page } from "../index/page.ts";
import type { EngineSearchOptions, SearchEngine, SearchResult } from "./engine.ts";

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
    storeFields: ["url", "title", "description", "visibility"],
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
    async search(query: string, options: EngineSearchOptions): Promise<SearchResult[]> {
      const hits = index.search(query);
      const results = hits.map((hit) => {
        return {
          url: hit.url,
          title: hit.title,
          description: hit.description,
          visibility: hit.visibility,
          score: hit.score,
        };
      });
      const accepted = results.filter(options.accept);
      return accepted.slice(0, options.limit);
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
