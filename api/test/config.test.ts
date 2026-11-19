import assert from "node:assert/strict";
import { test } from "node:test";
import { loadConfig } from "../src/config.ts";

const DEFAULTS = {
  host: "127.0.0.1",
  port: 3000,
  indexPath: "data/pages.json",
  webRoot: "../web",
  model: {
    baseUrl: "http://localhost:11434/v1",
    name: "qwen3:14b",
    apiKey: "",
    reasoningEffort: "none",
  },
  chat: {
    enabled: true,
    allowedOrigins: ["https://shinsters.fr", "http://localhost:8080"],
    rateLimitPerMinute: 10,
    dailyTokenBudget: 1_000_000,
    trustProxy: false,
  },
};

const VARIABLES = [
  "HOST",
  "PORT",
  "INDEX_PATH",
  "WEB_ROOT",
  "MODEL_BASE_URL",
  "MODEL_NAME",
  "MODEL_API_KEY",
  "MODEL_REASONING_EFFORT",
  "CHAT_ENABLED",
  "ALLOWED_ORIGINS",
  "RATE_LIMIT_PER_MINUTE",
  "DAILY_TOKEN_BUDGET",
  "TRUST_PROXY",
];

test("defaults when env is empty", () => {
  const config = loadConfig({});
  assert.deepEqual(config, DEFAULTS);
});

test("defaults when variables are set but empty", () => {
  const entries = VARIABLES.map((name) => [name, ""]);
  const env = Object.fromEntries(entries);
  const config = loadConfig(env);
  assert.deepEqual(config, DEFAULTS);
});

test("reads values from env", () => {
  const config = loadConfig({
    HOST: "0.0.0.0",
    PORT: "8081",
    INDEX_PATH: "/tmp/pages.json",
    WEB_ROOT: "/srv/web",
    MODEL_BASE_URL: "https://models.example/v1",
    MODEL_NAME: "some-model",
    MODEL_API_KEY: "test-key",
    MODEL_REASONING_EFFORT: "low",
    CHAT_ENABLED: "false",
    ALLOWED_ORIGINS: " https://a.example , ,https://b.example",
    RATE_LIMIT_PER_MINUTE: "3",
    DAILY_TOKEN_BUDGET: "5000",
    TRUST_PROXY: "true",
  });
  assert.deepEqual(config, {
    host: "0.0.0.0",
    port: 8081,
    indexPath: "/tmp/pages.json",
    webRoot: "/srv/web",
    model: {
      baseUrl: "https://models.example/v1",
      name: "some-model",
      apiKey: "test-key",
      reasoningEffort: "low",
    },
    chat: {
      enabled: false,
      allowedOrigins: ["https://a.example", "https://b.example"],
      rateLimitPerMinute: 3,
      dailyTokenBudget: 5000,
      trustProxy: true,
    },
  });
});

test("accepts the port range limits", () => {
  const lowest = loadConfig({ PORT: "1" });
  const highest = loadConfig({ PORT: "65535" });
  assert.equal(lowest.port, 1);
  assert.equal(highest.port, 65535);
});

test("rejects a port that is not only digits", () => {
  for (const value of ["abc", "1e3", "3000.0", " 80 ", "-1"]) {
    assert.throws(() => loadConfig({ PORT: value }), /invalid PORT/, value);
  }
});

test("rejects a port out of range", () => {
  for (const value of ["0", "65536", "70000"]) {
    assert.throws(() => loadConfig({ PORT: value }), /invalid PORT/, value);
  }
});

test("rejects limits that are not positive integers", () => {
  for (const value of ["0", "-5", "1.5", "ten", "1e3"]) {
    const env = { RATE_LIMIT_PER_MINUTE: value, DAILY_TOKEN_BUDGET: "1" };
    assert.throws(() => loadConfig(env), /invalid RATE_LIMIT_PER_MINUTE/, value);
  }
});

test("booleans accept only true and false", () => {
  for (const value of ["yes", "1", "TRUE", "off"]) {
    const env = { CHAT_ENABLED: value };
    assert.throws(() => loadConfig(env), /invalid CHAT_ENABLED/, value);
  }
});
