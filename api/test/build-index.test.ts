import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { buildIndex, ownerOf, toUrl } from "../src/index/build-index.ts";
import { readIndex, writeIndex } from "../src/index/store.ts";

const FIXTURE_WEB = path.join(import.meta.dirname, "fixtures", "web");
const USERS = ["alice"];

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

test("owner is the first segment when it is a user", () => {
  const cases: [string, string | null][] = [
    ["/alice/profile/", "alice"],
    ["/alice/", "alice"],
    ["/alice/profile/resume.pdf", "alice"],
    ["/", null],
    ["/about/", null],
    ["/alice.html", null],
  ];
  for (const [url, owner] of cases) {
    const actual = ownerOf(url, USERS);
    assert.equal(actual, owner, url);
  }
});

test("indexes pages, then linked files; skips 404 and redirects", async () => {
  const pages = await buildIndex(FIXTURE_WEB, USERS);
  const urls = pages.map((page) => page.url);
  assert.deepEqual(urls, [
    "/about/",
    "/alice/profile/",
    "/",
    "/notes.html",
    "/alice/profile/resume.pdf",
  ]);
});

test("fills every field of a page", async () => {
  const pages = await buildIndex(FIXTURE_WEB, USERS);
  const home = pages.find((page) => page.url === "/");
  assert.ok(home);
  assert.equal(home.kind, "page");
  assert.equal(home.owner, null);
  assert.equal(home.title, "Home — Fixture");
  assert.equal(home.description, "Fixture home page.");
  assert.equal(home.lang, "en");
  assert.deepEqual(home.headings, ["Welcome"]);
  assert.equal(home.text, "Welcome Skills: Docker TypeScript Fish & chips <3 café A");
  assert.equal(home.visibility, "public");
});

test("a linked file takes its title from the link and its owner from its url", async () => {
  const pages = await buildIndex(FIXTURE_WEB, USERS);
  const resume = pages.find((page) => page.url === "/alice/profile/resume.pdf");
  assert.deepEqual(resume, {
    url: "/alice/profile/resume.pdf",
    kind: "file",
    owner: "alice",
    title: "Download resume (PDF)",
    description: "File linked from Alice — Profile.",
    lang: "en",
    headings: [],
    text: "",
    visibility: "public",
  });
});

test("ignores missing files, other sites and links in the nav", async () => {
  const pages = await buildIndex(FIXTURE_WEB, USERS);
  const urls = pages.map((page) => page.url);
  const ignoredUrls = ["/alice/profile/missing.pdf", "/other.pdf", "/alice/profile/nav-only.pdf"];
  for (const ignored of ignoredUrls) {
    const found = urls.includes(ignored);
    assert.equal(found, false, ignored);
  }
});

test("writes and reads back the index", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "shinsters-index-"));
  try {
    const file = path.join(dir, "nested", "pages.json");
    const pages = await buildIndex(FIXTURE_WEB, USERS);
    await writeIndex(file, pages);
    const readBack = await readIndex(file);
    assert.deepEqual(readBack, pages);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("rejects an index file with invalid pages", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "shinsters-index-"));
  try {
    const file = path.join(dir, "pages.json");
    const invalid = [{ url: "no-leading-slash", title: "x", visibility: "secret" }];
    await writeFile(file, JSON.stringify(invalid));
    await assert.rejects(readIndex(file), /invalid index file/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
