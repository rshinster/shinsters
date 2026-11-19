import { before, test } from "node:test";
import assert from "node:assert/strict";
import type { SearchEngine } from "../src/search/engine.ts";
import { createMiniSearchEngine } from "../src/search/minisearch-engine.ts";
import { MAX_LIMIT, searchPages } from "../src/search/search-pages.ts";
import { PAGES } from "./fixtures/pages.ts";

let engine: SearchEngine;

before(async () => {
  engine = await createMiniSearchEngine(PAGES);
});

async function urlsFor(query: string, limit?: number): Promise<string[]> {
  const results = await searchPages(engine, { query, limit });
  return results.map((result) => result.url);
}

test("heading match ranks above body match", async () => {
  const urls = await urlsFor("webserv");
  assert.deepEqual(urls.slice(0, 2), ["/profile/", "/notes/docker/"]);
});

test("title match ranks first", async () => {
  const urls = await urlsFor("docker");
  assert.equal(urls[0], "/notes/docker/");
});

test("query without accents finds accented words", async () => {
  const ecole = await urlsFor("ecole");
  const donnees = await urlsFor("donnees");
  assert.equal(ecole[0], "/profile/");
  assert.equal(donnees[0], "/mentions-legales/");
});

test("prefix finds the full word", async () => {
  const urls = await urlsFor("intern");
  assert.equal(urls[0], "/profile/");
});

test("one typo still finds the page", async () => {
  const urls = await urlsFor("webserf");
  assert.ok(urls.includes("/profile/"), `got ${urls.join(", ")}`);
});

test("several words: page with all of them first", async () => {
  const urls = await urlsFor("docker networks");
  assert.equal(urls[0], "/notes/docker/");
});

test("finds a word inside an underscore name", async () => {
  const urls = await urlsFor("transcendence");
  assert.deepEqual(urls, ["/profile/"]);
});

test("c++ matches only the page that mentions it", async () => {
  const urls = await urlsFor("c++");
  assert.deepEqual(urls, ["/profile/"]);
});

test("unknown word gives no result", async () => {
  const urls = await urlsFor("kubernetes");
  assert.deepEqual(urls, []);
});

test("empty query gives no result", async () => {
  const urls = await urlsFor("   ");
  assert.deepEqual(urls, []);
});

test("limit is respected and capped", async () => {
  const one = await urlsFor("webserv", 1);
  const capped = await searchPages(engine, { query: "e", limit: 1000 });
  assert.equal(one.length, 1);
  assert.ok(capped.length <= MAX_LIMIT);
});
