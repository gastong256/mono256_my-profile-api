# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

FROM base AS deps

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build

COPY tsconfig.json tsconfig.build.json ./
COPY prisma ./prisma
COPY src ./src

RUN pnpm prisma:generate
RUN pnpm build
RUN pnpm prune --prod

FROM deps AS migrate

COPY tsconfig.json tsconfig.build.json ./
COPY prisma ./prisma
COPY src ./src

RUN pnpm prisma:generate

CMD ["pnpm", "prisma:migrate:deploy"]

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4000

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma ./prisma

USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/health').then(r => { if (!r.ok) process.exit(1); }).catch(() => process.exit(1));"

CMD ["node", "dist/server.js"]
