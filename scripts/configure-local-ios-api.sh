#!/bin/zsh

set -euo pipefail

script_directory=${0:A:h}
repository_directory=${script_directory:h}
configuration_file="$repository_directory/apps/mons/Configuration/Local.xcconfig"
api_port=${API_PORT:-3000}
api_host=${1:-}

if [[ -z "$api_host" ]]; then
  api_host=$(scutil --get LocalHostName 2>/dev/null || true)
  if [[ -n "$api_host" ]]; then
    api_host="$api_host.local"
  else
    api_host=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)
  fi
fi

if [[ -z "$api_host" || ! "$api_host" =~ '^[A-Za-z0-9._-]+$' ]]; then
  print -u2 "Could not determine a safe local hostname. Pass one explicitly."
  exit 1
fi

if [[ ! "$api_port" =~ '^[0-9]+$' || "$api_port" -lt 1 || "$api_port" -gt 65535 ]]; then
  print -u2 "API_PORT must be an integer between 1 and 65535."
  exit 1
fi

temporary_file=$(mktemp "$configuration_file.XXXXXX")
trap 'rm -f "$temporary_file"' EXIT
printf 'REGOLITH_API_BASE_URL = http:/$()/%s:%s\n' "$api_host" "$api_port" > "$temporary_file"
mv "$temporary_file" "$configuration_file"
trap - EXIT

print "Mons local API: http://$api_host:$api_port"
