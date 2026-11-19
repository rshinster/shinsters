# Shinsters

A modular web platform, built to grow. Live at [shinsters.fr](https://shinsters.fr).

## Layout

```
web/            Static site: the gateway, plus one space per user (/<user>/)
api/            API back-end in TypeScript (in progress, not deployed)
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
```

Before each commit, run `make verify` (lint, type-check, tests, index of the real pages).
