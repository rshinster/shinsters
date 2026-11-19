import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { Page } from "./page.ts";
import { type Link, parseHtml } from "./parse-html.ts";
import { toSitePath } from "./site-path.ts";

const SKIPPED_FILES = new Set(["404.html"]);

// Linked files worth indexing; other links (pages, images, other sites) are ignored.
const FILE_EXTENSIONS = new Set([".pdf"]);

interface Site {
  webRoot: string;
  users: string[];
}

interface ReadPage {
  page: Page;
  links: Link[];
}

// Pages first (sorted by file), then the files they link to, each file once.
export async function buildIndex(webRoot: string, users: string[]): Promise<Page[]> {
  const site: Site = { webRoot, users };
  const htmlFiles = await listHtmlFiles(webRoot);
  const pages: Page[] = [];
  const linkedFiles = new Map<string, Page>();
  for (const htmlFile of htmlFiles) {
    const read = await readPage(site, htmlFile);
    if (!read) {
      continue;
    }
    pages.push(read.page);
    for (const link of read.links) {
      const linked = await readLinkedFile(site, read.page, link);
      if (linked && !linkedFiles.has(linked.url)) {
        linkedFiles.set(linked.url, linked);
      }
    }
  }
  return [...pages, ...linkedFiles.values()];
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

// "/rshin/profile/" belongs to "rshin" when rshin is a user; gateway pages belong to no one.
export function ownerOf(url: string, users: string[]): string | null {
  const firstSegment = url.split("/")[1] ?? "";
  if (users.includes(firstSegment)) {
    return firstSegment;
  }
  return null;
}

async function listHtmlFiles(webRoot: string): Promise<string[]> {
  const entries = await readdir(webRoot, { recursive: true });
  const htmlFiles = entries.filter((entry) => entry.endsWith(".html"));
  const indexable = htmlFiles.filter((file) => !SKIPPED_FILES.has(file));
  return indexable.sort();
}

async function readPage(site: Site, file: string): Promise<ReadPage | undefined> {
  const html = await readFile(path.join(site.webRoot, file), "utf8");
  const parsed = parseHtml(html);
  if (parsed.isRedirect) {
    return undefined;
  }
  const url = toUrl(file);
  const page: Page = {
    url,
    kind: "page",
    owner: ownerOf(url, site.users),
    title: parsed.title,
    description: parsed.description,
    lang: parsed.lang,
    headings: parsed.headings,
    text: parsed.text,
    visibility: "public",
  };
  return { page, links: parsed.links };
}

// A file is indexed only if a page links to it and it exists in webRoot.
async function readLinkedFile(site: Site, from: Page, link: Link): Promise<Page | undefined> {
  const url = toSitePath(link.href, from.url);
  if (url === undefined) {
    return undefined;
  }
  const extension = path.posix.extname(url).toLowerCase();
  if (!FILE_EXTENSIONS.has(extension)) {
    return undefined;
  }
  const exists = await isFileInside(site.webRoot, url);
  if (!exists) {
    return undefined;
  }
  const title = link.text || path.posix.basename(url);
  return {
    url,
    kind: "file",
    owner: ownerOf(url, site.users),
    title,
    description: `File linked from ${from.title}.`,
    lang: from.lang,
    headings: [],
    text: "",
    visibility: from.visibility,
  };
}

async function isFileInside(webRoot: string, url: string): Promise<boolean> {
  const root = path.resolve(webRoot);
  const target = path.join(root, url);
  if (!target.startsWith(root + path.sep)) {
    return false;
  }
  try {
    const info = await stat(target);
    return info.isFile();
  } catch {
    return false;
  }
}
