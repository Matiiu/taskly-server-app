# syntax=docker/dockerfile:1

ARG NODE_VERSION=24.9.0
ARG PNPM_VERSION=11.9.0

# ---- deps: install exact dependency versions from the lockfile ----
FROM node:${NODE_VERSION}-alpine AS deps
ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---- build: compile TypeScript and generate the Prisma client ----
FROM node:${NODE_VERSION}-alpine AS build
ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# prisma generate only needs a syntactically valid connection string, not a live DB
ENV DATABASE_URL="postgresql://user:password@localhost:5432/db"
RUN pnpm exec prisma generate
RUN pnpm build

# ---- prod-deps: install only production dependencies ----
FROM node:${NODE_VERSION}-alpine AS prod-deps
ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

# ---- runner: minimal final image ----
FROM node:${NODE_VERSION}-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

USER nestjs

EXPOSE 3000
CMD ["node", "dist/src/main.js"]
