# Build from the repository root:
#   podman build -f apps/nutrition-tracker/Dockerfile -t nutrition-tracker .
#
# Corepack no longer ships with Node 25+, so pnpm is installed through npm.
FROM docker.io/library/node:26-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install --global pnpm@12.16.1 turbo@2.11.10
WORKDIR /repo

# Reduces the workspace to this app and its dependencies, so changes elsewhere
# in the monorepo don't invalidate the install layer.
FROM base AS pruner
COPY . .
RUN turbo prune nutrition-tracker --docker

FROM base AS builder
COPY --from=pruner /repo/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /repo/out/full/ .
# Root files outside any workspace package aren't included by turbo prune.
COPY --from=pruner /repo/tsconfig.base.json ./
RUN pnpm turbo run build --filter=nutrition-tracker

FROM docker.io/library/node:26-alpine AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
WORKDIR /app

# Created before the volume mounts so the volume inherits this ownership.
RUN mkdir -p /data/uploads && chown -R node:node /data

COPY --from=builder --chown=node:node /repo/apps/nutrition-tracker/.next/standalone ./
COPY --from=builder --chown=node:node /repo/apps/nutrition-tracker/.next/static ./apps/nutrition-tracker/.next/static

USER node
EXPOSE 3000
# server.js reads PORT, which Cloud Run sets at runtime.
CMD ["node", "apps/nutrition-tracker/server.js"]
