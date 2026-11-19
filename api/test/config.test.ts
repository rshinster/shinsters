import { test } from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../src/config.ts";

const DEFAULTS = { port: 3000, indexPath: "data/pages.json", webRoot: "../web" };

test("defaults when env is empty", () => {
  const config = loadConfig({});
  assert.deepEqual(config, DEFAULTS);
});

test("defaults when variables are set but empty", () => {
  const config = loadConfig({ PORT: "", INDEX_PATH: "", WEB_ROOT: "" });
  assert.deepEqual(config, DEFAULTS);
});

test("reads values from env", () => {
  const config = loadConfig({
    PORT: "8081",
    INDEX_PATH: "/tmp/pages.json",
    WEB_ROOT: "/srv/web",
  });
  assert.deepEqual(config, { port: 8081, indexPath: "/tmp/pages.json", webRoot: "/srv/web" });
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
