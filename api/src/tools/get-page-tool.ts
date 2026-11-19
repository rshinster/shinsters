import { z } from "zod";
import { canView } from "../access/viewer.ts";
import { defineTool, ToolError } from "./tool.ts";

export const MAX_TEXT_LENGTH = 8000;

const inputSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .describe('Page path or full URL on shinsters.fr, e.g. "/rshin/profile/".'),
});

export const getPageTool = defineTool({
  name: "get_page",
  description:
    "Read one page of shinsters.fr: title, description, language, headings and text. " +
    'Use a url returned by another tool. A file (kind "file") has no text: offer its url.',
  inputSchema,
  async run(input, context) {
    const page = context.pages.get(input.url);
    // Same message for missing and forbidden pages, so private pages cannot be detected.
    if (!page || !canView(context.viewer, page)) {
      throw new ToolError(`No page at ${input.url}.`);
    }
    const truncated = page.text.length > MAX_TEXT_LENGTH;
    return {
      url: page.url,
      kind: page.kind,
      owner: page.owner,
      title: page.title,
      description: page.description,
      lang: page.lang,
      headings: page.headings,
      text: page.text.slice(0, MAX_TEXT_LENGTH),
      truncated,
    };
  },
});
