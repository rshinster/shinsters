import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildIndex, toUrl } from "../src/index/build-index.ts";
import { readIndex, writeIndex } from "../src/index/store.ts";

const FIXTURE_WEB = path.join(import.meta.dirname, "fixtures", "web");

test("maps files to site urls", () => {
  const cases: [string, string][] = [
    ["index.html", "/"],
    ["about/index.html", "/about/"],
    ["notes.html", "/notes.html"],
  ];
  for (const [file, url] of cases) {
    const actual = toUrl(file);
    assert.equal(actual, url);
  }
});

test("indexes pages and skips 404 and redirects", async () => {
  const pages = await buildIndex(FIXTURE_WEB);
  const urls = pages.map((page) => page.url);
  assert.deepEqual(urls, ["/about/", "/", "/notes.html"]);
});

test("fills every field of a page", async () => {
  const pages = await buildIndex(FIXTURE_WEB);
  const home = pages.find((page) => page.url === "/");
  assert.ok(home);
  assert.equal(home.title, "Home — Fixture");
  assert.equal(home.description, "Fixture home page.");
  assert.equal(home.lang, "en");
  assert.deepEqual(home.headings, ["Welcome"]);
  assert.equal(home.text, "Welcome Skills: Docker TypeScript Fish & chips <3 café A");
  assert.equal(home.visibility, "public");
});

test("writes and reads back the index", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "shinsters-index-"));
  try {
    const file = path.join(dir, "nested", "pages.json");
    const pages = await buildIndex(FIXTURE_WEB);
    await writeIndex(file, pages);
    const readBack = await readIndex(file);
    assert.deepEqual(readBack, pages);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
