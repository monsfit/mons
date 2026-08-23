#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "${1:-}" == "postgres" ]]; then
  install -d -m 0700 -o postgres -g postgres /var/lib/postgresql/secrets
  install -m 0600 -o postgres -g postgres /run/regolith-secrets/admin-password /var/lib/postgresql/secrets/admin-password
  install -m 0600 -o postgres -g postgres /run/regolith-secrets/app-password /var/lib/postgresql/secrets/app-password
  install -m 0600 -o postgres -g postgres /run/regolith-secrets/migration-password /var/lib/postgresql/secrets/migration-password
  export POSTGRES_PASSWORD_FILE=/var/lib/postgresql/secrets/admin-password

  install -d -m 0700 -o postgres -g postgres /var/lib/postgresql/tls
  install -m 0600 -o postgres -g postgres /run/regolith-tls/server.key /var/lib/postgresql/tls/server.key
  install -m 0644 -o postgres -g postgres /run/regolith-tls/server.crt /var/lib/postgresql/tls/server.crt

  if [[ -f /run/regolith-pgbackrest/pgbackrest.conf ]]; then
    install -d -m 0700 -o postgres -g postgres /var/lib/postgresql/pgbackrest
    install -m 0600 -o postgres -g postgres \
      /run/regolith-pgbackrest/pgbackrest.conf \
      /var/lib/postgresql/pgbackrest/pgbackrest.conf
    set -- "$@" \
      -c archive_mode=on \
      -c "archive_command=pgbackrest --config=/var/lib/postgresql/pgbackrest/pgbackrest.conf --stanza=regolith-prod archive-push %p"
  fi

  set -- "$@" \
    -c ssl=on \
    -c ssl_cert_file=/var/lib/postgresql/tls/server.crt \
    -c ssl_key_file=/var/lib/postgresql/tls/server.key \
    -c ssl_min_protocol_version=TLSv1.2 \
    -c password_encryption=scram-sha-256
fi

exec /usr/local/bin/docker-entrypoint.sh "$@"
