import { canView } from "../access/viewer.ts";
import type { Kind } from "../index/page.ts";
import type { ToolContext } from "../tools/tool.ts";

export interface ReplyLink {
  url: string;
  title: string;
  kind: Kind;
}

export interface ReplyParts {
  text: string;
  links: ReplyLink[];
}

const MARKDOWN_LINK = /\[([^\]\n]+)\]\(([^)\s]+)\)/g;

// Markdown links in the model's text become buttons, but only for pages of the index the viewer
// may see: whatever the model writes, a button can never point elsewhere. The text keeps the
// link label only, so no url from the model is shown as clickable.
export function extractLinks(text: string, context: ToolContext): ReplyParts {
  const links: ReplyLink[] = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(MARKDOWN_LINK)) {
    const href = match[2] ?? "";
    const page = context.pages.get(href);
    if (!page || !canView(context.viewer, page) || seen.has(page.url)) {
      continue;
    }
    seen.add(page.url);
    links.push({ url: page.url, title: page.title, kind: page.kind });
  }
  const plainText = text.replace(MARKDOWN_LINK, "$1");
  return { text: plainText.trim(), links };
}
