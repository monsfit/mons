#!/usr/bin/env bash
set -Eeuo pipefail

readonly script_directory=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
readonly compose=(docker compose --file "${script_directory}/compose.yaml")
readonly metrics_directory=/var/lib/mons-monitoring/textfile
readonly metrics_file="${metrics_directory}/postgres-operations.prom"

if [[ ${EUID} -ne 0 ]]; then
  exec sudo "$0" "$@"
fi

install -d -m 0755 "${metrics_directory}"
metrics_tmp=$(mktemp "${metrics_directory}/postgres-operations.prom.XXXXXX")
trap 'rm -f "${metrics_tmp}"' EXIT

repository_up=0
latest_backup=0
latest_full_backup=0
wal_last_archived=0
wal_last_failed=0
check_success=0

publish_metrics() {
  cat > "${metrics_tmp}" <<EOF
# HELP mons_backup_repository_up Whether the pgBackRest repository is reachable and healthy.
# TYPE mons_backup_repository_up gauge
mons_backup_repository_up ${repository_up}
# HELP mons_backup_last_success_timestamp_seconds Unix timestamp of the latest completed backup.
# TYPE mons_backup_last_success_timestamp_seconds gauge
mons_backup_last_success_timestamp_seconds ${latest_backup}
# HELP mons_backup_last_full_timestamp_seconds Unix timestamp of the latest completed full backup.
# TYPE mons_backup_last_full_timestamp_seconds gauge
mons_backup_last_full_timestamp_seconds ${latest_full_backup}
# HELP mons_postgres_wal_last_archived_timestamp_seconds Unix timestamp of the most recently archived WAL file.
# TYPE mons_postgres_wal_last_archived_timestamp_seconds gauge
mons_postgres_wal_last_archived_timestamp_seconds ${wal_last_archived}
# HELP mons_postgres_wal_last_failed_timestamp_seconds Unix timestamp of the most recent failed WAL archive attempt.
# TYPE mons_postgres_wal_last_failed_timestamp_seconds gauge
mons_postgres_wal_last_failed_timestamp_seconds ${wal_last_failed}
# HELP mons_postgres_operations_check_success Whether the latest operations check passed.
# TYPE mons_postgres_operations_check_success gauge
mons_postgres_operations_check_success ${check_success}
EOF
  chmod 0644 "${metrics_tmp}"
  mv -f "${metrics_tmp}" "${metrics_file}"
}

fail() {
  publish_metrics
  echo "$1" >&2
  exit 1
}

for service in postgres-dev postgres-prod; do
  state=$("${compose[@]}" ps --format json "${service}" | jq -r '.State // empty')
  [[ ${state} == running ]] || fail "${service} is not running (state=${state:-missing})"
  health=$("${compose[@]}" ps --format json "${service}" | jq -r '.Health // empty')
  [[ ${health} == healthy ]] || fail "${service} is not healthy (health=${health:-missing})"
done

read -r wal_last_archived wal_last_failed < <(
  "${compose[@]}" exec -T --user postgres postgres-prod \
    psql --quiet --tuples-only --no-align --field-separator=' ' \
    --username regolith_prod_admin --dbname regolith_prod \
    --command "SELECT coalesce(extract(epoch FROM last_archived_time)::bigint, 0), coalesce(extract(epoch FROM last_failed_time)::bigint, 0) FROM pg_stat_archiver"
)

backup_info=$(
  "${compose[@]}" exec -T --user postgres postgres-prod \
    pgbackrest --config=/var/lib/postgresql/pgbackrest/pgbackrest.conf \
    --stanza=regolith-prod --output=json info
) || fail "Unable to read the pgBackRest repository"

backup_status=$(jq -r '.[0].status.code' <<< "${backup_info}")
current_database_id=$(jq -r '[.[0].db[].id] | max' <<< "${backup_info}")
latest_backup=$(jq -r --argjson database_id "${current_database_id}" \
  '[.[0].backup[] | select(.database.id == $database_id) | .timestamp.stop] | max // 0' \
  <<< "${backup_info}")
latest_full_backup=$(jq -r --argjson database_id "${current_database_id}" \
  '[.[0].backup[] | select(.database.id == $database_id and .type == "full") | .timestamp.stop] | max // 0' \
  <<< "${backup_info}")
[[ ${backup_status} == 0 ]] || fail "pgBackRest repository status is not healthy (code=${backup_status})"
repository_up=1

now=$(date +%s)
(( latest_backup > 0 )) || fail "No completed production backup exists"
(( now - latest_backup <= 129600 )) || fail "Latest production backup is older than 36 hours"
(( wal_last_archived > 0 )) || fail "No WAL file has been archived"
(( wal_last_failed <= wal_last_archived )) || fail "The latest WAL archive attempt failed"

"${compose[@]}" exec -T --user postgres postgres-prod \
  pgbackrest --config=/var/lib/postgresql/pgbackrest/pgbackrest.conf \
  --stanza=regolith-prod check >/dev/null || fail "pgBackRest consistency check failed"

check_success=1
publish_metrics
echo "PostgreSQL operations check passed"
