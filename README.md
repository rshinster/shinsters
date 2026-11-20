# Shinsters

A modular web platform, built to grow. Live at [shinsters.fr](https://shinsters.fr).

## Layout

```
web/            Static site: the gateway, plus one space per user (/<user>/)
api/            API back-end in TypeScript (in progress, not deployed)
infra/          Docker Compose files to run the API
```

Each user space has its own styles and self-contained modules (`web/<user>/<module>/`).
A new space gets a button on the gateway (`web/index.html`) and its name in `USERS` (`api/src/site.ts`).

## Usage

```sh
make serve      # preview at http://localhost:8080
```

## API

Requires Node 26 (`api/.nvmrc`). TypeScript runs natively, with no build step.

```sh
make api-install  # install dependencies
make api-test     # run the tests
make api-check    # type-check
make api-lint     # check formatting and lint rules (Biome, read-only)
make api-format   # apply Biome formatting and safe fixes
make api-index    # index the pages of web/ into api/data/pages.json
make api-search q="webserv"  # search the index from the terminal
make api-mcp      # run the MCP server over stdio (for MCP clients)
make api-inspect  # open MCP Inspector in the browser to try the tools
make api-chat     # chat with the guide agent in the terminal (local Ollama by default)
make api-eval     # score the agent on behaviour cases (EVAL_RUNS=3 to repeat each)
make api-serve    # HTTP API on http://127.0.0.1:3000: GET /health, POST /chat
make api-up       # same API in Docker (local Ollama); api-logs to follow, api-down to stop
```

The agent talks to any OpenAI-compatible chat API, set with `MODEL_BASE_URL`, `MODEL_NAME`,
`MODEL_API_KEY` (optional) and `MODEL_REASONING_EFFORT` (`omit` to leave it out).
Defaults: a local [Ollama](https://ollama.com) with `qwen3:14b` and reasoning off.

`POST /chat` takes `{"messages": [{"role": "user", "content": "…"}]}` (up to 12 messages, the
last from the user) and returns `{"reply": "…", "links": [{"url", "title", "kind"}]}`.
Requests are checked before any model call; settings by environment variable:

| Variable | Default | Effect |
|---|---|---|
| `HOST`, `PORT` | `127.0.0.1`, `3000` | Listening address |
| `ALLOWED_ORIGINS` | `https://shinsters.fr,http://localhost:8080` | Sites allowed to call `/chat` |
| `RATE_LIMIT_PER_MINUTE` | `10` | Chat requests per client IP |
| `DAILY_TOKEN_BUDGET` | `1000000` | Model tokens per UTC day, then the chat pauses |
| `CHAT_ENABLED` | `true` | `false` pauses the chat without calling the model |
| `TRUST_PROXY` | `false` | `true` behind a reverse proxy: client IP from `X-Forwarded-For` |

### Docker

`api/Dockerfile` builds a small image (Node 26, production dependencies, not root) with the page
index of `web/` built in: rebuild it when the site changes. Only the files listed in
`.dockerignore` enter the build. `infra/compose.yaml` runs it for a server (published on
`127.0.0.1:3000` for a reverse proxy, read-only, no capabilities); settings come from the
environment, as in the table above. `infra/compose.local.yaml` adds the local Ollama for
`make api-up`.

Before each commit, run `make verify` (lint, type-check, tests, index of the real pages).
