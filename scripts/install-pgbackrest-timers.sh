#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ${EUID} -ne 0 ]]; then
  exec sudo "$0" "$@"
fi

install -m 0644 infra/systemd/regolith-pgbackrest-full.service /etc/systemd/system/
install -m 0644 infra/systemd/regolith-pgbackrest-full.timer /etc/systemd/system/
install -m 0644 infra/systemd/regolith-pgbackrest-diff.service /etc/systemd/system/
install -m 0644 infra/systemd/regolith-pgbackrest-diff.timer /etc/systemd/system/
install -m 0644 infra/systemd/regolith-postgres-operations-check.service /etc/systemd/system/
install -m 0644 infra/systemd/regolith-postgres-operations-check.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now \
  regolith-pgbackrest-full.timer \
  regolith-pgbackrest-diff.timer \
  regolith-postgres-operations-check.timer
echo "Installed and activated pgBackRest and operations-check timers"
