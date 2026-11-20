# API image. Build context: the repository root (see .dockerignore), e.g.
#   docker compose -f infra/compose.yaml build
# The page index is built from web/ at build time: rebuild the image when the site changes.

ARG NODE_IMAGE=node:26.13.1-slim

# 1. Production dependencies only, from the lockfile.
FROM ${NODE_IMAGE} AS deps
WORKDIR /app/api
COPY api/package.json api/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# 2. Index of the site's pages and linked files.
FROM deps AS index
COPY api/src ./src
COPY api/scripts ./scripts
COPY web /app/web
RUN node scripts/build-index.ts

# 3. Runtime: code, dependencies and index; no web/, no dev tools, not root.
FROM ${NODE_IMAGE}
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
WORKDIR /app/api
COPY --from=deps /app/api/node_modules ./node_modules
COPY api/package.json ./
COPY api/src ./src
COPY api/scripts ./scripts
COPY --from=index /app/api/data/pages.json ./data/pages.json
USER node
EXPOSE 3000
# No curl in the slim image: Node's fetch does the check.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "scripts/serve.ts"]
