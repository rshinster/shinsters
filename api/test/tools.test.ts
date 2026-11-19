import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { ANONYMOUS, type Viewer } from "../src/access/viewer.ts";
import type { Page } from "../src/index/page.ts";
import { getPageTool, MAX_TEXT_LENGTH } from "../src/tools/get-page-tool.ts";
import { listUsersTool } from "../src/tools/list-users-tool.ts";
import { platformInfoTool } from "../src/tools/platform-info-tool.ts";
import { createToolContext, findTool, TOOLS } from "../src/tools/registry.ts";
import { searchPagesTool } from "../src/tools/search-pages-tool.ts";
import { type ToolContext, type ToolResult, toJsonSchema } from "../src/tools/tool.ts";
import { PAGES } from "./fixtures/pages.ts";

const MEMBER: Viewer = { kind: "member", id: "rshin" };

let anonymous: ToolContext;
let member: ToolContext;

before(async () => {
  anonymous = await createToolContext(PAGES, ANONYMOUS);
  member = await createToolContext(PAGES, MEMBER);
});

function dataOf(result: ToolResult): Record<string, unknown> {
  assert.ok(result.ok, result.ok ? "" : result.error);
  return result.data as Record<string, unknown>;
}

function errorOf(result: ToolResult): string {
  assert.equal(result.ok, false);
  return result.ok ? "" : result.error;
}

describe("registry", () => {
  test("tool names are unique snake_case", () => {
    const names = TOOLS.map((tool) => tool.name);
    const unique = new Set(names);
    assert.equal(unique.size, names.length);
    for (const name of names) {
      assert.match(name, /^[a-z]+(_[a-z]+)*$/);
    }
  });

  test("every tool has a description and a JSON Schema for the model", () => {
    for (const tool of TOOLS) {
      const schema = toJsonSchema(tool);
      assert.ok(tool.description.length > 20, tool.name);
      assert.equal(schema.type, "object", tool.name);
    }
  });

  test("search_pages schema: query required, limit optional with default", () => {
    const schema = toJsonSchema(searchPagesTool);
    const properties = schema.properties as Record<string, Record<string, unknown>>;
    assert.deepEqual(schema.required, ["query"]);
    assert.equal(properties.limit?.default, 5);
    assert.equal(properties.limit?.maximum, 10);
  });

  test("finds tools by name", () => {
    const tool = findTool("get_page");
    const missing = findTool("delete_everything");
    assert.equal(tool, getPageTool);
    assert.equal(missing, undefined);
  });
});

describe("search_pages", () => {
  test("returns url, kind, owner, title and description", async () => {
    const result = await searchPagesTool.call({ query: "webserv" }, anonymous);
    const data = dataOf(result);
    const pages = data.pages as Record<string, unknown>[];
    assert.deepEqual(pages[0], {
      url: "/alice/profile/",
      kind: "page",
      owner: "alice",
      title: "Profile",
      description: "Professional profile.",
    });
  });

  test("filters by user", async () => {
    const result = await searchPagesTool.call({ query: "webserv", user: "bob" }, anonymous);
    const data = dataOf(result);
    const urls = (data.pages as { url: string }[]).map((page) => page.url);
    assert.deepEqual(urls, ["/bob/notes/docker/"]);
  });

  test("user names ignore case", async () => {
    const result = await searchPagesTool.call({ query: "webserv", user: " Bob " }, anonymous);
    const data = dataOf(result);
    const urls = (data.pages as { url: string }[]).map((page) => page.url);
    assert.deepEqual(urls, ["/bob/notes/docker/"]);
  });

  test("unknown and hidden users give the same error", async () => {
    const unknown = await searchPagesTool.call({ query: "x", user: "nobody" }, anonymous);
    const hidden = await searchPagesTool.call({ query: "x", user: "carol" }, anonymous);
    const unknownError = errorOf(unknown);
    const hiddenError = errorOf(hidden);
    assert.equal(unknownError, "No user named nobody. Use list_users to see the users.");
    assert.equal(hiddenError, "No user named carol. Use list_users to see the users.");
  });

  test("members can filter on a user with only private content", async () => {
    const result = await searchPagesTool.call({ query: "drafts", user: "carol" }, member);
    const data = dataOf(result);
    const pages = data.pages as unknown[];
    assert.equal(pages.length, 1);
  });

  test("trims the query", async () => {
    const result = await searchPagesTool.call({ query: "  docker  " }, anonymous);
    const data = dataOf(result);
    const pages = data.pages as Record<string, unknown>[];
    assert.equal(pages[0]?.url, "/bob/notes/docker/");
  });

  test("rejects bad input with a readable error", async () => {
    const badInputs = [
      { query: "" },
      { query: "   " },
      { query: 42 },
      {},
      { query: "a", limit: Number.NaN },
      { query: "a", limit: 0 },
      { query: "a", limit: 1000 },
      { query: "a", limit: 2.7 },
      { query: "a", limit: "3" },
      { query: "a", user: "" },
      { query: "a", user: 7 },
      "webserv",
    ];
    for (const input of badInputs) {
      const result = await searchPagesTool.call(input, anonymous);
      const error = errorOf(result);
      assert.match(error, /Invalid input for search_pages/, JSON.stringify(input));
    }
  });

  test("accepts the limit range", async () => {
    for (const limit of [1, 10]) {
      const result = await searchPagesTool.call({ query: "e", limit }, anonymous);
      assert.equal(result.ok, true, String(limit));
    }
  });

  test("hides private pages from anonymous viewers only", async () => {
    const hidden = await searchPagesTool.call({ query: "roadmap" }, anonymous);
    const shown = await searchPagesTool.call({ query: "roadmap" }, member);
    const hiddenData = dataOf(hidden);
    const shownData = dataOf(shown);
    const shownPages = shownData.pages as unknown[];
    assert.deepEqual(hiddenData.pages, []);
    assert.equal(shownPages.length, 1);
  });
});

describe("get_page", () => {
  test("returns the page content", async () => {
    const result = await getPageTool.call({ url: "/alice/profile" }, anonymous);
    const data = dataOf(result);
    assert.equal(data.url, "/alice/profile/");
    assert.equal(data.lang, "en");
    assert.equal(data.truncated, false);
    assert.match(String(data.text), /webserv/);
  });

  test("private and missing pages give the same error", async () => {
    const privatePage = await getPageTool.call({ url: "/members/roadmap/" }, anonymous);
    const missingPage = await getPageTool.call({ url: "/members/nothing/" }, anonymous);
    const privateError = errorOf(privatePage);
    const missingError = errorOf(missingPage);
    assert.equal(privateError, "No page at /members/roadmap/.");
    assert.equal(missingError, "No page at /members/nothing/.");
  });

  test("returns a linked file with its kind and owner", async () => {
    const result = await getPageTool.call({ url: "/alice/profile/resume.pdf" }, anonymous);
    const data = dataOf(result);
    assert.equal(data.kind, "file");
    assert.equal(data.owner, "alice");
    assert.equal(data.text, "");
  });

  test("members can read private pages", async () => {
    const result = await getPageTool.call({ url: "/members/roadmap/" }, member);
    const data = dataOf(result);
    assert.match(String(data.text), /Secret roadmap/);
  });

  test("long text is truncated and flagged", async () => {
    const longPage: Page = {
      url: "/long/",
      kind: "page",
      owner: null,
      title: "Long",
      description: "",
      lang: "en",
      headings: [],
      text: "x".repeat(MAX_TEXT_LENGTH + 10),
      visibility: "public",
    };
    const context = await createToolContext([longPage], ANONYMOUS);
    const result = await getPageTool.call({ url: "/long/" }, context);
    const data = dataOf(result);
    assert.equal(String(data.text).length, MAX_TEXT_LENGTH);
    assert.equal(data.truncated, true);
  });

  test("rejects a missing url", async () => {
    const result = await getPageTool.call({}, anonymous);
    const error = errorOf(result);
    assert.match(error, /Invalid input for get_page/);
  });
});

describe("list_users", () => {
  test("lists users with their visible pages and files", async () => {
    const result = await listUsersTool.call({}, anonymous);
    const data = dataOf(result);
    assert.deepEqual(data.users, [
      {
        name: "alice",
        pages: [
          { url: "/alice/profile/", kind: "page", title: "Profile" },
          { url: "/alice/profile/resume.pdf", kind: "file", title: "Download resume (PDF)" },
        ],
      },
      {
        name: "bob",
        pages: [{ url: "/bob/notes/docker/", kind: "page", title: "Docker notes" }],
      },
    ]);
  });

  test("a user with only private content appears to members only", async () => {
    const result = await listUsersTool.call({}, member);
    const data = dataOf(result);
    const names = (data.users as { name: string }[]).map((user) => user.name);
    assert.deepEqual(names, ["alice", "bob", "carol"]);
  });
});

describe("platform_info", () => {
  test("describes the site, its users and its own pages only", async () => {
    const result = await platformInfoTool.call({}, anonymous);
    const data = dataOf(result);
    const urls = (data.pages as { url: string }[]).map((page) => page.url);
    assert.equal(data.name, "Shinsters");
    assert.equal(data.url, "https://shinsters.fr");
    assert.equal(data.description, "A modular web platform, built to grow.");
    assert.deepEqual(data.users, ["alice", "bob"]);
    assert.deepEqual(urls, ["/", "/mentions-legales/"]);
  });

  test("members also see private site pages and users", async () => {
    const result = await platformInfoTool.call({}, member);
    const data = dataOf(result);
    const urls = (data.pages as { url: string }[]).map((page) => page.url);
    assert.deepEqual(data.users, ["alice", "bob", "carol"]);
    assert.deepEqual(urls, ["/", "/mentions-legales/", "/members/roadmap/"]);
  });
});
