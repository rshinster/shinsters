import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { type Page, PageSchema } from "./page.ts";

const IndexSchema = z.array(PageSchema);

export async function writeIndex(file: string, pages: Page[]): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const json = JSON.stringify(pages, null, 2);
  await writeFile(file, `${json}\n`);
}

export async function readIndex(file: string): Promise<Page[]> {
  const json = await readFile(file, "utf8");
  const data: unknown = JSON.parse(json);
  const result = IndexSchema.safeParse(data);
  if (!result.success) {
    const details = z.prettifyError(result.error);
    throw new Error(`invalid index file ${file}:\n${details}`);
  }
  return result.data;
}
