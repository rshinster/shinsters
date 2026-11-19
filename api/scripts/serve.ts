// HTTP API: GET /health and POST /chat, as an anonymous visitor, with the model from the config.
import { existsSync } from "node:fs";
import { serve } from "@hono/node-server";
import { ANONYMOUS } from "../src/access/viewer.ts";
import { createOpenAiCompatibleModel } from "../src/agent/openai-compatible-model.ts";
import { loadConfig } from "../src/config.ts";
import { createApp } from "../src/http/app.ts";
import { readIndex } from "../src/index/store.ts";
import { resolveFromApiRoot } from "../src/paths.ts";
import { createToolContext } from "../src/tools/registry.ts";

const config = loadConfig(process.env);
const indexPath = resolveFromApiRoot(config.indexPath);
if (!existsSync(indexPath)) {
  console.error(`No index at ${indexPath}. Run make api-index first.`);
  process.exit(1);
}
const pages = await readIndex(indexPath);
const context = await createToolContext(pages, ANONYMOUS);
const model = createOpenAiCompatibleModel(config.model);
const app = createApp({ context, model, chat: config.chat });

const server = serve({ fetch: app.fetch, hostname: config.host, port: config.port }, (info) => {
  const state = config.chat.enabled ? "on" : "paused";
  console.log(`API on http://${info.address}:${info.port} (${pages.length} pages, chat ${state})`);
  console.log(`Model ${config.model.name} at ${config.model.baseUrl}`);
});

// Containers stop with SIGTERM: finish open requests, then exit. A second signal exits at once.
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    server.close(() => process.exit(0));
  });
}
