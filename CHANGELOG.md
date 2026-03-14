## [1.2.0](https://github.com/gastong256/mono256_my-profile-api/compare/v1.1.4...v1.2.0) (2026-03-14)

### Features

* merge migrate+seed job with guardrails and add dedicated retry-delivery GHCR image/job; extend admin and contact feature ([adddf65](https://github.com/gastong256/mono256_my-profile-api/commit/adddf65ed7b192b635d6edf6a26eee05c0d5beed))

## [1.1.4](https://github.com/gastong256/mono256_my-profile-api/compare/v1.1.3...v1.1.4) (2026-03-13)

### Bug Fixes

* update Northflank migrate job image via API instead of service action ([cf4abde](https://github.com/gastong256/mono256_my-profile-api/commit/cf4abde855bf39b8f6fa06ed6503c5bf14bddad7))

## [1.1.3](https://github.com/gastong256/mono256_my-profile-api/compare/v1.1.2...v1.1.3) (2026-03-13)

### Bug Fixes

* trigger release pipeline ([b3aafb9](https://github.com/gastong256/mono256_my-profile-api/commit/b3aafb9b4ba0d295aeda1817d958667b779bc5d8))

## [1.1.2](https://github.com/gastong256/mono256_my-profile-api/compare/v1.1.1...v1.1.2) (2026-03-13)

### Bug Fixes

* use semantic-release PAT with safe fallback and manual release-tag dispatch for images/deploy ([afb8aa9](https://github.com/gastong256/mono256_my-profile-api/commit/afb8aa9c23eb82302d9b33cee30c227bef29310e))

## [1.1.1](https://github.com/gastong256/mono256_my-profile-api/compare/v1.1.0...v1.1.1) (2026-03-13)

### Bug Fixes

* avoid secrets in job-level if and gate Northflank deploy with preflight checks ([3993e09](https://github.com/gastong256/mono256_my-profile-api/commit/3993e097fac8d34397d904754b786b217dea6525))

## [1.1.0](https://github.com/gastong256/mono256_my-profile-api/compare/v1.0.0...v1.1.0) (2026-03-13)

### Features

* publish immutable GHCR images on releases and prepare automated Northflank deploy wiring ([914b52a](https://github.com/gastong256/mono256_my-profile-api/commit/914b52a714c57ab6841527a8e2798bcf8b950ab3))

## 1.0.0 (2026-03-13)

### Features

* add compose stack with migrate+seed, fix CORS localhost handling, and ensure Prisma client generation for seed ([7e1b822](https://github.com/gastong256/mono256_my-profile-api/commit/7e1b822604eb72a529a3dd8c2c9707bd9f67db56))
* add multi-stage containerization with compose stack, migration service, runtime hardening, and docs updates ([a205b37](https://github.com/gastong256/mono256_my-profile-api/commit/a205b37b1ace11e84cc2ffa972f3e22797de0c8a))
* harden contact anti-spam, add semantic release pipeline, and optimize docker/bootstrap runtime ([79d2bae](https://github.com/gastong256/mono256_my-profile-api/commit/79d2bae8f6efe554271023660a0b022e7664a766))
* harden prod config, add readiness+rate limiting, improve errors/logging, persist DB flows, expand tests/docs ([6cbbcbd](https://github.com/gastong256/mono256_my-profile-api/commit/6cbbcbd68ac6c453ff7c64ad0cd3fb37636cddaf))

### Bug Fixes

* remove duplicate pnpm version config and rely on packageManager ([500732b](https://github.com/gastong256/mono256_my-profile-api/commit/500732bff61cdb7e2780bd4bf2be99b85d9d8461))

# Changelog

All notable changes to this project will be documented in this file.
