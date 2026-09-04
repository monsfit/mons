#!/usr/bin/env bash
set -euo pipefail

repository_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
database_url=${DATABASE_URL:-postgresql://mons:mons_local@localhost:5432/mons}
migration_database_url=${MIGRATION_DATABASE_URL:-$database_url}
runtime_user=${MONS_DATABASE_RUNTIME_USER:-mons}

if [[ ${1:-} == -- ]]; then
  shift
fi

cd "$repository_root"
docker compose -f infra/local/compose.yaml up -d --wait

MIGRATION_DATABASE_URL="$migration_database_url" \
MONS_APP_SCHEMA=mons_app \
MONS_DATABASE_RUNTIME_USER="$runtime_user" \
pnpm db:migrate

CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_Database="$database_url" \
pnpm exec wrangler dev "$@"
