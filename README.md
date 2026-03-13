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

Included platform concerns:

- Fastify app factory
- Zod-based validation
- Prisma + PostgreSQL persistence
- JWT authentication
- Seeded development login user
- Helmet + route-level rate limiting
- Swagger UI + OpenAPI document
- Pino logging
- CI pipeline
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
        contact.route.ts
        contact.schema.ts
        contact.service.ts
      auth/
        auth.route.ts
        auth.schema.ts
        auth.service.ts
        auth.types.ts
    shared/
      schemas/
      types/
      utils/
    server.ts
  tests/
    helpers/
      test-config.ts
    integration/
      auth.route.test.ts
      contact.route.test.ts
    smoke/
      health.test.ts
    unit/
      contact.service.test.ts
```

## 5) Local Setup

### Requirements

- Node.js 20+
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

## 6) Environment Variables

`.env.example` includes:

- `NODE_ENV`
- `PORT`
- `HOST`
- `LOG_LEVEL`
- `APP_BASE_URL`
- `DATABASE_URL`
- `CORS_ORIGIN`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `SWAGGER_ENABLED`
- `RATE_LIMIT_ENABLED`
- `AUTH_RATE_LIMIT_MAX`
- `AUTH_RATE_LIMIT_WINDOW`
- `CONTACT_RATE_LIMIT_MAX`
- `CONTACT_RATE_LIMIT_WINDOW`
- `SEED_USER_EMAIL`
- `SEED_USER_NAME`
- `SEED_USER_PASSWORD`

## 7) Available Scripts

- `pnpm dev` - start local server with watch mode
- `pnpm build` - compile TypeScript into `dist`
- `pnpm start` - run compiled app
- `pnpm lint` - run ESLint
- `pnpm typecheck` - run TypeScript checks without emit
- `pnpm test` - run test suite
- `pnpm prisma:generate` - generate Prisma client
- `pnpm prisma:migrate:dev` - run development migrations
- `pnpm prisma:migrate:deploy` - apply committed migrations in deploy environments
- `pnpm prisma:seed` - seed a local auth user

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
  "message": "Hello"
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
- JWT payload contains minimal user identity (`sub`, `email`, `name`).
- Passwords are stored as hashes (`bcryptjs`) and verified at login.
- Auth and contact endpoints are rate-limited.

## 10) Swagger / OpenAPI

- OpenAPI JSON: `GET /openapi.json`
- Swagger UI: `GET /docs`
- Both are available only when `SWAGGER_ENABLED=true` (default in development).

## 11) Production Notes

- Set a strong `JWT_SECRET` (minimum 32 characters) in production.
- Set explicit trusted production `CORS_ORIGIN` values (no `*` and no localhost origins).
- Keep `SWAGGER_ENABLED=false` in production.
- Run migrations during deploy with:
  - `pnpm prisma:migrate:deploy`

## 12) Future Growth Path

This baseline is ready to evolve without major rewrites:

- Add new domain modules under `src/modules`
- Add advanced auth features (refresh tokens, OAuth) within `auth`
- Add background jobs/queues later as isolated plugins/modules
- Introduce external integrations without changing core app composition

## License

[MIT](./LICENSE)
