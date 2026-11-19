import assert from "node:assert/strict";
import { before, test } from "node:test";
import { ANONYMOUS, type Viewer } from "../src/access/viewer.ts";
import type { SearchEngine } from "../src/search/engine.ts";
import { createMiniSearchEngine } from "../src/search/minisearch-engine.ts";
import { searchPages } from "../src/search/search-pages.ts";
import { PAGES } from "./fixtures/pages.ts";

const MEMBER: Viewer = { kind: "member", id: "rshin" };

let engine: SearchEngine;

before(async () => {
  engine = await createMiniSearchEngine(PAGES);
});

async function urlsFor(query: string, viewer: Viewer = ANONYMOUS): Promise<string[]> {
  const results = await searchPages(engine, { query, limit: 5, viewer });
  return results.map((result) => result.url);
}

test("heading match ranks above body match", async () => {
  const urls = await urlsFor("webserv");
  assert.deepEqual(urls.slice(0, 2), ["/alice/profile/", "/bob/notes/docker/"]);
});

test("title match ranks first", async () => {
  const urls = await urlsFor("docker");
  assert.equal(urls[0], "/bob/notes/docker/");
});

test("query without accents finds accented words", async () => {
  const ecole = await urlsFor("ecole");
  const donnees = await urlsFor("donnees");
  assert.equal(ecole[0], "/alice/profile/");
  assert.equal(donnees[0], "/mentions-legales/");
});

test("prefix finds the full word", async () => {
  const urls = await urlsFor("intern");
  assert.equal(urls[0], "/alice/profile/");
});

test("one typo still finds the page", async () => {
  const urls = await urlsFor("webserf");
  const found = urls.includes("/alice/profile/");
  assert.ok(found, `got ${urls}`);
});

test("several words: page with all of them first", async () => {
  const urls = await urlsFor("docker networks");
  assert.equal(urls[0], "/bob/notes/docker/");
});

test("finds a word inside an underscore name", async () => {
  const urls = await urlsFor("transcendence");
  assert.deepEqual(urls, ["/alice/profile/"]);
});

test("c++ matches only the page that mentions it", async () => {
  const urls = await urlsFor("c++");
  assert.deepEqual(urls, ["/alice/profile/"]);
});

test("unknown word gives no result", async () => {
  const urls = await urlsFor("kubernetes");
  assert.deepEqual(urls, []);
});

test("limit is respected", async () => {
  const results = await searchPages(engine, { query: "webserv", limit: 1, viewer: ANONYMOUS });
  assert.equal(results.length, 1);
});

test("private pages are hidden from anonymous viewers", async () => {
  const urls = await urlsFor("roadmap");
  assert.deepEqual(urls, []);
});

test("private pages are visible to members", async () => {
  const urls = await urlsFor("roadmap", MEMBER);
  assert.deepEqual(urls, ["/members/roadmap/"]);
});

test("hidden pages do not use up the limit", async () => {
  const results = await searchPages(engine, { query: "docker", limit: 1, viewer: ANONYMOUS });
  const urls = results.map((result) => result.url);
  assert.deepEqual(urls, ["/bob/notes/docker/"]);
});

test("finds a linked file by its title", async () => {
  const urls = await urlsFor("resume");
  assert.deepEqual(urls, ["/alice/profile/resume.pdf"]);
});

test("user filter keeps only that user's pages and files", async () => {
  const alice = await searchPages(engine, {
    query: "webserv",
    limit: 5,
    viewer: ANONYMOUS,
    user: "alice",
  });
  const bob = await searchPages(engine, {
    query: "webserv",
    limit: 5,
    viewer: ANONYMOUS,
    user: "bob",
  });
  const aliceUrls = alice.map((result) => result.url);
  const bobUrls = bob.map((result) => result.url);
  assert.deepEqual(aliceUrls, ["/alice/profile/"]);
  assert.deepEqual(bobUrls, ["/bob/notes/docker/"]);
});

test("user filter still hides private pages", async () => {
  const options = { query: "drafts", limit: 5, user: "carol" };
  const anonymous = await searchPages(engine, { ...options, viewer: ANONYMOUS });
  const member = await searchPages(engine, { ...options, viewer: MEMBER });
  assert.equal(anonymous.length, 0);
  assert.equal(member.length, 1);
});
