import assert from "node:assert/strict";
import { test } from "node:test";
import { createPageStore } from "../src/index/page-store.ts";
import { PAGES } from "./fixtures/pages.ts";

const store = createPageStore(PAGES);

test("finds a page by path, with or without trailing slash", () => {
  for (const input of ["/profile/", "/profile", "  /profile/  "]) {
    const page = store.get(input);
    assert.equal(page?.url, "/profile/", input);
  }
});

test("finds a page by full site URL", () => {
  const page = store.get("https://shinsters.fr/mentions-legales/");
  assert.equal(page?.url, "/mentions-legales/");
});

test("ignores other sites and unknown paths", () => {
  for (const input of ["https://example.com/profile/", "/nope/", "javascript:alert(1)"]) {
    const page = store.get(input);
    assert.equal(page, undefined, input);
  }
});

test("lists every page", () => {
  const urls = store.list().map((page) => page.url);
  assert.equal(urls.length, PAGES.length);
});
