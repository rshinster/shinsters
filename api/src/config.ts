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

export interface ChatConfig {
  // Kill switch: false answers 503 without calling the model.
  enabled: boolean;
  // Browser origins allowed to call /chat.
  allowedOrigins: string[];
  // Chat requests per client IP and minute.
  rateLimitPerMinute: number;
  // Model tokens (input + output) for all visitors per UTC day; then the chat pauses.
  dailyTokenBudget: number;
  // Behind a reverse proxy (Caddy): take the client IP from X-Forwarded-For.
  trustProxy: boolean;
}

export interface Config {
  host: string;
  port: number;
  indexPath: string;
  webRoot: string;
  model: ModelConfig;
  chat: ChatConfig;
}

// Local only by default; a container sets HOST=0.0.0.0.
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3000;
const DEFAULT_INDEX_PATH = "data/pages.json";
const DEFAULT_WEB_ROOT = "../web";
const DEFAULT_MODEL_BASE_URL = "http://localhost:11434/v1";
const DEFAULT_MODEL_NAME = "qwen3:14b";
// Thinking makes local replies about 10x slower for little gain on this simple task.
const DEFAULT_REASONING_EFFORT = "none";
// The live site, plus make serve for local testing.
const DEFAULT_ALLOWED_ORIGINS = ["https://shinsters.fr", "http://localhost:8080"];
const DEFAULT_RATE_LIMIT_PER_MINUTE = 10;
// About 125 questions a day at ~8k tokens each.
const DEFAULT_DAILY_TOKEN_BUDGET = 1_000_000;

export function loadConfig(env: Env): Config {
  return {
    host: env.HOST || DEFAULT_HOST,
    port: readPort(env.PORT),
    indexPath: env.INDEX_PATH || DEFAULT_INDEX_PATH,
    webRoot: env.WEB_ROOT || DEFAULT_WEB_ROOT,
    model: {
      baseUrl: env.MODEL_BASE_URL || DEFAULT_MODEL_BASE_URL,
      name: env.MODEL_NAME || DEFAULT_MODEL_NAME,
      apiKey: env.MODEL_API_KEY || "",
      reasoningEffort: env.MODEL_REASONING_EFFORT || DEFAULT_REASONING_EFFORT,
    },
    chat: {
      enabled: readBoolean("CHAT_ENABLED", env.CHAT_ENABLED, true),
      allowedOrigins: readList(env.ALLOWED_ORIGINS, DEFAULT_ALLOWED_ORIGINS),
      rateLimitPerMinute: readPositiveInteger(
        "RATE_LIMIT_PER_MINUTE",
        env.RATE_LIMIT_PER_MINUTE,
        DEFAULT_RATE_LIMIT_PER_MINUTE,
      ),
      dailyTokenBudget: readPositiveInteger(
        "DAILY_TOKEN_BUDGET",
        env.DAILY_TOKEN_BUDGET,
        DEFAULT_DAILY_TOKEN_BUDGET,
      ),
      trustProxy: readBoolean("TRUST_PROXY", env.TRUST_PROXY, false),
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

function readPositiveInteger(name: string, value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  if (!/^\d+$/.test(value) || Number(value) < 1) {
    throw new Error(`invalid ${name}: ${value}`);
  }
  return Number(value);
}

function readBoolean(name: string, value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  throw new Error(`invalid ${name}: ${value} (true or false)`);
}

function readList(value: string | undefined, fallback: string[]): string[] {
  if (!value) {
    return fallback;
  }
  const items = value.split(",");
  const trimmed = items.map((item) => item.trim());
  return trimmed.filter((item) => item.length > 0);
}
