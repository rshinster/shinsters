import assert from "node:assert/strict";
import { test } from "node:test";
import { loadConfig } from "../src/config.ts";

const DEFAULT_MODEL = {
  baseUrl: "http://localhost:11434/v1",
  name: "qwen3:14b",
  apiKey: "",
  reasoningEffort: "none",
};

const DEFAULTS = {
  port: 3000,
  indexPath: "data/pages.json",
  webRoot: "../web",
  model: DEFAULT_MODEL,
};

test("defaults when env is empty", () => {
  const config = loadConfig({});
  assert.deepEqual(config, DEFAULTS);
});

test("defaults when variables are set but empty", () => {
  const config = loadConfig({
    PORT: "",
    INDEX_PATH: "",
    WEB_ROOT: "",
    MODEL_BASE_URL: "",
    MODEL_NAME: "",
    MODEL_API_KEY: "",
    MODEL_REASONING_EFFORT: "",
  });
  assert.deepEqual(config, DEFAULTS);
});

test("reads values from env", () => {
  const config = loadConfig({
    PORT: "8081",
    INDEX_PATH: "/tmp/pages.json",
    WEB_ROOT: "/srv/web",
    MODEL_BASE_URL: "https://models.example/v1",
    MODEL_NAME: "some-model",
    MODEL_API_KEY: "test-key",
    MODEL_REASONING_EFFORT: "low",
  });
  assert.deepEqual(config, {
    port: 8081,
    indexPath: "/tmp/pages.json",
    webRoot: "/srv/web",
    model: {
      baseUrl: "https://models.example/v1",
      name: "some-model",
      apiKey: "test-key",
      reasoningEffort: "low",
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
