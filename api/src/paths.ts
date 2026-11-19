import path from "node:path";

export const API_ROOT = path.resolve(import.meta.dirname, "..");

// Relative paths in config are relative to api/, whatever the current directory.
export function resolveFromApiRoot(target: string): string {
  return path.resolve(API_ROOT, target);
}
