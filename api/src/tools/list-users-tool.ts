import { z } from "zod";
import { defineTool } from "./tool.ts";
import { visiblePages, visibleUsers } from "./visible.ts";

const inputSchema = z.object({});

export const listUsersTool = defineTool({
  name: "list_users",
  description:
    "List the users of Shinsters, each with the pages and files of their space " +
    "(url, kind, title). Use it when the visitor asks about a person, or to ask " +
    "which user they are interested in.",
  inputSchema,
  async run(_input, context) {
    const pages = visiblePages(context);
    const users = visibleUsers(context).map((name) => {
      const owned = pages.filter((page) => page.owner === name);
      const entries = owned.map((page) => {
        return { url: page.url, kind: page.kind, title: page.title };
      });
      return { name, pages: entries };
    });
    return { users };
  },
});
