import { z } from "zod";
import { DEFAULT_LIMIT, MAX_LIMIT, searchPages } from "../search/search-pages.ts";
import { defineTool } from "./tool.ts";

const inputSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .describe("Words to look for, e.g. a project, skill or school name."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(MAX_LIMIT)
    .default(DEFAULT_LIMIT)
    .describe("Maximum number of pages to return."),
});

export const searchPagesTool = defineTool({
  name: "search_pages",
  description:
    "Keyword search over the pages of shinsters.fr. Returns matching pages (url, title, " +
    "description), best first. Matching ignores case and accents and tolerates small typos, " +
    "but not synonyms: if nothing is found, retry with other words, in English or French.",
  inputSchema,
  async run(input, context) {
    const results = await searchPages(context.engine, {
      query: input.query,
      limit: input.limit,
      viewer: context.viewer,
    });
    const pages = results.map((result) => {
      return { url: result.url, title: result.title, description: result.description };
    });
    return { pages };
  },
});
