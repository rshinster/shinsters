import { existsSync } from "node:fs";
import { ANONYMOUS } from "../src/access/viewer.ts";
import { loadConfig } from "../src/config.ts";
import { readIndex } from "../src/index/store.ts";
import { resolveFromApiRoot } from "../src/paths.ts";
import { createToolContext } from "../src/tools/registry.ts";
import { searchPagesTool } from "../src/tools/search-pages-tool.ts";

const query = process.argv.slice(2).join(" ");

const config = loadConfig(process.env);
const indexPath = resolveFromApiRoot(config.indexPath);
if (!existsSync(indexPath)) {
  console.error(`No index at ${indexPath}. Run make api-index first.`);
  process.exit(1);
}
const pages = await readIndex(indexPath);
const context = await createToolContext(pages, ANONYMOUS);

// Same tool, validation and access rules as the model will use.
const result = await searchPagesTool.call({ query }, context);
console.log(JSON.stringify(result, null, 2));
if (!result.ok) {
  process.exit(1);
}
