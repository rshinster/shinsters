import type { Usage } from "../agent/model.ts";

export interface TokenBudget {
  // True once today's tokens are used up; checked before each model run.
  isExhausted(): boolean;
  record(usage: Usage): void;
  usedToday(): number;
}

export interface TokenBudgetOptions {
  dailyTokens: number;
  now: () => number;
}

// Counts input + output tokens per UTC day, in memory (a restart resets it: the provider's
// own spending limit stays the last safety net). One reply may go past the limit; the next waits.
export function createTokenBudget(options: TokenBudgetOptions): TokenBudget {
  let day = "";
  let used = 0;

  function sync(): void {
    const today = new Date(options.now()).toISOString().slice(0, 10);
    if (today !== day) {
      day = today;
      used = 0;
    }
  }

  return {
    isExhausted(): boolean {
      sync();
      return used >= options.dailyTokens;
    },
    record(usage: Usage): void {
      sync();
      used += usage.inputTokens + usage.outputTokens;
    },
    usedToday(): number {
      sync();
      return used;
    },
  };
}
