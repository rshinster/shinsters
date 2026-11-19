import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Page } from "./page.ts";

export async function writeIndex(file: string, pages: Page[]): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const json = JSON.stringify(pages, null, 2);
  await writeFile(file, `${json}\n`);
}

export async function readIndex(file: string): Promise<Page[]> {
  const json = await readFile(file, "utf8");
  const pages: unknown = JSON.parse(json);
  if (!Array.isArray(pages)) {
    throw new Error(`invalid index file: ${file}`);
  }
  return pages as Page[];
}
