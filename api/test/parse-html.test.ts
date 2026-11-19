import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHtml } from "../src/index/parse-html.ts";

const PAGE = `<!doctype html>
<html lang="en">
<head>
  <title> My   page </title>
  <meta name="description" content="A short description.">
  <style>p { color: red; }</style>
</head>
<body>
  <!-- comment -->
  <h1>Main <em>title</em></h1>
  <h2 class="x">Section</h2>
  <h4>Too deep</h4>
  <p>One<span>Two</span></p>
  <script>const hidden = 1;</script>
</body>
</html>`;

test("reads title, description and lang", () => {
  const parsed = parseHtml(PAGE);
  assert.equal(parsed.title, "My page");
  assert.equal(parsed.description, "A short description.");
  assert.equal(parsed.lang, "en");
});

test("keeps h1 to h3 headings only", () => {
  const parsed = parseHtml(PAGE);
  assert.deepEqual(parsed.headings, ["Main title", "Section"]);
});

test("body text drops comments, scripts and styles", () => {
  const parsed = parseHtml(PAGE);
  assert.doesNotMatch(parsed.text, /comment|hidden|color/);
  assert.match(parsed.text, /^Main title Section Too deep One Two$/);
});

test("decodes entities", () => {
  const parsed = parseHtml("<body>a &amp; b &lt;3 caf&#233; &#x41; &amp;lt;</body>");
  assert.equal(parsed.text, "a & b <3 café A &lt;");
});

test("detects redirects", () => {
  const redirect = parseHtml('<meta http-equiv="refresh" content="0; url=/x/">');
  assert.equal(redirect.isRedirect, true);
  assert.equal(parseHtml(PAGE).isRedirect, false);
});

test("missing parts give empty values", () => {
  const parsed = parseHtml("<p>only text</p>");
  assert.equal(parsed.title, "");
  assert.equal(parsed.description, "");
  assert.equal(parsed.lang, "");
  assert.deepEqual(parsed.headings, []);
  assert.equal(parsed.text, "only text");
});
