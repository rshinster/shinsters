PORT ?= 8080
TYPST ?= typst
CV_PDF := web/rshin/profile/resume.pdf
CV_ARGS := --root . --input data=/content/cv/cv.yaml templates/cv/cv.typ $(CV_PDF)

.PHONY: serve cv cv-watch cv-final api-install api-test api-check api-index api-search api-lint api-format api-mcp api-inspect api-chat api-eval api-serve api-up api-down api-logs verify

serve:
	python3 -m http.server $(PORT) -d web

cv:
	$(TYPST) compile $(CV_ARGS)

cv-watch:
	$(TYPST) watch $(CV_ARGS)

cv-final:
	$(TYPST) compile --input strict=true $(CV_ARGS)

api-install:
	cd api && npm ci

api-test:
	cd api && npm test

api-check:
	cd api && npm run check

api-lint:
	cd api && npm run lint

api-format:
	cd api && npm run format

api-index:
	cd api && npm run index

api-search:
	cd api && npm run -s search -- "$$q"

api-mcp:
	cd api && npm run mcp

api-inspect:
	cd api && npm run inspect

api-chat:
	cd api && npm run -s chat

# Calls the real model (not part of verify). EVAL_RUNS=3 repeats each case.
api-eval:
	cd api && npm run -s eval

api-serve:
	cd api && npm run -s serve

# The API in Docker on this machine, using the local Ollama (infra/compose.local.yaml).
COMPOSE_LOCAL := docker compose -f infra/compose.yaml -f infra/compose.local.yaml

api-up:
	$(COMPOSE_LOCAL) up -d --build

api-down:
	$(COMPOSE_LOCAL) down

api-logs:
	$(COMPOSE_LOCAL) logs -f api

# Run before each commit; read-only except the git-ignored index.
verify: api-lint api-check api-test api-index
