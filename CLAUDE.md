# CLAUDE.md

Rules for working on **Taskly Server App**: NestJS 11 + GraphQL (code-first, Apollo) + Prisma 7 (PostgreSQL), managed with pnpm.

These rules are mandatory. When existing code contradicts them, follow the rules and don't copy the old pattern (see [Known gaps](#known-gaps)).

## Commands

```bash
pnpm start:local      # dev server with watch (NODE_ENV=local)
pnpm build            # nest build -> dist/src/main.js
pnpm lint             # eslint --fix
pnpm format           # prettier
pnpm test             # unit tests
pnpm test:cov         # unit tests + coverage (80% threshold)
pnpm prisma migrate dev --name <name>   # new migration after editing prisma/schema.prisma
```

Run `pnpm lint` and `pnpm test` before you say a change is finished.

## Architecture: modular, in layers

Each feature is a NestJS module under `src/<feature>/`. Every feature module **must** have these four layers:

| Layer      | File                      | Responsibility                                                                   |
| ---------- | ------------------------- | -------------------------------------------------------------------------------- |
| Module     | `<feature>.module.ts`     | Wires providers and imports. Exports only the service.                           |
| Resolver   | `<feature>.resolver.ts`   | GraphQL endpoint: args, guards, policies. Calls the service. **No logic.**       |
| Service    | `<feature>.service.ts`    | **All business logic**: validation, rules, errors, audit logs, mapping to types. |
| Repository | `<feature>.repository.ts` | **The only layer that talks to Prisma.** Plain data access, no business rules.   |

Data flow is one-way: `Resolver -> Service -> Repository -> Prisma`. A layer never skips a level or calls back up.

### Resolver rules

- Only receive args, apply guards/decorators, call **one** service method and return its result.
- No `if` business rules, no Prisma, no repository injection, no data transformation.
- **Queries** return the service result as-is (`PaginatedXType`, `XDetailType`, ...).
- **Mutations always return a success message + the affected data.** Use the `MutationPayload` factory with the mapped GraphQL type of the entity that was created, updated or deleted:

  ```ts
  const UpdateTaskStatusPayload = MutationPayload('UpdateTaskStatusPayload', { task: TaskDetailType });

  @Mutation(() => UpdateTaskStatusPayload, { name: 'updateTaskStatus' })
  async updateStatus(...): Promise<InstanceType<typeof UpdateTaskStatusPayload>> {
    const task = await this.tasksService.updateStatus(userId, workspaceId, id, input);
    return { message: `Task ${task.title} status updated successfully`, task };
  }
  ```

  - The service returns the entity already mapped to its GraphQL type (e.g. `toTaskType`). The resolver only adds the `message`.
  - Name the field after the entity (`task`, `category`, `user`), not `data`, so Apollo can update its cache by `__typename` + `id`.
  - Return the entity **after** the change. Deletes return the deleted entity (at least its `id`).
  - Never expose sensitive fields (e.g. return `SafeUser` types, never passwords).
  - Mutations with no entity behind them (e.g. `logout`) return only the `message`. Extra values the client needs (e.g. the login `token`) go next to the `message`.

- Protect resolvers with `@UseGuards(JwtAuthGuard)` at class level. Workspace-scoped operations add `@Can('<resource>.<action>')` + `@UseGuards(PolicyGuard)`; policies live in `src/authorization/policies/`.
- Get the authenticated user with `@CurrentUser()` (the user without its password, loaded by `JwtAuthGuard`) or one field with `@CurrentUser('id')`. Use `@CurrentSession('jti')` only when you need the token itself (e.g. logout). Never read the raw request context in a resolver.
- Handler data loaded by a guard is read with a param decorator (`@CurrentUser()`, `@CurrentTask()`, `@TargetUser()`), not loaded again in the service. The guard decides and loads; the decorator only reads.
- Self-or-admin operations on users use `TargetUserGuard` + `@TargetUser()`: an optional `id` arg, where no id means yourself and another user's id requires `ADMIN`. Pass the actor (`@CurrentUser()`) to the service: it re-checks the rule with `assertCanActOnUser` (it must not trust that every caller went through the guard) and records the actor in the audit log.

### Service rules

- Inject repositories (its own and, if needed, other modules' **services**), never `PrismaService` for queries.
- Owns all decisions: existence checks, uniqueness, permissions beyond the policy guard, state transitions.
- Throws Nest HTTP exceptions (`NotFoundException`, `ConflictException`, `BadRequestException`, ...).
- Emits an audit log for every state-changing operation via `AppEventEmitterService.emitAuditLog(...)`.
- Maps Prisma models to GraphQL types with a single mapper per entity (e.g. `toCategoryType`), reused everywhere.
- Repeated lookups go in a private helper such as `findInWorkspaceOrThrow(workspaceId, id)`.
- Transactions: the service may open `this.prisma.$transaction(async (tx) => { ... })` **only** to pass `tx` to repository methods. No model queries inside the service.
- Cross-module access goes through the other module's exported **service**, never its repository.

### Repository rules

- `@Injectable()` class that injects `PrismaService`. This is the only place where `prisma.<model>` is used.
- One method per query, named after what it does: `findById`, `findByName`, `findPage`, `create`, `updateColor`, `delete`. For lists:
  - `findPage`: paginated (`count` + `findMany` in one `$transaction([...])`).
  - `findMany`: filtered, not paginated.
  - `findAll`: every row, no filter and no pagination.
- **Reads return active rows only**, with no `active` parameter. Queries that include inactive rows live only in the admin module's repository. Soft deletes use `deactivate` / `activate` methods, never a boolean (`setActive(id, false)`).
- Write methods (and reads used inside transactions) take a last param `db: Db = this.prisma` (`Db` from `@/prisma/prisma.types`) so they work in and out of a transaction.
- No business rules and no Nest HTTP exceptions. Return `null` when not found and let the service decide.
- Scope every query by its owner (e.g. `workspaceId`) when the entity belongs to one.
- Export input data types next to the repository (`export type CreateCategoryData = Pick<Category, ...>`).
- **Passwords stay in login.** `UsersRepository` always returns `SafeUser` (`omit: OMIT_PASSWORD`). Only `LoginRepository` may read or write the password hash: its `findById`/`findByEmail` return the full `User` (password and inactive users included), plus `updatePassword`. Call them as `loginRepo.findBy...` so the source is clear.

### Module rules

- `providers: [XService, XResolver, XRepository]`, `exports: [XService]`.
- Import other feature modules to use their services. Do not re-provide another module's classes.

## Feature folder layout

```text
src/<feature>/
  <feature>.module.ts
  <feature>.resolver.ts
  <feature>.service.ts
  <feature>.repository.ts
  dto/          # @InputType classes: <action>-<entity>.input.ts
  entities/     # @ObjectType classes: <entity>.type.ts, paginated-<entity>.type.ts
  decorators/   guards/   types/   utils/   enums/   constants/   (only when needed)
  __TEST__/     # <file>.test.ts for each layer
```

Shared code lives in `src/common/` (constants, dto, entities, enums, exceptions, types, utils, testing). Prisma setup lives in `src/prisma/`.

## Clean code: SOLID, DRY, KISS

- Follow SOLID and DRY, but **KISS wins**: when an abstraction makes the code harder to read, choose the simpler version. Readable code beats clever code.
- **Don't repeat code.** Before writing a helper, check `src/common/` and the feature's `utils/`. If logic is used in two places, extract it.
- Reuse what already exists:
  - Pagination: `PaginationArgsInput`, `PAGE_DEFAULT`/`LIMIT_DEFAULT`, `paginationMeta(total, page, limit)`.
  - Mutation payloads: `MutationPayload(name, fields)` / `MutationResponseType`.
  - Prisma errors: `isUniqueViolation(e)` from `@/prisma/prisma.errors`.
  - Audit logs: `AppEventEmitterService.emitAuditLog`.
  - Colors, events and other constants: `src/common/constants/`.
- Small functions with one job and intention-revealing names. Early returns over nested `if`s.
- Type IDs from Prisma models: `User['id']`, `Workspace['id']`, not `string`.
- Import Prisma types with `import type { ... } from 'generated/prisma/client'`.
- Use the `@/` path alias for imports from `src/` (no long `../../`).
- No magic strings or numbers: move them to a constant or enum.
- Comment only complex logic or non-obvious steps, and keep it brief. Comments explain **why**, not what. Add a short JSDoc for non-obvious rules.
- Formatting follows Prettier: single quotes, trailing commas, 2 spaces, 100-char lines.

## Testing

- Every layer gets tests in `src/<feature>/__TEST__/<file>.test.ts` (Jest + ts-jest).
- Use shared mocks and factories from `src/common/testing/` (`prisma.mock.ts`, `app-event-emitter.mock.ts`, `*-service.mock.ts`, `domain.factory.ts`, `gql-guard.factory.ts`). A mock used by one test file may live in that file; once a second file needs it, move it to `src/common/testing/`.
- Repository tests mock Prisma. Service tests mock repositories and the event emitter. Resolver tests mock the service.
- Coverage threshold is 80% (resolvers have a lower per-glob threshold in `jest.config.ts`).
- Files excluded by `collectCoverageFrom` in `jest.config.ts` (modules, inputs, types, enums, configs, ...) don't need tests.

## Database

- Change the schema only in `prisma/schema.prisma` and always create a migration.
- Never edit a migration that has already been applied; add a new one.

## Known gaps

These modules predate the rules and still query Prisma outside a repository. Don't copy them. When you touch one, move its queries into a `<feature>.repository.ts`:

- `src/comments/comments.service.ts` (no repository yet)
- `src/audit-log/audit-log.service.ts` (no repository yet)

Some older mutations return only the `message`. When you touch one, make it return the affected entity next to the `message`.

## Git workflow

- **Never work, commit or push on `main` or `develop`.** Before changing code, create a branch from the current base named after the task: `<type>/<short-kebab-description>` (e.g. `feature/task-labels`, `fix/register-error`, `refactor/users-repository`, `test/tasks-module`). `<type>` is one of `feature`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `hotfix`.
- If you're already on a branch for this task, keep working there.
- One commit per logical change. Work that belongs to the task goes in its own commit(s); an unrelated fix found along the way goes in a separate commit.
- After committing, always push to the current branch (`git push -u origin HEAD`). Never force-push and never use `--no-verify`.

## Commit messages

Format (all in English):

```text
<emoji> <type>(<optional scope>): <short summary>

<Body: what changed and why, wrapped at 72 chars.>
```

- The title is **72 characters max, emoji included**. Imperative mood, lowercase, no period.
- The scope is the affected feature/module when there is one (`login`, `tasks`, `categories`, ...).
- The body is mandatory and describes the changes made.

| Emoji | Type       | Use for                                                 |
| ----- | ---------- | ------------------------------------------------------- |
| ✨    | `feat`     | A new feature                                           |
| 🐛    | `fix`      | A bug fix                                               |
| 📝    | `docs`     | Documentation only changes                              |
| 💄    | `style`    | Formatting, missing semicolons, etc. (no logic change)  |
| ♻️    | `refactor` | Code change that neither fixes a bug nor adds a feature |
| ⚡    | `perf`     | Code change that improves performance                   |
| 🧪    | `test`     | Adding or correcting tests                              |
| 🔧    | `chore`    | Maintenance, build process or auxiliary tools           |
| 🚀    | `ci`       | CI/CD configuration changes                             |
| 🔥    | `remove`   | Removing code or files                                  |
| 🚑    | `hotfix`   | Critical hotfix                                         |

Example:

```text
🐛 fix(login): fix register error

Register failed when the document already existed because the unique
violation was not caught. LoginService now maps it to a ConflictException.
```

## Agents

This project has three agents in `.claude/agents/`. Start the boss with `claude --agent server`.

| Agent    | Role                                                               |
| -------- | ------------------------------------------------------------------ |
| `server` | The boss. Plans, creates the branch, writes the code, delegates.   |
| `test`   | Writes and fixes unit tests until coverage reaches the thresholds. |
| `commit` | Splits changes into conventional commits and pushes the branch.    |

Rules for every agent:

1. **Plan before acting.** Propose a short plan: the affected modules, layers and files (and migrations, branch or commits when relevant). Wait for the user's "yes" before changing anything.
2. **Delegated work skips approval.** When the task message starts with `[server]`, `server` already got the user's approval: don't ask, just do it.
3. All agents follow every rule in this file.
