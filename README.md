# mono256_my-profile-api

Production-ready backend API foundation for `mono256_my-profile`.

## 1) Project Purpose

This repository provides a serious backend baseline for the profile platform with clean architecture, strong defaults, and a minimal scope that is already database-backed.

## 2) Current Scope

Implemented modules and endpoints:

- `GET /health`
- `GET /ready`
- `POST /contact`
- `POST /auth/login`
- `GET /auth/me` (JWT protected)
- `GET /admin/contact-submissions` (JWT protected)
- `GET /admin/contact-submissions/:id` (JWT protected)
- `PATCH /admin/contact-submissions/:id` (JWT protected)

Included platform concerns:

- Fastify app factory
- Zod-based validation
- Prisma + PostgreSQL persistence
- JWT authentication
- Seeded development login user
- Helmet + route-level rate limiting
- Proxy-aware runtime support (`TRUST_PROXY`) for managed ingress
- Contact anti-spam hardening (honeypot, velocity controls, duplicate detection, optional Turnstile)
- Contact delivery state tracking with Discord webhook notifications
- Retry command for pending/failed contact deliveries
- Startup admin bootstrap controls for managed deployments
- Swagger UI + OpenAPI document
- Pino logging
- CI pipeline with Docker build validation
- Automated semantic release + git tag + GitHub release
- Smoke test

## 3) Architecture Overview

Pattern: **modular monolith**.

- App composition is isolated in `src/app`.
- Technical plugins are isolated in `src/plugins`.
- Domain modules are isolated in `src/modules`.
- Environment parsing is isolated in `src/config`.
- Reusable internals live in `src/shared`.

See [architecture notes](./docs/architecture.md) for additional context.

## TypeScript Usage

- The codebase is TypeScript-first across app, modules, plugins, tests, and Prisma seed.
- Runtime code lives under `src/` and compiles to `dist/` for production execution.
- Validation and route contracts are defined with Zod and used directly in Fastify routes.

## 4) Folder Structure

```text
mono256_my-profile-api/
  .github/workflows/ci.yml
  .github/workflows/release.yml
  .github/workflows/release-images-deploy.yml
  .github/workflows/semantic-pr.yml
  .releaserc.json
  CHANGELOG.md
  Dockerfile
  docker-compose.yml
  prisma.config.ts
  docs/
    architecture.md
    deploy-northflank-neon.md
  prisma/
    migrations/
      20260312153800_init/
        migration.sql
      migration_lock.toml
    schema.prisma
    seed.ts
  src/
    app/
      build-app.ts
      register-plugins.ts
      register-routes.ts
    config/
      env.ts
    lib/
      logger.ts
      prisma.ts
    plugins/
      cors.ts
      bootstrap-admin.ts
      helmet.ts
      sensible.ts
      rate-limit.ts
      prisma.ts
      jwt.ts
      swagger.ts
    modules/
      health/
        health.route.ts
        health.schema.ts
        health.service.ts
      contact/
        contact.anti-spam.ts
        contact.delivery.ts
        contact.route.ts
        contact.schema.ts
        contact.service.ts
      auth/
        auth.route.ts
        auth.schema.ts
        auth.service.ts
        auth.types.ts
      admin/
        admin.route.ts
        admin.schema.ts
        admin.service.ts
    scripts/
      retry-contact-deliveries.ts
    shared/
      schemas/
      types/
      utils/
    server.ts
  tests/
    helpers/
      test-config.ts
    integration/
      admin.route.test.ts
      auth.route.test.ts
      contact.route.test.ts
    smoke/
      health.test.ts
    unit/
      contact.delivery.test.ts
      contact.service.test.ts
      env.test.ts
```

## 5) Local Setup

### Requirements

- Node.js 22.14+
- pnpm 10+
- PostgreSQL 14+

### Steps

1. Copy env file:
   - `cp .env.example .env`
2. Install dependencies:
   - `pnpm install`
3. Generate Prisma client:
   - `pnpm prisma:generate`
4. Run database migrations:
   - `pnpm prisma:migrate:dev`
5. Seed a local user for login:
   - `pnpm prisma:seed`
6. Start development server:
   - `pnpm dev`

### Default local credentials

- Email: `admin@gastong256.dev`
- Password: `ChangeMe123!`

## Docker Setup

This repository includes a production-oriented container setup:

- Multi-stage `Dockerfile` (`build`, `migrate-seed`, `seed`, `runtime`, `retry`)
- `docker-compose.yml` with:
  - `postgres` (PostgreSQL)
  - `migrate` (one-shot `prisma migrate deploy`)
  - `seed` (one-shot `prisma:seed` for local bootstrap user)
  - `api` (compiled runtime image, local Docker defaults)

### Run with Docker Compose

```bash
docker compose up --build
```

API will be available at `http://localhost:4000`.

Note: Compose runs the API with `NODE_ENV=development` for local usability (`localhost` CORS and Swagger UI).  
For production containers, set environment variables explicitly (`NODE_ENV=production`, trusted `CORS_ORIGIN`, strong `JWT_SECRET`, `SWAGGER_ENABLED=false`).

## Northflank + Neon (Free Tier)

This project is ready to deploy with:

- Northflank service (`runtime` image target)
- Northflank migration job (`migrate` image target)
- Neon managed PostgreSQL

Deployment runbook: [docs/deploy-northflank-neon.md](./docs/deploy-northflank-neon.md)

### Stop and remove containers

```bash
docker compose down
```

### Remove containers and database volume

```bash
docker compose down -v
```

## 6) Environment Variables

`.env.example` includes:

- `NODE_ENV`
- `PORT`
- `HOST`
- `LOG_LEVEL`
- `APP_BASE_URL`
- `DATABASE_URL`
- `DIRECT_URL`
- `CORS_ORIGIN`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `SWAGGER_ENABLED`
- `RATE_LIMIT_ENABLED`
- `TRUST_PROXY`
- `CONTACT_MIN_INTERVAL_SECONDS`
- `CONTACT_MAX_BY_IP_PER_HOUR`
- `CONTACT_MAX_BY_EMAIL_PER_HOUR`
- `CONTACT_DUPLICATE_WINDOW_MINUTES`
- `CONTACT_FINGERPRINT_SALT`
- `CONTACT_REQUIRE_TURNSTILE`
- `TURNSTILE_SECRET_KEY`
- `TURNSTILE_VERIFY_URL`
- `CONTACT_NOTIFICATION_ENABLED`
- `DISCORD_WEBHOOK_URL`
- `DISCORD_WEBHOOK_TIMEOUT_MS`
- `CONTACT_DELIVERY_MAX_ATTEMPTS`
- `CONTACT_DELIVERY_BATCH_SIZE`
- `AUTH_RATE_LIMIT_MAX`
- `AUTH_RATE_LIMIT_WINDOW`
- `CONTACT_RATE_LIMIT_MAX`
- `CONTACT_RATE_LIMIT_WINDOW`
- `BOOTSTRAP_ADMIN_ENABLED`
- `BOOTSTRAP_ADMIN_EMAIL`
- `BOOTSTRAP_ADMIN_NAME`
- `BOOTSTRAP_ADMIN_PASSWORD`
- `BOOTSTRAP_ADMIN_UPDATE_EXISTING`
- `SEED_USER_EMAIL`
- `SEED_USER_NAME`
- `SEED_USER_PASSWORD`
- `RUN_SEED_AFTER_MIGRATE`
- `ALLOW_PROD_SEED`

Sensitive variables also support `<KEY>_FILE` variants for secret-file based deployments.

## 7) Available Scripts

- `pnpm dev` - start local server with watch mode
- `pnpm build` - compile TypeScript into `dist`
- `pnpm start` - run compiled app
- `pnpm lint` - run ESLint
- `pnpm typecheck` - run TypeScript checks without emit
- `pnpm test` - run test suite
- `pnpm release` - run semantic release (CI usage)
- `pnpm release:dry-run` - preview semantic release outcome
- `pnpm prisma:generate` - generate Prisma client
- `pnpm prisma:migrate:dev` - run development migrations
- `pnpm prisma:migrate:deploy` - apply committed migrations in deploy environments
- `pnpm prisma:seed` - seed a local auth user
- `pnpm contact:retry-delivery` - retry pending/failed contact deliveries
- `pnpm contact:retry-delivery:compiled` - retry deliveries from compiled `dist` build

## 8) Implemented Endpoints

### `GET /health`

Response:

```json
{
  "status": "ok",
  "service": "mono256_my-profile-api"
}
```

### `GET /ready`

Returns application readiness (including database availability).

`200` response:

```json
{
  "status": "ok",
  "service": "mono256_my-profile-api",
  "dependencies": {
    "database": "up"
  }
}
```

`503` response:

```json
{
  "status": "degraded",
  "service": "mono256_my-profile-api",
  "dependencies": {
    "database": "down"
  }
}
```

### `POST /contact`

Body:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "message": "Hello",
  "website": "",
  "captchaToken": "<optional-turnstile-token>"
}
```

Response:

```json
{
  "success": true,
  "message": "Contact request received"
}
```

Behavior:

- validates input with Zod
- persists a `ContactSubmission` record in PostgreSQL via Prisma
- accepts an optional honeypot field (`website`) that should stay empty
- enforces velocity limits and duplicate suppression on the server side
- supports optional Turnstile verification when enabled
- tracks delivery state (`PENDING`, `SENT`, `FAILED`, `SKIPPED`) for Discord notifications
- dispatches delivery to Discord asynchronously to keep request latency low

### `GET /admin/contact-submissions`

Header:

- `Authorization: Bearer <token>`

Query params:

- `page` (default `1`)
- `pageSize` (default `20`, max `100`)
- `reviewStatus` (`NEW`, `IN_REVIEW`, `RESOLVED`, `SPAM`) optional
- `deliveryStatus` (`PENDING`, `SENT`, `FAILED`, `SKIPPED`) optional

### `GET /admin/contact-submissions/:id`

Header:

- `Authorization: Bearer <token>`

Returns full stored contact submission details.

### `PATCH /admin/contact-submissions/:id`

Header:

- `Authorization: Bearer <token>`

Body:

```json
{
  "reviewStatus": "RESOLVED"
}
```

Updates review workflow state for a submission.

### `POST /auth/login`

Body:

```json
{
  "email": "admin@gastong256.dev",
  "password": "ChangeMe123!"
}
```

Response:

```json
{
  "accessToken": "<jwt>",
  "tokenType": "Bearer",
  "expiresIn": "1d",
  "user": {
    "id": "uuid",
    "email": "admin@gastong256.dev",
    "name": "Admin User"
  }
}
```

### `GET /auth/me`

Header:

- `Authorization: Bearer <token>`

Response:

```json
{
  "user": {
    "id": "uuid",
    "email": "admin@gastong256.dev",
    "name": "Admin User"
  }
}
```

## 9) Auth Overview

- Auth is JWT-based using `@fastify/jwt`.
- Login validates credentials against the `User` table.
- Protected routes use `fastify.authenticate` pre-handler.
- Admin routes currently reuse the same JWT guard (no role model yet).
- JWT payload contains minimal user identity (`sub`, `email`, `name`).
- Passwords are stored as hashes (`bcryptjs`) and verified at login.
- Auth and contact endpoints are rate-limited.

## 10) Swagger / OpenAPI

- OpenAPI JSON: `GET /openapi.json`
- Swagger UI: `GET /docs`
- Both are available only when `SWAGGER_ENABLED=true` (default in development).

## 11) Release Automation

- `semantic-release` runs automatically after successful `CI` pushes to `main`.
- It creates:
  - semver git tag (`vX.Y.Z`)
  - GitHub Release notes
  - changelog updates in `CHANGELOG.md`
- A manual `Release` workflow dispatch is also available for controlled reruns.
- On every published GitHub Release, `release-images-deploy.yml`:
  - builds immutable GHCR images for `runtime`, `migrate-seed`, and `retry`
  - pushes `vX.Y.Z` and `sha-<commit>` tags
  - updates the Northflank migrate-seed job image and optionally retry job image
  - executes the migrate-seed job run and waits for completion before API deploy

Commit and PR messages should follow Conventional Commits for predictable releases.

### GitHub Configuration for Auto Deploy

Repository Variables (`Settings > Secrets and variables > Actions > Variables`):

- `NORTHFLANK_PROJECT_ID`
- `NORTHFLANK_SERVICE_ID`
- `NORTHFLANK_MIGRATE_JOB_ID`
- `NORTHFLANK_RETRY_JOB_ID` (optional)
- `NORTHFLANK_REGISTRY_CREDENTIALS_ID`

Repository Secrets (`Settings > Secrets and variables > Actions > Secrets`):

- `NORTHFLANK_API_KEY`
- `SEMANTIC_RELEASE_PAT` (recommended): GitHub PAT used by `Release` workflow so `release.published` events trigger downstream workflows

Workflow permissions (`Settings > Actions > General`):

- Read and write permissions
- Allow GitHub Actions to create and approve pull requests (recommended for release automation)

GHCR visibility:

- Keep images under `ghcr.io/<owner>/<repo>-runtime`, `-migrate-seed`, `-retry`
- Set package visibility to public in the GHCR package settings if you want public pulls

Fallback:

- If no PAT is configured, `Release` falls back to `GITHUB_TOKEN`.
- In that mode, if GitHub does not emit downstream release events, run `Release Images and Deploy` manually with `release_tag` input.

## 12) Production Notes

- Set a strong `JWT_SECRET` (minimum 32 characters) in production.
- Set explicit trusted production `CORS_ORIGIN` values (no `*` and no localhost origins).
- Keep `SWAGGER_ENABLED=false` in production.
- Set `TRUST_PROXY=true` when running behind managed ingress/load balancers.
- With Neon, use pooled `DATABASE_URL` for runtime and direct `DIRECT_URL` for Prisma migrations.
- Set strong `CONTACT_FINGERPRINT_SALT` and enable Turnstile in public deployments.
- Set `DISCORD_WEBHOOK_URL` and `CONTACT_NOTIFICATION_ENABLED=true` to enable delivery notifications.
- Schedule `contact:retry-delivery:compiled` as an operational job if webhook delivery can fail transiently.
- Keep `RUN_SEED_AFTER_MIGRATE=false` by default in production migrate jobs.
- Keep `BOOTSTRAP_ADMIN_ENABLED=false` by default; enable only for controlled bootstrap events.
- This app supports `<KEY>_FILE` secret variants for sensitive keys in container orchestrators.
- Run migrations during deploy with:
  - `pnpm prisma:migrate:deploy`

## 13) Future Growth Path

This baseline is ready to evolve without major rewrites:

- Add new domain modules under `src/modules`
- Add advanced auth features (refresh tokens, OAuth) within `auth`
- Add background jobs/queues later as isolated plugins/modules
- Introduce external integrations without changing core app composition

## License

[MIT](./LICENSE)
