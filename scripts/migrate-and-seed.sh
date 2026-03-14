#!/bin/sh
set -eu

echo "[ops] Running Prisma migrate deploy"
pnpm prisma:migrate:deploy

run_seed="${RUN_SEED_AFTER_MIGRATE:-false}"

if [ "$run_seed" != "true" ]; then
  echo "[ops] RUN_SEED_AFTER_MIGRATE is false, skipping seed"
  exit 0
fi

node_env="${NODE_ENV:-development}"
allow_prod_seed="${ALLOW_PROD_SEED:-false}"

if [ "$node_env" = "production" ] && [ "$allow_prod_seed" != "true" ]; then
  echo "[ops] Refusing to seed in production without ALLOW_PROD_SEED=true"
  exit 1
fi

echo "[ops] Running Prisma seed"
pnpm prisma:seed
