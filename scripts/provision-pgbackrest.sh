#!/usr/bin/env bash
set -Eeuo pipefail

: "${CLOUDFLARE_DEFAULT_ACCOUNT_ID:?CLOUDFLARE_DEFAULT_ACCOUNT_ID is required}"
: "${R2_BACKUP_ACCESS_KEY_ID:?R2_BACKUP_ACCESS_KEY_ID is required}"
: "${R2_BACKUP_SECRET_ACCESS_KEY:?R2_BACKUP_SECRET_ACCESS_KEY is required}"

if [[ ${EUID} -ne 0 ]]; then
  exec sudo --preserve-env=CLOUDFLARE_DEFAULT_ACCOUNT_ID,R2_BACKUP_ACCESS_KEY_ID,R2_BACKUP_SECRET_ACCESS_KEY "$0" "$@"
fi

install -d -m 0700 /etc/regolith/pgbackrest
config_tmp=$(mktemp)
trap 'rm -f "${config_tmp}"' EXIT

sed \
  -e "s|@ACCOUNT_ID@|${CLOUDFLARE_DEFAULT_ACCOUNT_ID}|g" \
  -e "s|@ACCESS_KEY_ID@|${R2_BACKUP_ACCESS_KEY_ID}|g" \
  -e "s|@SECRET_ACCESS_KEY@|${R2_BACKUP_SECRET_ACCESS_KEY}|g" \
  infra/pgbackrest/pgbackrest.conf.template > "${config_tmp}"

install -m 0600 "${config_tmp}" /etc/regolith/pgbackrest/pgbackrest.conf
echo "Installed production pgBackRest configuration"
