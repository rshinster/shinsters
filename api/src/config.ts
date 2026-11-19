type Env = Record<string, string | undefined>;

export interface ModelConfig {
  // Any OpenAI-compatible chat completions API; the default is a local Ollama.
  baseUrl: string;
  name: string;
  // Empty: no Authorization header (local models need none).
  apiKey: string;
  // Sent as reasoning_effort; "omit" sends nothing, for providers that reject the field.
  reasoningEffort: string;
}

export interface Config {
  port: number;
  indexPath: string;
  webRoot: string;
  model: ModelConfig;
}

const DEFAULT_PORT = 3000;
const DEFAULT_INDEX_PATH = "data/pages.json";
const DEFAULT_WEB_ROOT = "../web";
const DEFAULT_MODEL_BASE_URL = "http://localhost:11434/v1";
const DEFAULT_MODEL_NAME = "qwen3:14b";
// Thinking makes local replies about 10x slower for little gain on this simple task.
const DEFAULT_REASONING_EFFORT = "none";

export function loadConfig(env: Env): Config {
  return {
    port: readPort(env.PORT),
    indexPath: env.INDEX_PATH || DEFAULT_INDEX_PATH,
    webRoot: env.WEB_ROOT || DEFAULT_WEB_ROOT,
    model: {
      baseUrl: env.MODEL_BASE_URL || DEFAULT_MODEL_BASE_URL,
      name: env.MODEL_NAME || DEFAULT_MODEL_NAME,
      apiKey: env.MODEL_API_KEY || "",
      reasoningEffort: env.MODEL_REASONING_EFFORT || DEFAULT_REASONING_EFFORT,
    },
  };
}

function readPort(value: string | undefined): number {
  if (!value) {
    return DEFAULT_PORT;
  }
  if (!/^\d+$/.test(value)) {
    throw new Error(`invalid PORT: ${value}`);
  }
  const port = Number(value);
  if (port < 1 || port > 65535) {
    throw new Error(`invalid PORT: ${value}`);
  }
  return port;
}
