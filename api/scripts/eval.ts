// Runs the eval cases against the configured model. EVAL_RUNS=3 repeats each case.
import { existsSync } from "node:fs";
import { CASES, type EvalCase } from "../evals/cases.ts";
import { ANONYMOUS } from "../src/access/viewer.ts";
import { runAgent } from "../src/agent/agent.ts";
import type { Model, Usage } from "../src/agent/model.ts";
import { createOpenAiCompatibleModel } from "../src/agent/openai-compatible-model.ts";
import { loadConfig } from "../src/config.ts";
import { readIndex } from "../src/index/store.ts";
import { resolveFromApiRoot } from "../src/paths.ts";
import { createToolContext } from "../src/tools/registry.ts";
import type { ToolContext } from "../src/tools/tool.ts";

const DEFAULT_RUNS = 1;
const MAX_RUNS = 20;

interface CaseResult {
  passedRuns: number;
  failures: string[];
}

const config = loadConfig(process.env);
const runs = readRuns(process.env.EVAL_RUNS);
const indexPath = resolveFromApiRoot(config.indexPath);
if (!existsSync(indexPath)) {
  console.error(`No index at ${indexPath}. Run make api-index first.`);
  process.exit(1);
}
const pages = await readIndex(indexPath);
const context = await createToolContext(pages, ANONYMOUS);
const model = createOpenAiCompatibleModel(config.model);
const usage: Usage = { inputTokens: 0, outputTokens: 0 };
const started = performance.now();

console.log(`Evals on ${config.model.name}, ${runs} run(s) per case.\n`);
let passedCases = 0;
let passedRuns = 0;
for (const evalCase of CASES) {
  const result = await runCase({ evalCase, model, context });
  passedRuns += result.passedRuns;
  const allPassed = result.passedRuns === runs;
  if (allPassed) {
    passedCases += 1;
  }
  const mark = allPassed ? "PASS" : "FAIL";
  console.log(`${mark} ${result.passedRuns}/${runs}  ${evalCase.name}`);
  for (const failure of result.failures) {
    console.log(`       ${failure}`);
  }
}

const seconds = (performance.now() - started) / 1000;
const tokens = `${usage.inputTokens} in / ${usage.outputTokens} out`;
const totalRuns = CASES.length * runs;
console.log(
  `\n${passedRuns}/${totalRuns} runs passed · ${passedCases}/${CASES.length} cases every time`,
);
console.log(`${tokens} · ${seconds.toFixed(0)}s`);

interface CaseRun {
  evalCase: EvalCase;
  model: Model;
  context: ToolContext;
}

async function runCase(run: CaseRun): Promise<CaseResult> {
  const result: CaseResult = { passedRuns: 0, failures: [] };
  for (let attempt = 1; attempt <= runs; attempt++) {
    const reply = await runAgent({
      model: run.model,
      context: run.context,
      messages: run.evalCase.messages,
    });
    usage.inputTokens += reply.usage.inputTokens;
    usage.outputTokens += reply.usage.outputTokens;
    const failed = run.evalCase.checks.filter((check) => !check.passes(reply));
    if (failed.length === 0) {
      result.passedRuns += 1;
      continue;
    }
    const reasons = failed.map((check) => check.description).join("; ");
    const toolNames = reply.tools.map((tool) => tool.name).join(", ") || "no tools";
    result.failures.push(`run ${attempt}: ${reasons} [${toolNames}] → ${reply.text}`);
  }
  return result;
}

function readRuns(value: string | undefined): number {
  if (!value) {
    return DEFAULT_RUNS;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_RUNS) {
    throw new Error(`invalid EVAL_RUNS: ${value} (1 to ${MAX_RUNS})`);
  }
  return parsed;
}
