#!/usr/bin/env bash
set -Eeuo pipefail

readonly script_directory=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
readonly repository_directory=$(cd "${script_directory}/../.." && pwd)
readonly compose=(docker compose --file "${script_directory}/compose.yaml")
readonly secret_root=/etc/mons/postgres

if [[ ${EUID} -ne 0 ]]; then
  exec sudo --preserve-env=CLOUDFLARE_API_TOKEN,CLOUDFLARE_DEFAULT_ACCOUNT_ID,R2_BACKUP_ACCESS_KEY_ID,R2_BACKUP_SECRET_ACCESS_KEY "$0" "$@"
fi

provision_postgres() {
  local environment=$1
  local hostname=$2
  local target="${secret_root}/${environment}"

  install -d -m 0700 "${target}/tls"
  for role in admin app migration; do
    if [[ ! -s "${target}/${role}-password" ]]; then
      openssl rand -base64 48 | tr -d '\n' > "${target}/${role}-password"
    fi
    chmod 0600 "${target}/${role}-password"
  done

  rm -f "${target}/tls/origin-ca"
  if [[ -s "${target}/tls/server.key" && -s "${target}/tls/server.crt" ]]; then
    echo "${environment}: existing TLS key and certificate retained"
    return
  fi

  : "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN is required to issue a missing TLS certificate}"

  openssl ecparam -name prime256v1 -genkey -noout -out "${target}/tls/server.key"
  openssl req -new -sha256 \
    -key "${target}/tls/server.key" \
    -subj "/CN=${hostname}" \
    -addext "subjectAltName=DNS:${hostname}" \
    -out "${target}/tls/server.csr"

  local csr payload response
  csr=$(awk 'NF {sub(/\r/, ""); printf "%s\n",$0;}' "${target}/tls/server.csr")
  payload=$(jq -n \
    --arg csr "${csr}" \
    --arg hostname "${hostname}" \
    '{csr:$csr,hostnames:[$hostname],request_type:"origin-ecc",requested_validity:5475}')
  response=$(curl --fail-with-body --silent --show-error \
    https://api.cloudflare.com/client/v4/certificates \
    --header "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    --header 'Content-Type: application/json' \
    --data "${payload}")
  if [[ $(jq -r '.success' <<< "${response}") != true ]]; then
    jq -r '.errors[]? | .message' <<< "${response}" >&2
    return 1
  fi
  jq -r '.result.certificate' <<< "${response}" > "${target}/tls/server.crt"

  rm -f "${target}/tls/server.csr"
  chmod 0600 "${target}/tls/server.key"
  chmod 0644 "${target}/tls/server.crt"
  echo "${environment}: provisioned PostgreSQL credentials and TLS certificate"
}

provision_postgres dev postgres-dev.internal.mons.fit
provision_postgres prod postgres-prod.internal.mons.fit

install -d -m 0700 /etc/mons/pgbackrest
backup_config=$(mktemp)
trap 'rm -f "${backup_config}"' EXIT
if [[ -n ${CLOUDFLARE_DEFAULT_ACCOUNT_ID:-} && -n ${R2_BACKUP_ACCESS_KEY_ID:-} && -n ${R2_BACKUP_SECRET_ACCESS_KEY:-} ]]; then
  sed \
    -e "s|@ACCOUNT_ID@|${CLOUDFLARE_DEFAULT_ACCOUNT_ID}|g" \
    -e "s|@ACCESS_KEY_ID@|${R2_BACKUP_ACCESS_KEY_ID}|g" \
    -e "s|@SECRET_ACCESS_KEY@|${R2_BACKUP_SECRET_ACCESS_KEY}|g" \
    "${script_directory}/pgbackrest.conf.template" > "${backup_config}"
elif [[ -s /etc/mons/pgbackrest/pgbackrest.conf ]]; then
  sed \
    -e 's|regolith-prod|mons-prod|g' \
    -e 's|regolith_prod_admin|mons_prod_admin|g' \
    /etc/mons/pgbackrest/pgbackrest.conf > "${backup_config}"
  echo 'Existing pgBackRest credentials retained'
else
  echo 'R2 backup credentials are required when no existing pgBackRest configuration is available' >&2
  exit 1
fi
install -m 0600 "${backup_config}" /etc/mons/pgbackrest/pgbackrest.conf

cd "${repository_directory}"
"${compose[@]}" up -d --wait postgres-dev postgres-prod

# Publish only through the tailnet. The backing ports remain bound to localhost,
# so neither PostgreSQL environment is reachable from the public network or LAN.
tailscale serve --bg --tcp=5433 tcp://127.0.0.1:5433
tailscale serve --bg --tcp=5434 tcp://127.0.0.1:5434

# The PostgreSQL entrypoint copies pgBackRest configuration into the data volume at container
# startup. Refresh that copy on every provisioning run so rotated R2 credentials take effect
# without requiring a database restart.
"${compose[@]}" exec -T --user root postgres-prod \
  install -m 0600 -o postgres -g postgres \
  /run/mons-pgbackrest/pgbackrest.conf \
  /var/lib/postgresql/pgbackrest/pgbackrest.conf

for environment in dev prod; do
  app_password=$(< "${secret_root}/${environment}/app-password")
  migration_password=$(< "${secret_root}/${environment}/migration-password")
  "${compose[@]}" exec -T --user postgres "postgres-${environment}" psql \
    --username "mons_${environment}_admin" \
    --dbname "mons_${environment}" \
    --set=ON_ERROR_STOP=1 \
    --set=app_user="mons_${environment}_app" \
    --set=app_password="${app_password}" \
    --set=migration_user="mons_${environment}_migration" \
    --set=migration_password="${migration_password}" <<'SQL'
SELECT format('ALTER ROLE %I LOGIN PASSWORD %L', :'app_user', :'app_password') \gexec
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'migration_user', :'migration_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'migration_user') \gexec
SELECT format('ALTER ROLE %I LOGIN PASSWORD %L', :'migration_user', :'migration_password') \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), :'app_user') \gexec
SELECT format('REVOKE CREATE ON DATABASE %I FROM %I', current_database(), :'app_user') \gexec
SELECT format('GRANT CONNECT, CREATE ON DATABASE %I TO %I', current_database(), :'migration_user') \gexec
SQL
done

"${compose[@]}" exec -T --user postgres postgres-prod \
  pgbackrest --config=/var/lib/postgresql/pgbackrest/pgbackrest.conf \
  --stanza=mons-prod stanza-create

echo "Provisioned PostgreSQL, role credentials, TLS, and pgBackRest"
