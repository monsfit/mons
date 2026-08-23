#!/usr/bin/env bash
set -Eeuo pipefail

readonly project_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
readonly volume_name=regolith_pgbackrest_restore_drill
readonly container_name=regolith-pgbackrest-restore-drill
readonly image_name=regolith-postgres-prod
readonly config_path=/etc/regolith/pgbackrest/pgbackrest.conf

cleanup() {
  docker rm --force "${container_name}" >/dev/null 2>&1 || true
  docker volume rm "${volume_name}" >/dev/null 2>&1 || true
}

if [[ ${EUID} -ne 0 ]]; then
  exec sudo "$0" "$@"
fi

trap cleanup EXIT
cleanup

cd "${project_dir}"
docker compose up -d postgres-prod

restore_point="regolith-drill-$(date -u +%Y%m%d%H%M%S)"
docker exec -i regolith-postgres-prod-1 \
  psql -U regolith_prod_admin -d regolith_prod -v ON_ERROR_STOP=1 -qAt \
  --set=restore_point="${restore_point}" <<'SQL' >/dev/null
DROP SCHEMA IF EXISTS regolith_restore_drill CASCADE;
CREATE SCHEMA regolith_restore_drill;
CREATE TABLE regolith_restore_drill.marker (value text PRIMARY KEY);
INSERT INTO regolith_restore_drill.marker VALUES ('pitr-ok');
SELECT pg_create_restore_point(:'restore_point');
SQL
target_time=$(docker exec regolith-postgres-prod-1 \
  psql -U regolith_prod_admin -d regolith_prod -Atc "SELECT clock_timestamp()")

docker exec regolith-postgres-prod-1 \
  psql -U regolith_prod_admin -d regolith_prod -v ON_ERROR_STOP=1 -Atc \
  "SELECT pg_switch_wal()" >/dev/null

for _ in $(seq 1 60); do
  last_archived=$(docker exec regolith-postgres-prod-1 \
    psql -U regolith_prod_admin -d regolith_prod -Atc \
    "SELECT last_archived_time >= '${target_time}'::timestamptz FROM pg_stat_archiver")
  [[ ${last_archived} == t ]] && break
  sleep 1
done
[[ ${last_archived:-f} == t ]] || { echo "WAL did not archive before timeout" >&2; exit 1; }

docker exec regolith-postgres-prod-1 \
  psql -U regolith_prod_admin -d regolith_prod -v ON_ERROR_STOP=1 -c \
  "DROP SCHEMA regolith_restore_drill CASCADE" >/dev/null

docker volume create "${volume_name}" >/dev/null
docker run --rm --user 0 \
  --volume "${volume_name}:/var/lib/postgresql" \
  "${image_name}" \
  sh -c 'install -d -m 0700 -o postgres -g postgres /var/lib/postgresql/18/docker /var/lib/postgresql/pgbackrest'
docker run --rm --user 0 \
  --volume "${volume_name}:/var/lib/postgresql" \
  --volume "${config_path}:/source/pgbackrest.conf:ro" \
  "${image_name}" \
  sh -c 'install -m 0600 -o postgres -g postgres /source/pgbackrest.conf /var/lib/postgresql/pgbackrest/pgbackrest.conf'

docker run --rm --user postgres \
  --network regolith_backup-egress \
  --volume "${volume_name}:/var/lib/postgresql" \
  --entrypoint pgbackrest \
  "${image_name}" \
  --config=/var/lib/postgresql/pgbackrest/pgbackrest.conf \
  --stanza=regolith-prod \
  --pg1-path=/var/lib/postgresql/18/docker \
  --type=name \
  --target="${restore_point}" \
  --target-action=promote \
  restore

docker run -d --name "${container_name}" \
  --network regolith_backup-egress \
  --volume "${volume_name}:/var/lib/postgresql" \
  --entrypoint /usr/local/bin/docker-entrypoint.sh \
  "${image_name}" postgres >/dev/null

for _ in $(seq 1 60); do
  ready=$(docker exec "${container_name}" \
    psql -U regolith_prod_admin -d regolith_prod -Atc \
    "SELECT NOT pg_is_in_recovery()" 2>/dev/null || true)
  [[ ${ready} == t ]] && break
  sleep 1
done
[[ ${ready:-} == t ]] || { docker logs "${container_name}" >&2; exit 1; }

result=$(docker exec "${container_name}" \
  psql -U regolith_prod_admin -d regolith_prod -v ON_ERROR_STOP=1 -Atc \
  "SELECT current_database(), current_user, value FROM regolith_restore_drill.marker")
[[ ${result} == "regolith_prod|regolith_prod_admin|pitr-ok" ]] || {
  echo "Unexpected restore result: ${result}" >&2
  exit 1
}

echo "Point-in-time restore drill passed at restore point ${restore_point}"
