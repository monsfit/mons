#!/usr/bin/env bash
set -Eeuo pipefail

app_password="$(< /var/lib/postgresql/secrets/app-password)"
migration_password="$(< /var/lib/postgresql/secrets/migration-password)"

psql --set=ON_ERROR_STOP=1 \
  --set=app_user="${REGOLITH_APP_DATABASE_USER}" \
  --set=app_password="${app_password}" \
  --set=migration_user="${REGOLITH_MIGRATION_DATABASE_USER}" \
  --set=migration_password="${migration_password}" \
  --username "${POSTGRES_USER}" \
  --dbname "${POSTGRES_DB}" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'app_user', :'app_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'app_user') \gexec
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'migration_user', :'migration_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'migration_user') \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), :'app_user') \gexec
SELECT format('GRANT CONNECT, CREATE ON DATABASE %I TO %I', current_database(), :'migration_user') \gexec
SQL

# The image's initdb generates generic host records. Require TLS for every TCP
# connection while retaining local Unix-socket access for container operations.
sed -i -E 's/^host([[:space:]]+)/hostssl\1/' "${PGDATA}/pg_hba.conf"

