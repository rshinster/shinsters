import { z } from "zod";
import { canView } from "../access/viewer.ts";
import { SITE_NAME, SITE_ORIGIN } from "../site.ts";
import { defineTool } from "./tool.ts";

const inputSchema = z.object({});

export const platformInfoTool = defineTool({
  name: "platform_info",
  description:
    "General information about the Shinsters platform and the list of its pages. " +
    "Use it for questions about the site itself or to see what pages exist.",
  inputSchema,
  async run(_input, context) {
    const home = context.pages.get("/");
    const visible = context.pages.list().filter((page) => canView(context.viewer, page));
    const pages = visible.map((page) => {
      return { url: page.url, title: page.title };
    });
    return {
      name: SITE_NAME,
      url: SITE_ORIGIN,
      description: home?.description ?? "",
      pages,
    };
  },
});
