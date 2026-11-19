// Regex-based: enough for our own hand-written pages, not for arbitrary HTML.

export interface ParsedHtml {
  title: string;
  description: string;
  lang: string;
  headings: string[];
  text: string;
  isRedirect: boolean;
}

const ENTITIES: Record<string, string> = {
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

const MAX_CODE_POINT = 0x10ffff;

export function parseHtml(html: string): ParsedHtml {
  return {
    title: cleanText(firstGroup(html, /<title[^>]*>([\s\S]*?)<\/title>/i)),
    description: cleanText(readMeta(html, "description")),
    lang: firstGroup(html, /<html[^>]*\blang="([^"]*)"/i),
    headings: readHeadings(html),
    text: readBodyText(html),
    isRedirect: /<meta\s+http-equiv="refresh"/i.test(html),
  };
}

function firstGroup(html: string, pattern: RegExp): string {
  const match = html.match(pattern);
  return match?.[1] ?? "";
}

function readMeta(html: string, name: string): string {
  const pattern = new RegExp(`<meta\\s+name="${name}"\\s+content="([^"]*)"`, "i");
  return firstGroup(html, pattern);
}

function readHeadings(html: string): string[] {
  const matches = html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi);
  const headings: string[] = [];
  for (const match of matches) {
    const heading = cleanText(match[1] ?? "");
    if (heading) {
      headings.push(heading);
    }
  }
  return headings;
}

// Nav and footer repeat on every page, so they would make every page match their words.
const NON_CONTENT = /<(script|style|nav|footer)\b[^>]*>[\s\S]*?<\/\1>/gi;

function readBodyText(html: string): string {
  const body = firstGroup(html, /<body[^>]*>([\s\S]*)<\/body>/i) || html;
  const withoutComments = body.replace(/<!--[\s\S]*?-->/g, " ");
  const content = withoutComments.replace(NON_CONTENT, " ");
  return cleanText(content);
}

function cleanText(fragment: string): string {
  const withoutTags = fragment.replace(/<[^>]*>/g, " ");
  const decoded = decodeEntities(withoutTags);
  return decoded.replace(/\s+/g, " ").trim();
}

function decodeEntities(text: string): string {
  const named = text.replace(/&(lt|gt|quot|#39|apos|nbsp);/g, (entity) => {
    return ENTITIES[entity] ?? entity;
  });
  const numeric = named.replace(/&#(x[0-9a-f]+|\d+);/gi, (entity, code: string) => {
    const isHex = code[0] === "x" || code[0] === "X";
    const value = isHex ? Number.parseInt(code.slice(1), 16) : Number(code);
    if (value > MAX_CODE_POINT) {
      return entity;
    }
    return String.fromCodePoint(value);
  });
  // Last, so "&amp;lt;" stays the literal text "&lt;".
  return numeric.replace(/&amp;/g, "&");
}
