# syntax=docker/dockerfile:1
# Образы nextjs-shop (как в примере with-docker из репозитория Next.js):
#   deps   — npm ci (+ prisma generate в postinstall);
#   tools  — исходники + все зависимости: миграции (prisma migrate deploy) и демо-данные (npm run db:seed);
#   build  — next build (output: "standalone");
#   runner — только .next/standalone, статика и public; Node 24, без dev-зависимостей.
ARG NODE_IMAGE=node:24.22.1-bookworm-slim

FROM ${NODE_IMAGE} AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# OpenSSL нужен schema engine Prisma (миграции).
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
COPY src/lib/config.ts ./src/lib/config.ts
RUN npm ci --no-audit --no-fund

FROM base AS tools
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate

FROM tools AS build
RUN npm run build

FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=8108 HOSTNAME=127.0.0.1
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
EXPOSE 8108
CMD ["node", "server.js"]
