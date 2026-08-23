#!/usr/bin/env bash
set -Eeuo pipefail

cd /home/ubuntu/projects/regolith

for service in postgres-dev postgres-prod cloudflared; do
  state="$(docker compose ps --format json "${service}" | jq -r '.State // empty')"
  if [[ "${state}" != running ]]; then
    echo "${service} is not running (state=${state:-missing})" >&2
    exit 1
  fi
done

for service in postgres-dev postgres-prod; do
  health="$(docker compose ps --format json "${service}" | jq -r '.Health // empty')"
  if [[ "${health}" != healthy ]]; then
    echo "${service} is not healthy (health=${health:-missing})" >&2
    exit 1
  fi
done

archive_failures="$(
  docker compose exec -T --user postgres postgres-prod \
    psql --quiet --tuples-only --no-align \
    --username regolith_prod_admin --dbname regolith_prod \
    --command 'SELECT failed_count FROM pg_stat_archiver'
)"
if (( archive_failures > 0 )); then
  echo "PostgreSQL reports ${archive_failures} failed WAL archive attempts" >&2
  exit 1
fi

backup_info="$(
  docker compose exec -T --user postgres postgres-prod \
    pgbackrest --config=/var/lib/postgresql/pgbackrest/pgbackrest.conf \
    --stanza=regolith-prod --output=json info
)"
backup_status="$(jq -r '.[0].status.code' <<<"${backup_info}")"
latest_backup="$(jq -r '[.[0].backup[].timestamp.stop] | max // 0' <<<"${backup_info}")"
backup_age_seconds="$(( $(date +%s) - latest_backup ))"

if [[ "${backup_status}" != 0 ]]; then
  echo "pgBackRest repository status is not healthy (code=${backup_status})" >&2
  exit 1
fi
if (( latest_backup == 0 || backup_age_seconds > 129600 )); then
  echo "Latest production backup is older than 36 hours" >&2
  exit 1
fi

docker compose exec -T --user postgres postgres-prod \
  pgbackrest --config=/var/lib/postgresql/pgbackrest/pgbackrest.conf \
  --stanza=regolith-prod check >/dev/null

echo "PostgreSQL operations check passed"
