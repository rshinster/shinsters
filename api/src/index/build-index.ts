import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Page } from "./page.ts";
import { parseHtml } from "./parse-html.ts";

const SKIPPED_FILES = new Set(["404.html"]);

export async function buildIndex(webRoot: string): Promise<Page[]> {
  const files = await listHtmlFiles(webRoot);
  const pages: Page[] = [];
  for (const file of files) {
    const page = await readPage(webRoot, file);
    if (page) {
      pages.push(page);
    }
  }
  return pages;
}

export function toUrl(relativeFile: string): string {
  const posixFile = relativeFile.split(path.sep).join("/");
  if (posixFile === "index.html") {
    return "/";
  }
  if (posixFile.endsWith("/index.html")) {
    const folder = posixFile.slice(0, -"index.html".length);
    return `/${folder}`;
  }
  return `/${posixFile}`;
}

async function listHtmlFiles(webRoot: string): Promise<string[]> {
  const entries = await readdir(webRoot, { recursive: true });
  const htmlFiles = entries.filter((entry) => entry.endsWith(".html"));
  const indexable = htmlFiles.filter((file) => !SKIPPED_FILES.has(file));
  return indexable.sort();
}

async function readPage(webRoot: string, file: string): Promise<Page | undefined> {
  const html = await readFile(path.join(webRoot, file), "utf8");
  const parsed = parseHtml(html);
  if (parsed.isRedirect) {
    return undefined;
  }
  return {
    url: toUrl(file),
    title: parsed.title,
    description: parsed.description,
    lang: parsed.lang,
    headings: parsed.headings,
    text: parsed.text,
    visibility: "public",
  };
}
