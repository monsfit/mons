#!/usr/bin/env bash
set -Eeuo pipefail

readonly secret_root=/etc/mons/monitoring
readonly script_directory=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
readonly postgres_compose=(docker compose --file "${script_directory}/../compose.yaml")

if [[ ${EUID} -ne 0 ]]; then
  exec sudo "$0" "$@"
fi

install -d -m 0700 "${secret_root}"
install -d -m 0755 /var/lib/mons-monitoring/textfile
if [[ ! -s "${secret_root}/grafana-admin-password" ]]; then
  openssl rand -base64 48 | tr -d '\n' > "${secret_root}/grafana-admin-password"
fi

# Grafana runs as UID 472 in the official container image.
chown root:472 "${secret_root}/grafana-admin-password"
chmod 0640 "${secret_root}/grafana-admin-password"

for environment in dev prod; do
  password_file="${secret_root}/postgres-${environment}-password"
  if [[ ! -s "${password_file}" ]]; then
    openssl rand -base64 48 | tr -d '\n' > "${password_file}"
  fi
  # postgres_exporter runs as UID/GID 65534 in the official image.
  chown root:65534 "${password_file}"
  chmod 0640 "${password_file}"

  password=$(< "${password_file}")
  "${postgres_compose[@]}" exec -T --user postgres "postgres-${environment}" psql \
    --username "mons_${environment}_admin" \
    --dbname "mons_${environment}" \
    --set=ON_ERROR_STOP=1 \
    --set=monitoring_user="mons_${environment}_monitoring" \
    --set=monitoring_password="${password}" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'monitoring_user', :'monitoring_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'monitoring_user') \gexec
SELECT format('ALTER ROLE %I LOGIN PASSWORD %L', :'monitoring_user', :'monitoring_password') \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), :'monitoring_user') \gexec
SELECT format('GRANT pg_monitor TO %I', :'monitoring_user') \gexec
SQL

  for database in postgres "mons_${environment}"; do
    "${postgres_compose[@]}" exec -T --user postgres "postgres-${environment}" psql \
      --username "mons_${environment}_admin" \
      --dbname "${database}" \
      --set=ON_ERROR_STOP=1 \
      --command 'CREATE EXTENSION IF NOT EXISTS pg_stat_statements'
  done
done

# Grafana remains localhost-only and is published privately through the VPS's
# stable Tailscale MagicDNS name.
tailscale serve --bg --tcp=3000 tcp://127.0.0.1:3000

echo "Grafana and PostgreSQL monitoring credentials provisioned under ${secret_root}"
