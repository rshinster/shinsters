import assert from "node:assert/strict";
import { test } from "node:test";
import { parseHtml } from "../src/index/parse-html.ts";

const PAGE = `<!doctype html>
<html lang="en">
<head>
  <title> My   page </title>
  <meta name="description" content="A short description.">
  <style>p { color: red; }</style>
</head>
<body>
  <nav class="site-nav"><a href="/">Home</a></nav>
  <!-- comment -->
  <h1>Main <em>title</em></h1>
  <h2 class="x">Section</h2>
  <h4>Too deep</h4>
  <p>One<span>Two</span></p>
  <script>const hidden = 1;</script>
  <footer>© 2026 · <a href="/legal/">Legal</a></footer>
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

test("body text drops comments, scripts, styles, nav and footer", () => {
  const parsed = parseHtml(PAGE);
  assert.doesNotMatch(parsed.text, /comment|hidden|color|Home|Legal/);
  assert.equal(parsed.text, "Main title Section Too deep One Two");
});

test("reads content links with clean text and decoded href", () => {
  const html = `<body>
    <nav><a href="/nav/">Nav</a></nav>
    <a class="btn" href="cv.pdf?v=1&amp;x=2">Download <em>CV</em></a>
    <a href="/empty/"></a>
    <footer><a href="/legal/">Legal</a></footer>
  </body>`;
  const parsed = parseHtml(html);
  assert.deepEqual(parsed.links, [
    { href: "cv.pdf?v=1&x=2", text: "Download CV" },
    { href: "/empty/", text: "" },
  ]);
});

test("decodes entities", () => {
  const parsed = parseHtml("<body>a &amp; b &lt;3 caf&#233; &#x41; &amp;lt;</body>");
  assert.equal(parsed.text, "a & b <3 café A &lt;");
});

test("keeps an invalid numeric entity as text", () => {
  const parsed = parseHtml("<body>x &#99999999; &#x110000; y</body>");
  assert.equal(parsed.text, "x &#99999999; &#x110000; y");
});

test("detects redirects", () => {
  const redirect = parseHtml('<meta http-equiv="refresh" content="0; url=/x/">');
  const normal = parseHtml(PAGE);
  assert.equal(redirect.isRedirect, true);
  assert.equal(normal.isRedirect, false);
});

test("missing parts give empty values", () => {
  const parsed = parseHtml("<p>only text</p>");
  assert.equal(parsed.title, "");
  assert.equal(parsed.description, "");
  assert.equal(parsed.lang, "");
  assert.deepEqual(parsed.headings, []);
  assert.equal(parsed.text, "only text");
});
