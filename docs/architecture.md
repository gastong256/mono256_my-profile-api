# Architecture Notes

## Why this shape

This API uses a modular monolith with clear boundaries and low ceremony:

- `src/app`: application composition (app factory, plugin registration, route registration)
- `src/plugins`: technical concerns (CORS, JWT, Prisma, Swagger, sensible)
- `src/modules`: domain-oriented modules (`health`, `contact`, `auth`) with route/schema/service separation
- `src/config`: environment loading and validation
- `src/lib`: infrastructure helpers (logger, Prisma singleton)
- `src/shared`: reusable schemas/types/utils

This keeps each concern isolated and easy to extend without introducing distributed-system complexity.

## Growth strategy

The codebase is intentionally minimal today but can grow cleanly:

- Add modules under `src/modules/*` and register in `register-routes.ts`
- Add cross-cutting infra in `src/plugins/*`
- Keep schemas with modules to preserve cohesion
- Move complex business logic into services while keeping routes thin

## Runtime behavior

- Fastify app factory enables deterministic creation for tests and future composition.
- Config is validated once at startup.
- Runtime is proxy-aware through `TRUST_PROXY`, so request IP-based policies behave correctly behind ingress.
- Logger is environment-aware and uses structured logs in production.
- Swagger/OpenAPI is generated from route schemas.
- Prisma provides PostgreSQL persistence for `User` authentication and `ContactSubmission` storage.
- Contact submissions are protected with layered anti-spam controls (rate limiting, honeypot, duplicate and velocity checks, optional Turnstile verification).
- Bootstrap admin user creation can run on startup through explicit environment toggles, which is useful in managed deploy flows.
- `GET /health` is liveness; `GET /ready` checks runtime readiness with database ping.
- Helmet and route-level rate limiting provide baseline API hardening without heavy infrastructure.
- Docker uses a multi-stage image and a compose workflow with separate migration execution before API startup.
