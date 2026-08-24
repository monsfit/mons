#!/usr/bin/env bash
set -Eeuo pipefail

readonly secret_root=/etc/regolith/postgres
bootstrap_tls=false

if [[ ${1:-} == "--bootstrap-tls" ]]; then
  bootstrap_tls=true
fi

if [[ ${EUID} -ne 0 ]]; then
  exec sudo --preserve-env=CLOUDFLARE_API_TOKEN,CLOUDFLARE_ZONE_ID "$0" "$@"
fi

if [[ ${bootstrap_tls} == false ]]; then
  : "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN is required}"
  : "${CLOUDFLARE_ZONE_ID:?CLOUDFLARE_ZONE_ID is required}"
fi

issue_certificate() {
  local environment=$1
  local hostname=$2
  local target="${secret_root}/${environment}"

  install -d -m 0700 "${target}/tls"
  if [[ ! -s "${target}/admin-password" ]]; then
    openssl rand -base64 48 | tr -d '\n' > "${target}/admin-password"
  fi
  if [[ ! -s "${target}/app-password" ]]; then
    openssl rand -base64 48 | tr -d '\n' > "${target}/app-password"
  fi
  if [[ ! -s "${target}/migration-password" ]]; then
    openssl rand -base64 48 | tr -d '\n' > "${target}/migration-password"
  fi
  chmod 0600 "${target}/admin-password" "${target}/app-password" "${target}/migration-password"

  if [[ -s "${target}/tls/origin-ca" && -s "${target}/tls/server.key" && -s "${target}/tls/server.crt" ]]; then
    echo "${environment}: existing TLS material retained"
    return
  fi

  openssl ecparam -name prime256v1 -genkey -noout -out "${target}/tls/server.key"
  openssl req -new -sha256 \
    -key "${target}/tls/server.key" \
    -subj "/CN=${hostname}" \
    -addext "subjectAltName=DNS:${hostname}" \
    -out "${target}/tls/server.csr"

  if [[ ${bootstrap_tls} == true ]]; then
    openssl x509 -req -sha256 -days 30 \
      -in "${target}/tls/server.csr" \
      -signkey "${target}/tls/server.key" \
      -copy_extensions copy \
      -out "${target}/tls/server.crt"
    rm -f "${target}/tls/server.csr" "${target}/tls/origin-ca"
    chmod 0600 "${target}/tls/server.key"
    chmod 0644 "${target}/tls/server.crt"
    echo "${environment}: generated local bootstrap TLS for ${hostname}"
    return
  fi

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
  touch "${target}/tls/origin-ca"
  chmod 0600 "${target}/tls/server.key"
  chmod 0644 "${target}/tls/server.crt"
  echo "${environment}: generated credentials and Origin CA certificate for ${hostname}"
}

issue_certificate dev postgres-dev.internal.mons.fit
issue_certificate prod postgres-prod.internal.mons.fit
