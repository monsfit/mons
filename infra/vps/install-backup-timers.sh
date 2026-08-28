#!/usr/bin/env bash
set -Eeuo pipefail

readonly script_directory=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

if [[ ${EUID} -ne 0 ]]; then
  exec sudo "$0" "$@"
fi

install -d -m 0755 /var/lib/mons-monitoring/textfile
for unit in "${script_directory}"/systemd/*.service "${script_directory}"/systemd/*.timer; do
  install -m 0644 "${unit}" /etc/systemd/system/
done
systemctl daemon-reload
systemctl enable --now \
  mons-pgbackrest-full.timer \
  mons-pgbackrest-diff.timer \
  mons-postgres-operations-check.timer

echo "Installed and activated pgBackRest and operations-check timers"
