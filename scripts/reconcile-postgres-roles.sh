#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ${EUID} -ne 0 ]]; then
  exec sudo "$0" "$@"
fi

for environment in dev prod; do
  app_user="regolith_${environment}_app"
  migration_user="regolith_${environment}_migration"
  database="regolith_${environment}"
  admin_user="regolith_${environment}_admin"
  container="regolith-postgres-${environment}-1"
  app_password=$(< "/etc/regolith/postgres/${environment}/app-password")
  migration_password=$(< "/etc/regolith/postgres/${environment}/migration-password")

  docker exec -i "${container}" psql \
    --username "${admin_user}" \
    --dbname "${database}" \
    --set=ON_ERROR_STOP=1 \
    --set=app_user="${app_user}" \
    --set=app_password="${app_password}" \
    --set=migration_user="${migration_user}" \
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
