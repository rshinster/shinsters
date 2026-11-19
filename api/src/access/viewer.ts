import type { Visibility } from "../index/page.ts";

export type Viewer = { kind: "anonymous" } | { kind: "member"; id: string };

export const ANONYMOUS: Viewer = { kind: "anonymous" };

// The only access rule; tools call it, the model never decides access.
export function canView(viewer: Viewer, item: { visibility: Visibility }): boolean {
  if (item.visibility === "public") {
    return true;
  }
  return viewer.kind === "member";
}
