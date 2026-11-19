import { z } from "zod";
import { DEFAULT_LIMIT, MAX_LIMIT, searchPages } from "../search/search-pages.ts";
import { defineTool, ToolError } from "./tool.ts";
import { visibleUsers } from "./visible.ts";

const inputSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .describe("Words to look for, e.g. a project, skill or school name."),
  user: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .toLowerCase()
    .optional()
    .describe('Only search the space of this user, e.g. "rshin". Names come from list_users.'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(MAX_LIMIT)
    .default(DEFAULT_LIMIT)
    .describe("Maximum number of results to return."),
});

export const searchPagesTool = defineTool({
  name: "search_pages",
  description:
    "Keyword search over the pages and files (e.g. a resume PDF) of shinsters.fr. Returns " +
    "matches (url, kind, owner, title, description), best first. Matching ignores case and " +
    "accents and tolerates small typos, but not synonyms: if nothing is found, retry with " +
    "other words, in English or French.",
  inputSchema,
  async run(input, context) {
    if (input.user !== undefined) {
      const users = visibleUsers(context);
      if (!users.includes(input.user)) {
        throw new ToolError(`No user named ${input.user}. Use list_users to see the users.`);
      }
    }
    const results = await searchPages(context.engine, {
      query: input.query,
      limit: input.limit,
      viewer: context.viewer,
      user: input.user,
    });
    const pages = results.map((result) => {
      return {
        url: result.url,
        kind: result.kind,
        owner: result.owner,
        title: result.title,
        description: result.description,
      };
    });
    return { pages };
  },
});
