# Build from the repo root: docker build -f apps/web/Dockerfile .
FROM node:22-alpine AS base
WORKDIR /repo

# Keep only the web app and the workspace packages it depends on.
FROM base AS pruner
COPY . .
RUN npx --yes turbo@2 prune web --docker

FROM base AS builder
COPY --from=pruner /repo/out/json/ .
RUN npm ci
COPY --from=pruner /repo/out/full/ .
RUN npx turbo build --filter=web

FROM nginx:1.27-alpine AS runner
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
