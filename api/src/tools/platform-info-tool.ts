import { z } from "zod";
import { SITE_NAME, SITE_ORIGIN } from "../site.ts";
import { defineTool } from "./tool.ts";
import { visiblePages, visibleUsers } from "./visible.ts";

const inputSchema = z.object({});

export const platformInfoTool = defineTool({
  name: "platform_info",
  description:
    "General information about the Shinsters platform: what it is, its users, and the " +
    "pages of the site itself (home, legal notice). For a user's own pages, use list_users.",
  inputSchema,
  async run(_input, context) {
    const visible = visiblePages(context);
    const home = visible.find((page) => page.url === "/");
    const sitePages = visible.filter((page) => page.owner === null);
    const pages = sitePages.map((page) => {
      return { url: page.url, title: page.title };
    });
    return {
      name: SITE_NAME,
      url: SITE_ORIGIN,
      description: home?.description ?? "",
      users: visibleUsers(context),
      pages,
    };
  },
});
