import { loadConfig } from "../src/config.ts";
import { buildIndex } from "../src/index/build-index.ts";
import { writeIndex } from "../src/index/store.ts";
import { resolveFromApiRoot } from "../src/paths.ts";
import { USERS } from "../src/site.ts";

const config = loadConfig(process.env);
const webRoot = resolveFromApiRoot(config.webRoot);
const indexPath = resolveFromApiRoot(config.indexPath);

const pages = await buildIndex(webRoot, USERS);
await writeIndex(indexPath, pages);

console.log(`Indexed ${pages.length} pages and files from ${webRoot}`);
console.log(`Written to ${indexPath}`);
