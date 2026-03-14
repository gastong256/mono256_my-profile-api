# Northflank + Neon Deployment Guide (Free Tier)

This guide covers a minimal and safe deployment flow for this API using:

- Northflank free tier (service + job)
- Neon free tier (managed PostgreSQL)

## 1) Platform constraints (important)

Free tiers are suitable for hobby or early validation environments, not strict high-availability production.

- Northflank free tier has resource and workload limits.
- Neon free tier can scale to zero, which may introduce cold starts.

Design your expectations accordingly (especially startup latency and burst behavior).

## 2) Neon setup

Create a Neon project and get two connection strings:

1. Pooled connection string (`-pooler` host) for app runtime.
2. Direct connection string (non-pooler host) for Prisma migrations.

Use TLS in both URLs:

- `sslmode=require`
- `connect_timeout=15` (recommended)

Example:

```env
DATABASE_URL=postgresql://...@ep-xxx-pooler.<region>.aws.neon.tech/<db>?sslmode=require&connect_timeout=15
DIRECT_URL=postgresql://...@ep-xxx.<region>.aws.neon.tech/<db>?sslmode=require&connect_timeout=15
```

## 3) Northflank workloads

Use up to three workloads from this repository:

1. API service (long-running)
2. Migrate-seed job (run per release)
3. Optional contact-delivery retry job (manual or scheduled)

Free tier note: if your workspace is capped at two jobs, keep these two and do not create a standalone seed job.

### API service configuration

- Build type: Dockerfile
- Dockerfile path: `./Dockerfile`
- Build context: repo root
- Docker target: `runtime`
- Public port: `4000`

Health checks:

- Liveness path: `/health`
- Readiness path: `/ready`

### Migrate-seed job configuration

- Build type: Dockerfile
- Dockerfile path: `./Dockerfile`
- Build context: repo root
- Docker target: `migrate-seed`
- Command: use image default command

This job always runs `prisma migrate deploy`.
It only runs seed when `RUN_SEED_AFTER_MIGRATE=true`.

### Contact delivery retry job (optional)

- Build type: Dockerfile
- Dockerfile path: `./Dockerfile`
- Build context: repo root
- Docker target: `runtime`
- Command: `node dist/scripts/retry-contact-deliveries.js`

Use this as a manual or scheduled job to retry failed/pending Discord deliveries.

## 4) Runtime environment variables (API service)

Set these variables in a Northflank secret group and attach it to the API service:

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=4000
APP_BASE_URL=https://api.your-domain.com
LOG_LEVEL=info

DATABASE_URL=postgresql://...pooler...sslmode=require&connect_timeout=15
DIRECT_URL=postgresql://...direct...sslmode=require&connect_timeout=15

CORS_ORIGIN=https://your-frontend.com,https://www.your-frontend.com
JWT_SECRET=<at-least-32-characters-random-secret>
JWT_EXPIRES_IN=1d

SWAGGER_ENABLED=false
RATE_LIMIT_ENABLED=true
TRUST_PROXY=true
CONTACT_MIN_INTERVAL_SECONDS=10
CONTACT_MAX_BY_IP_PER_HOUR=30
CONTACT_MAX_BY_EMAIL_PER_HOUR=8
CONTACT_DUPLICATE_WINDOW_MINUTES=60
CONTACT_FINGERPRINT_SALT=<at-least-16-characters-random-salt>
CONTACT_REQUIRE_TURNSTILE=true
TURNSTILE_SECRET_KEY=<cloudflare-turnstile-secret>
TURNSTILE_VERIFY_URL=https://challenges.cloudflare.com/turnstile/v0/siteverify
CONTACT_NOTIFICATION_ENABLED=true
DISCORD_WEBHOOK_URL=<discord-webhook-url>
DISCORD_WEBHOOK_TIMEOUT_MS=5000
CONTACT_DELIVERY_MAX_ATTEMPTS=5
CONTACT_DELIVERY_BATCH_SIZE=50

AUTH_RATE_LIMIT_MAX=5
AUTH_RATE_LIMIT_WINDOW=1 minute
CONTACT_RATE_LIMIT_MAX=10
CONTACT_RATE_LIMIT_WINDOW=1 minute

BOOTSTRAP_ADMIN_ENABLED=false
BOOTSTRAP_ADMIN_EMAIL=
BOOTSTRAP_ADMIN_NAME=Admin User
BOOTSTRAP_ADMIN_PASSWORD=
BOOTSTRAP_ADMIN_UPDATE_EXISTING=false
RUN_SEED_AFTER_MIGRATE=false
ALLOW_PROD_SEED=false
```

## 5) Runtime environment variables (migrate-seed and retry jobs)

Attach the same secret group or an equivalent one to the jobs:

- `DATABASE_URL`
- `DIRECT_URL`
- `RUN_SEED_AFTER_MIGRATE` (default `false` for production)
- `ALLOW_PROD_SEED` (required as `true` only when you intentionally seed in production)

`DIRECT_URL` is required for stable Prisma migrations with pooled database providers.

For file-based secrets, this app supports `<KEY>_FILE` for:

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `CONTACT_FINGERPRINT_SALT`
- `TURNSTILE_SECRET_KEY`
- `DISCORD_WEBHOOK_URL`
- `BOOTSTRAP_ADMIN_PASSWORD`

## 6) Release flow

Recommended release order:

1. Build new image revision.
2. Run migration job (`pnpm prisma:migrate:deploy`).
3. If migration succeeds, deploy API revision.
4. Verify health checks and functional endpoints.
5. Run semantic release to publish tag and GitHub release (automated by workflow).

The repository also provides:

- `Semantic PR Title` workflow (Conventional Commit title gate)
- `Release` workflow (automatic after CI on `main`, and manual dispatch support)
- `Release Images and Deploy` workflow:
  - triggered by published GitHub releases
  - pushes immutable GHCR images (`vX.Y.Z`, `sha-<commit>`)
  - updates Northflank migrate-seed job and API service image references
  - optionally updates retry job image when `NORTHFLANK_RETRY_JOB_ID` is configured
  - runs migrate-seed job before API deploy

Rollback approach:

1. Roll API revision back in Northflank.
2. For schema rollback, use a new forward migration instead of manual down migrations.

## 7) Post-deploy smoke checks

Run after each deploy:

1. `GET /health` returns 200.
2. `GET /ready` returns 200.
3. `POST /contact` returns 200 for valid payload.
4. `POST /auth/login` returns token for seeded/local user in non-production only.
5. `GET /auth/me` works with bearer token.
6. `GET /admin/contact-submissions` returns 200 with bearer token.

## 8) Security notes

- Keep `SWAGGER_ENABLED=false` in production.
- Use only explicit trusted origins in `CORS_ORIGIN`.
- Rotate `JWT_SECRET` when credentials leak or team membership changes.
- For contact forms, keep `CONTACT_REQUIRE_TURNSTILE=true` in public production deployments.
- Keep contact form protected by frontend controls (hidden honeypot field + client validation).
- Keep `CONTACT_NOTIFICATION_ENABLED=true` only when `DISCORD_WEBHOOK_URL` is configured.
- Schedule periodic delivery retries if Discord notifications are operationally required.
- Keep `RUN_SEED_AFTER_MIGRATE=false` for normal production releases.
- Keep `BOOTSTRAP_ADMIN_ENABLED=false` by default and enable it only for controlled bootstrap operations.

## 9) GitHub to Northflank deployment wiring

Add GitHub repository variables:

- `NORTHFLANK_PROJECT_ID`
- `NORTHFLANK_SERVICE_ID`
- `NORTHFLANK_MIGRATE_JOB_ID`
- `NORTHFLANK_RETRY_JOB_ID` (optional)
- `NORTHFLANK_REGISTRY_CREDENTIALS_ID`

Add GitHub repository secret:

- `NORTHFLANK_API_KEY`
- `SEMANTIC_RELEASE_PAT` (recommended for release event chaining)

How to obtain values:

1. `NORTHFLANK_API_KEY`: Northflank team settings -> API access (roles + tokens) -> create token.
2. `NORTHFLANK_PROJECT_ID`: from the project settings/details page.
3. `NORTHFLANK_SERVICE_ID`: from your API service details page.
4. `NORTHFLANK_MIGRATE_JOB_ID`: from your migrate job details page.
5. `NORTHFLANK_RETRY_JOB_ID`: from your retry job details page (optional).
6. `NORTHFLANK_REGISTRY_CREDENTIALS_ID`: create saved registry credentials in Northflank for GHCR, then copy its ID.
7. `SEMANTIC_RELEASE_PAT`: GitHub -> Settings -> Developer settings -> Personal access tokens -> create token with repository workflow/release permissions.

GHCR notes:

- The workflow publishes to:
  - `ghcr.io/<owner>/<repo>-runtime`
  - `ghcr.io/<owner>/<repo>-migrate-seed`
  - `ghcr.io/<owner>/<repo>-retry`
- If you want public images, set package visibility to public in GitHub Packages settings.
- `Release Images and Deploy` also supports manual `workflow_dispatch` with a `release_tag` input for fallback runs.
