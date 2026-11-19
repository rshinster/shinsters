// Chat with the guide in the terminal, as an anonymous visitor, using the model from the config.
import { existsSync } from "node:fs";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline";
import { ANONYMOUS } from "../src/access/viewer.ts";
import { type AgentReply, runAgent, type VisitorMessage } from "../src/agent/agent.ts";
import { createOpenAiCompatibleModel, ModelError } from "../src/agent/openai-compatible-model.ts";
import { loadConfig } from "../src/config.ts";
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

console.log(`Guide on ${config.model.name} (${config.model.baseUrl}). Empty line to quit.\n`);
const terminal = createInterface({ input: stdin, output: stdout });
const history: VisitorMessage[] = [];

const PROMPT = "you> ";
terminal.setPrompt(PROMPT);
stdout.write(PROMPT);
// Lines are buffered by the iterator, so piped input works too.
for await (const line of terminal) {
  const question = line.trim();
  if (!question) {
    break;
  }
  history.push({ role: "user", content: question });
  const started = performance.now();
  try {
    const reply = await runAgent({ model, context, messages: history });
    const seconds = (performance.now() - started) / 1000;
    history.push({ role: "assistant", content: reply.text });
    printReply(reply, seconds);
  } catch (error) {
    if (!(error instanceof ModelError)) {
      throw error;
    }
    history.pop();
    console.error(`error: ${error.message}\n`);
  }
  stdout.write(PROMPT);
}
terminal.close();

function printReply(reply: AgentReply, seconds: number): void {
  console.log(`\nguide> ${reply.text}`);
  for (const link of reply.links) {
    console.log(`  [${link.title}] ${link.url}`);
  }
  const tools = reply.tools.map((tool) => {
    const mark = tool.ok ? "" : " (error)";
    return `${tool.name}${mark}`;
  });
  const toolList = tools.join(", ") || "none";
  const tokens = `${reply.usage.inputTokens} in / ${reply.usage.outputTokens} out`;
  console.log(`  · tools: ${toolList} · ${tokens} · ${seconds.toFixed(1)}s · ${reply.status}\n`);
}
