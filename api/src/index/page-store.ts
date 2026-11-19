import type { Page } from "./page.ts";
import { toSitePath } from "./site-path.ts";

export interface PageStore {
  get(urlOrPath: string): Page | undefined;
  list(): Page[];
}

export function createPageStore(pages: Page[]): PageStore {
  const byUrl = new Map<string, Page>();
  for (const page of pages) {
    byUrl.set(page.url, page);
  }

  return {
    get(urlOrPath: string): Page | undefined {
      const candidates = toCandidatePaths(urlOrPath);
      for (const candidate of candidates) {
        const page = byUrl.get(candidate);
        if (page) {
          return page;
        }
      }
      return undefined;
    },
    list(): Page[] {
      return [...byUrl.values()];
    },
  };
}

// Accepts "/rshin/profile/", "/rshin/profile" or "https://shinsters.fr/rshin/profile/".
function toCandidatePaths(urlOrPath: string): string[] {
  const trimmed = urlOrPath.trim();
  const path = toSitePath(trimmed, "/");
  if (path === undefined) {
    return [];
  }
  const lastSegment = path.split("/").at(-1) ?? "";
  const looksLikeFolder = !path.endsWith("/") && !lastSegment.includes(".");
  if (looksLikeFolder) {
    return [path, `${path}/`];
  }
  return [path];
}
