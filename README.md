# Taskly Server App

Backend API for **Taskly**, a task manager. Built with [NestJS](https://nestjs.com/) (code-first GraphQL), [Prisma](https://www.prisma.io/) and PostgreSQL.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Data Model](#data-model)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Testing](#testing)
- [Docker](#docker)
- [Production Readiness](#production-readiness)

## Tech Stack

| Layer          | Technology                                   |
| -------------- | --------------------------------------------- |
| Runtime        | Node.js 24, TypeScript 5                      |
| Framework      | NestJS 11                                     |
| API            | GraphQL (code-first) via Apollo Server 5       |
| ORM / DB       | Prisma 7 + PostgreSQL 16                       |
| Auth           | JWT (`@nestjs/jwt`), bcrypt password hashing   |
| Validation     | `class-validator` / `class-transformer`        |
| Events         | `@nestjs/event-emitter` (audit log pipeline)   |
| Package Manager| pnpm                                           |
| Testing        | Jest + ts-jest (unit), Supertest (e2e)         |

## Architecture

The app follows a standard **layered NestJS architecture**, split into feature modules:

```
GraphQL Resolver  →  Service (business logic)  →  Prisma (data access)  →  PostgreSQL
                              │
                              └─▶ EventEmitter ─▶ AuditLogListener ─▶ AuditLogService
```

- **Resolvers** (`*.resolver.ts`) are a thin GraphQL layer — no business logic, just input/output mapping and guard/decorator wiring.
- **Services** (`*.service.ts`) hold all business logic and talk to Prisma directly.
- **Audit logging** is decoupled via events: services call `AppEventEmitterService.emitAuditLog(...)`, and `AuditLogListener` (listening on `EVENTS.AUDIT_LOG`) asynchronously persists the entry through `AuditLogService`. This keeps write paths from being blocked by logging.
- **Auth** is JWT-based. `JwtAuthGuard` protects resolvers; `@CurrentUser()` decorator injects the authenticated user into handlers. Revoked tokens (logout) are tracked in the `RevokedToken` table.
- **Config** (`src/config`) centralizes GraphQL and JWT setup, sourced from environment variables via `@nestjs/config`.

## Project Structure

```
src/
├── app.module.ts          # Root module wiring
├── main.ts                 # Bootstrap (ValidationPipe, listen)
├── config/                 # GraphQL + JWT configuration
├── common/                 # Shared enums, dto, utils, event emitter, test utilities
├── prisma/                 # PrismaModule / PrismaService
├── auth/                   # Register/login/logout, guards, decorators, JWT
├── users/                  # User CRUD & profile
├── categories/              # Task categories
├── statuses/                # Task statuses (kanban-style columns)
├── tasks/                   # Core task CRUD
├── task-assignees/          # Assigning users to tasks
├── comments/                 # Comments + replies on tasks
└── audit-log/                # Audit trail (listener + query API)

prisma/
├── schema.prisma           # Data model (source of truth)
└── migrations/              # Versioned SQL migrations
```

Each feature module follows the same internal layout: `*.module.ts`, `*.resolver.ts`, `*.service.ts`, `dto/`, `entities/`, and `__TEST__/` for unit tests.

## Data Model

Core entities (see `prisma/schema.prisma` for the full definition):

- **User** — has a `role` (`ADMIN` / `USER`), auth provider (`LOCAL`/`GOOGLE`/`GITHUB`), owns tasks, categories, statuses, comments.
- **Task** — belongs to a user, optional category/status, has assignees and comments.
- **Category** / **Status** — user-scoped labels for organizing tasks.
- **Comment** / **CommentReply** — threaded discussion on a task.
- **TaskAssignee** — many-to-many join between users and tasks.
- **AuditLog** — immutable trail of actions (who did what, before/after snapshot).
- **RevokedToken** — JWT blacklist for logout/invalidation.

## Getting Started

### Prerequisites

- Node.js **24.x** (see [Docker](#docker) section for how this is pinned)
- pnpm **11.x** (`corepack enable` will pick up the version below)
- Docker (for the local PostgreSQL instance) — or a local PostgreSQL 16 instance

### 1. Clone & install

```bash
git clone <repo-url>
cd taskly-server-app
corepack enable
pnpm install --frozen-lockfile
```

`--frozen-lockfile` ensures pnpm installs **exactly** the versions in `pnpm-lock.yaml`, matching CI/Docker/every teammate's machine.

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local` with real values (see [Environment Variables](#environment-variables)). The app loads env files based on `NODE_ENV`: `.env.local`, `.env.development`, `.env.production`, `.env.test`.

### 3. Start PostgreSQL

```bash
docker compose up -d
```

### 4. Run migrations & generate the Prisma client

```bash
pnpm exec prisma migrate deploy   # apply existing migrations
pnpm exec prisma generate         # generate the client into /generated/prisma
```

### 5. Run the app

```bash
pnpm start:local     # NODE_ENV=local, watch mode
pnpm start:dev        # NODE_ENV=development, watch mode
```

GraphQL Playground is available at `http://localhost:3000/graphql` (when `GRAPHQL_PLAYGROUND=true`).

## Environment Variables

| Variable                | Description                                      | Example                                                    |
| ------------------------ | ------------------------------------------------- | ----------------------------------------------------------- |
| `NODE_ENV`               | Selects which `.env.*` file is loaded              | `local`, `development`, `production`, `test`                |
| `DB_USER`                 | Postgres user (docker-compose)                    | `taskly`                                                     |
| `DB_PASSWORD`             | Postgres password (docker-compose)                | `changeme`                                                   |
| `DB_NAME`                 | Postgres database name                            | `taskly`                                                     |
| `DB_PORT`                 | Host port mapped to Postgres                       | `5432`                                                       |
| `DATABASE_URL`            | Full Prisma connection string                      | `postgresql://user:pass@localhost:5432/taskly?schema=public` |
| `GRAPHQL_AUTO_SCHEMA`     | Enable code-first schema autogeneration            | `true`                                                        |
| `GRAPHQL_PLAYGROUND`      | Enable GraphQL Playground UI                       | `false` in production                                        |
| `JWT_SECRET`              | Secret used to sign JWTs                           | (generate a strong random secret)                            |
| `JWT_EXPIRES_IN`          | Access token TTL                                   | `4h`                                                          |
| `PORT`                    | HTTP port the server listens on                    | `3000`                                                        |

> Never commit real secrets. `.env.local`, `.env.production`, etc. are already git-ignored.

## Available Scripts

| Command              | Description                                  |
| --------------------- | --------------------------------------------- |
| `pnpm start`           | Start the app (no watch)                      |
| `pnpm start:local`     | Start in watch mode with `NODE_ENV=local`     |
| `pnpm start:dev`       | Start in watch mode with `NODE_ENV=development` |
| `pnpm start:debug`     | Start with the Node debugger attached          |
| `pnpm start:prod`      | Run the compiled `dist/main.js`               |
| `pnpm build`           | Compile TypeScript to `dist/`                  |
| `pnpm lint`            | ESLint with autofix                            |
| `pnpm format`          | Prettier write                                 |
| `pnpm test`            | Run unit tests                                 |
| `pnpm test:watch`      | Unit tests in watch mode                       |
| `pnpm test:cov`        | Unit tests with coverage report                |
| `pnpm test:e2e`        | End-to-end tests                               |

## Testing

- Unit tests live next to the code they cover, under `src/**/__TEST__/*.test.ts`.
- Shared mocks/factories live in `src/common/testing/` (Prisma mocks, event emitter mock, entity factories).
- Coverage threshold is enforced at **80%** (branches/functions/lines/statements) globally, with a relaxed threshold for `*.resolver.ts` files, since GraphQL decorator type-factory lambdas (e.g. `@Query(() => Type)`) are only invoked by the schema builder, not by unit tests.

```bash
pnpm test:cov
```

## Docker

The repository ships with:

- `docker-compose.yml` — PostgreSQL 16 for local development.
- `Dockerfile` — multi-stage production build of the API itself.

### Run only the database (local dev)

```bash
docker compose up -d
```

### Build & run the API in a container

```bash
docker build -t taskly-server-app .
docker run --env-file .env.production -p 3000:3000 taskly-server-app
```

### Keeping dependency versions consistent

To make sure every environment (your machine, CI, and the Docker image) installs **the exact same** library versions:

1. **Lockfile is committed** (`pnpm-lock.yaml`) — always install with `pnpm install --frozen-lockfile`, never plain `pnpm install` in CI/Docker.
2. **`packageManager` field pinned** in `package.json` (`pnpm@11.9.0`) — `corepack` will auto-install that exact pnpm version, so nobody accidentally resolves the lockfile with a different pnpm major version.
3. **`engines.node` field pinned** in `package.json` — paired with `.nvmrc`, this keeps local Node version aligned with the Docker base image (`node:24-alpine`).
4. **Docker build uses the same lockfile** — the `Dockerfile` copies `pnpm-lock.yaml` and runs `pnpm install --frozen-lockfile`, so the container gets identical dependency versions to your local install.
5. **Prisma engine version** is pinned in `package.json`/lockfile; run `pnpm exec prisma generate` inside the Docker build stage (already done in the `Dockerfile`) so the generated client matches the `@prisma/client` version installed, not whatever is cached locally.

## Production Readiness

Current state and what's still missing before a production deploy:

**Already in place**
- Layered architecture with clear separation of concerns.
- Global `ValidationPipe` (whitelist + transform) in `main.ts`.
- JWT auth with token revocation table.
- Audit logging pipeline decoupled via events.
- 80% enforced test coverage.
- Migrations tracked in `prisma/migrations`.

**Fixed in this change (verified with a real Docker build + Postgres container + live GraphQL request)**
- `@prisma/client` was a `devDependency` even though the generated Prisma client requires it at runtime (`@prisma/client/runtime/client`). A production install (`pnpm install --prod`) would crash on boot with `MODULE_NOT_FOUND`. Moved to `dependencies`.
- `start:prod` pointed at `dist/main.js`, but since `tsconfig.json` has no `rootDir`, `nest build` actually emits to `dist/src/main.js`. The script would fail to find the entry file. Fixed to `node dist/src/main.js` (the `-r tsconfig-paths/register` flag was also removed — path aliases are already rewritten to relative imports at compile time, so it wasn't needed).
- **Dockerized the app itself** — added a multi-stage `Dockerfile`/`.dockerignore`; previously only the database was containerized.
- **Pinned Node/pnpm versions** — added `engines`/`packageManager` (see above) so builds are reproducible.

**Still recommended before going to production**
- **Disable GraphQL Playground & introspection** in production (`GRAPHQL_PLAYGROUND=false`) — currently controlled by env var, make sure it's `false` in `.env.production`.
- **CORS** — no CORS configuration currently exists in `main.ts`; add `app.enableCors({ origin: [...] })` restricted to your known frontend origin(s).
- **Security headers** — no `helmet` (or equivalent) is configured; add it to set standard security headers.
- **Rate limiting** — no throttling (`@nestjs/throttler`) is configured; add it, especially on `login`/`register` mutations, to mitigate brute force/credential stuffing.
- **Authorization (RBAC)** — `User.role` (`ADMIN`/`USER`) exists in the schema but there is no `RolesGuard`/`@Roles()` decorator enforcing it anywhere yet; access control today is authentication-only (any authenticated user can call any resolver).
- **Health check endpoint** — no `/health` (e.g. `@nestjs/terminus`) exists for load balancer / orchestrator liveness/readiness probes.
- **Structured logging & error tracking** — current logging is Nest's default console logger; consider structured JSON logs plus an error tracker (Sentry, etc.) for production visibility.
- **Graceful shutdown** — ensure `app.enableShutdownHooks()` is called so Prisma connections close cleanly on `SIGTERM` (important when running under Docker/Kubernetes).
- **Secrets management** — `JWT_SECRET` and DB credentials should come from a secrets manager (not plain `.env.production` files) in real production infra.

None of these are architectural blockers — the core design is sound — but the authorization gap (RBAC not enforced) and missing CORS/rate limiting/security headers are the highest-priority items to close before exposing this publicly.
