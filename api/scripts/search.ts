import { existsSync } from "node:fs";
import { loadConfig } from "../src/config.ts";
import { readIndex } from "../src/index/store.ts";
import { resolveFromApiRoot } from "../src/paths.ts";
import { createMiniSearchEngine } from "../src/search/minisearch-engine.ts";
import { searchPages } from "../src/search/search-pages.ts";

const query = process.argv.slice(2).join(" ");
if (!query.trim()) {
  console.error('Usage: make api-search q="your words"');
  process.exit(1);
}

const config = loadConfig(process.env);
const indexPath = resolveFromApiRoot(config.indexPath);
if (!existsSync(indexPath)) {
  console.error(`No index at ${indexPath}. Run make api-index first.`);
  process.exit(1);
}
const pages = await readIndex(indexPath);

const engine = await createMiniSearchEngine(pages);
const results = await searchPages(engine, { query });

if (results.length === 0) {
  console.log(`No page matches "${query}".`);
}
for (const result of results) {
  const score = result.score.toFixed(2);
  console.log(`${score}  ${result.url}  ${result.title}`);
}
