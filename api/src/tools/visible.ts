import { canView } from "../access/viewer.ts";
import type { Page } from "../index/page.ts";
import type { ToolContext } from "./tool.ts";

export function visiblePages(context: ToolContext): Page[] {
  const pages = context.pages.list();
  return pages.filter((page) => canView(context.viewer, page));
}

// Users with at least one visible page or file; a user with only private content stays hidden.
export function visibleUsers(context: ToolContext): string[] {
  const owners = new Set<string>();
  for (const page of visiblePages(context)) {
    if (page.owner !== null) {
      owners.add(page.owner);
    }
  }
  return [...owners].sort();
}
