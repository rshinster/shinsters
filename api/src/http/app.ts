import { getConnInfo } from "@hono/node-server/conninfo";
import { type Context, Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";
import { runAgent } from "../agent/agent.ts";
import type { Model } from "../agent/model.ts";
import { ModelError } from "../agent/openai-compatible-model.ts";
import type { ChatConfig } from "../config.ts";
import type { ToolContext } from "../tools/tool.ts";
import { ChatRequestSchema, MAX_BODY_BYTES } from "./chat-request.ts";
import { createRateLimiter } from "./rate-limiter.ts";
import { createTokenBudget } from "./token-budget.ts";

const RATE_LIMIT_WINDOW_MS = 60_000;
const PREFLIGHT_CACHE_SECONDS = 600;
// Model runs at once: more would queue behind one GPU and could all pass the budget check together.
export const MAX_CONCURRENT_CHATS = 4;

export interface AppOptions {
  context: ToolContext;
  model: Model;
  chat: ChatConfig;
  // Injected in tests to move time forward.
  now?: () => number;
  // One line per chat request: status, steps, tokens, time. Never IPs or message text.
  log?: (line: string) => void;
}

// Checks run cheapest first; the model is called only once all of them pass.
export function createApp(options: AppOptions): Hono {
  const now = options.now ?? Date.now;
  const log = options.log ?? console.log;
  const limiter = createRateLimiter({
    limit: options.chat.rateLimitPerMinute,
    windowMs: RATE_LIMIT_WINDOW_MS,
    now,
  });
  const budget = createTokenBudget({ dailyTokens: options.chat.dailyTokenBudget, now });
  const allowedOrigins = new Set(options.chat.allowedOrigins);
  let running = 0;
  const app = new Hono();

  app.get("/health", (c) => c.json({ ok: true }));

  app.use(
    "/chat",
    cors({
      origin: options.chat.allowedOrigins,
      allowMethods: ["POST"],
      allowHeaders: ["Content-Type"],
      maxAge: PREFLIGHT_CACHE_SECONDS,
    }),
  );

  app.post(
    "/chat",
    async (c, next) => {
      // CORS only stops browsers from reading the answer; refuse other sites' pages outright.
      const origin = c.req.header("origin");
      if (origin !== undefined && !allowedOrigins.has(origin)) {
        return fail(c, 403, "Origin not allowed.");
      }
      // A JSON content type forces a CORS preflight, so other sites cannot post silently.
      const contentType = c.req.header("content-type") ?? "";
      if (!contentType.startsWith("application/json")) {
        return fail(c, 415, "Send JSON (Content-Type: application/json).");
      }
      await next();
    },
    bodyLimit({
      maxSize: MAX_BODY_BYTES,
      onError: (c) => fail(c, 413, "Request too large."),
    }),
    async (c) => {
      if (!options.chat.enabled) {
        return fail(c, 503, "The chat is paused.");
      }
      const ip = clientIp(c, options.chat.trustProxy);
      if (!limiter.allow(ip)) {
        return fail(c, 429, "Too many messages. Please wait a minute.");
      }
      const body = await readJson(c);
      const parsed = ChatRequestSchema.safeParse(body);
      if (!parsed.success) {
        const details = z.prettifyError(parsed.error);
        return fail(c, 400, `Invalid request:\n${details}`);
      }
      if (budget.isExhausted()) {
        return fail(c, 503, "The chat is paused for today. Please come back tomorrow.");
      }
      if (running >= MAX_CONCURRENT_CHATS) {
        return fail(c, 503, "The guide is busy. Please try again in a moment.");
      }

      running += 1;
      const started = now();
      try {
        const reply = await runAgent({
          model: options.model,
          context: options.context,
          messages: parsed.data.messages,
        });
        budget.record(reply.usage);
        const tokens = `${reply.usage.inputTokens}/${reply.usage.outputTokens}`;
        log(`chat 200 ${reply.status} steps=${reply.steps} tokens=${tokens} ${now() - started}ms`);
        return c.json({ reply: reply.text, links: reply.links });
      } catch (error) {
        if (!(error instanceof ModelError)) {
          throw error;
        }
        log(`chat 502 model error after ${now() - started}ms: ${error.message}`);
        return fail(c, 502, "The guide is unavailable right now. Please try again later.");
      } finally {
        running -= 1;
      }
    },
  );

  app.notFound((c) => fail(c, 404, "Not found."));
  app.onError((error, c) => {
    log(`error 500: ${error.stack ?? error.message}`);
    return fail(c, 500, "Something went wrong.");
  });

  return app;
}

function fail(c: Context, status: ContentfulStatusCode, message: string): Response {
  return c.json({ error: message }, status);
}

async function readJson(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return undefined;
  }
}

// Behind Caddy the socket address is the proxy, so the last X-Forwarded-For hop is the client.
function clientIp(c: Context, trustProxy: boolean): string {
  if (trustProxy) {
    const forwarded = c.req.header("x-forwarded-for") ?? "";
    const hops = forwarded.split(",");
    const lastHop = hops.at(-1)?.trim();
    if (lastHop) {
      return lastHop;
    }
  }
  const info = getConnInfo(c);
  return info.remote.address ?? "unknown";
}
