import { SITE_ORIGIN } from "../site.ts";

// Decoded path of a link to shinsters.fr, resolved from the page at fromPath.
// Undefined for other sites and non-HTTP links (mailto:, javascript:…).
export function toSitePath(href: string, fromPath: string): string | undefined {
  const base = new URL(fromPath, SITE_ORIGIN);
  const parsed = URL.parse(href, base);
  if (!parsed || parsed.host !== base.host) {
    return undefined;
  }
  return decodePath(parsed.pathname);
}

function decodePath(pathname: string): string {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}
