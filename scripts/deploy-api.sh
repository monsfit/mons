#!/usr/bin/env bash
set -euo pipefail

environment=${1:?Missing Wrangler environment}
shift

case "$environment" in
  dev | production)
    wrangler_arguments=(deploy --env "$environment")
    ;;
  *)
    echo "Unknown Wrangler environment: $environment" >&2
    exit 1
    ;;
esac

: "${CLERK_SECRET_KEY:?CLERK_SECRET_KEY is required for a Worker deployment}"

secrets_file=
cleanup() {
  if [[ -n "$secrets_file" ]]; then
    rm -f "$secrets_file"
  fi
}
trap cleanup EXIT

secrets_file=$(mktemp)
chmod 600 "$secrets_file"
WORKER_SECRETS_FILE="$secrets_file" node --input-type=module -e \
  'import { writeFileSync } from "node:fs"; writeFileSync(process.env.WORKER_SECRETS_FILE, JSON.stringify({ CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY }))'
wrangler_arguments+=(--secrets-file "$secrets_file")

pnpm exec wrangler "${wrangler_arguments[@]}" "$@"
