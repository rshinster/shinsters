import { SITE_ORIGIN } from "../site.ts";
import type { Page } from "./page.ts";

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
  const site = new URL(SITE_ORIGIN);
  const parsed = URL.parse(urlOrPath.trim(), SITE_ORIGIN);
  if (!parsed || parsed.host !== site.host) {
    return [];
  }
  const path = decodePath(parsed.pathname);
  const lastSegment = path.split("/").at(-1) ?? "";
  const looksLikeFolder = !path.endsWith("/") && !lastSegment.includes(".");
  if (looksLikeFolder) {
    return [path, `${path}/`];
  }
  return [path];
}

function decodePath(pathname: string): string {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}
