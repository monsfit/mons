#!/usr/bin/env bash
set -Eeuo pipefail

readonly secret_root=/etc/regolith/monitoring

if [[ ${EUID} -ne 0 ]]; then
  exec sudo "$0" "$@"
fi

install -d -m 0700 "${secret_root}"
if [[ ! -s "${secret_root}/grafana-admin-password" ]]; then
  openssl rand -base64 48 | tr -d '\n' > "${secret_root}/grafana-admin-password"
fi

# Grafana runs as UID 472 in the official container image.
chown root:472 "${secret_root}/grafana-admin-password"
chmod 0640 "${secret_root}/grafana-admin-password"

echo "Grafana administrator password provisioned at ${secret_root}/grafana-admin-password"
