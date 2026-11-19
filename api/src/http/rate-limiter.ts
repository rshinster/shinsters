export interface RateLimiter {
  // True when the key may make one more request in the current window (and counts it).
  allow(key: string): boolean;
}

export interface RateLimiterOptions {
  limit: number;
  windowMs: number;
  now: () => number;
}

interface Window {
  start: number;
  count: number;
}

// Above this many tracked keys, expired windows are dropped so memory stays bounded.
const PRUNE_ABOVE_KEYS = 10_000;

// Fixed window per key, in memory: enough for one process (it resets on restart).
export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const windows = new Map<string, Window>();

  function prune(now: number): void {
    for (const [key, window] of windows) {
      if (now - window.start >= options.windowMs) {
        windows.delete(key);
      }
    }
  }

  return {
    allow(key: string): boolean {
      const now = options.now();
      const window = windows.get(key);
      if (!window || now - window.start >= options.windowMs) {
        if (windows.size >= PRUNE_ABOVE_KEYS) {
          prune(now);
        }
        windows.set(key, { start: now, count: 1 });
        return true;
      }
      if (window.count >= options.limit) {
        return false;
      }
      window.count += 1;
      return true;
    },
  };
}
