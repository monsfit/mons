#!/usr/bin/env bash
set -euo pipefail

environment=${1:?Missing Mons API environment}
output_file=${2:?Missing output plist path}
repository_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

case "$environment" in
  live)
    if [[ -n "${SST_STAGE:-}" ]]; then
      stage=$SST_STAGE
    elif [[ -f "$repository_root/.sst/stage" ]]; then
      stage=$(tr -d '[:space:]' < "$repository_root/.sst/stage")
    else
      echo "Run sst dev once, or set SST_STAGE, before building Mons Live." >&2
      exit 1
    fi
    api_url=$(node "$repository_root/scripts/deployment-identity.ts" --stage "$stage" --format url)
    ;;
  preview)
    api_url=$(node "$repository_root/scripts/deployment-identity.ts" --environment preview --format url)
    ;;
  dev)
    api_url=https://api.dev.mons.fit
    ;;
  production)
    api_url=https://api.mons.fit
    ;;
  *)
    echo "Unknown Mons API environment: $environment" >&2
    exit 1
    ;;
esac

mkdir -p "$(dirname "$output_file")"
plutil -create xml1 "$output_file"
plutil -insert MONS_API_BASE_URL -string "$api_url" "$output_file"
plutil -insert MONS_API_ENVIRONMENT -string "$environment" "$output_file"
echo "Mons $environment -> $api_url"
