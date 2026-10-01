# Build from the repo root: docker build -f apps/api/Dockerfile .
FROM node:22-alpine AS base
WORKDIR /repo

# Keep only the api app and the workspace packages it depends on.
FROM base AS pruner
COPY . .
RUN npx --yes turbo@2 prune api --docker

FROM base AS builder
COPY --from=pruner /repo/out/json/ .
RUN npm ci
COPY --from=pruner /repo/out/full/ .
RUN npx turbo build --filter=api

FROM base AS prod-deps
COPY --from=pruner /repo/out/json/ .
RUN npm ci --omit=dev --workspace api \
  && mkdir -p apps/api/node_modules \
  && npm cache clean --force

# Same layout as the workspace, so hoisted and app-local deps both resolve.
FROM node:22-alpine AS runner
ENV NODE_ENV=production
WORKDIR /repo/apps/api
COPY --from=prod-deps --chown=node:node /repo/node_modules /repo/node_modules
COPY --from=prod-deps --chown=node:node /repo/apps/api/node_modules ./node_modules
COPY --from=builder --chown=node:node /repo/apps/api/dist ./dist
COPY --from=builder --chown=node:node /repo/apps/api/package.json ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "dist/main.js"]
