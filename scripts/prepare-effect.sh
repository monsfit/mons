#!/usr/bin/env sh

set -eu

repo_dir=".repos/effect"
repo_url="https://github.com/Effect-TS/effect"
repo_ref="effect@4.0.0-beta.103"
repo_commit="dff25449dfc927f2cce912c329f343cfb5365f88"

if [ -d "$repo_dir/.git" ]; then
  actual_commit="$(git -C "$repo_dir" rev-parse HEAD)"
  if [ "$actual_commit" != "$repo_commit" ]; then
    echo "Effect source is at $actual_commit; expected $repo_commit ($repo_ref)." >&2
    echo "Remove $repo_dir and rerun prepare to restore the pinned reference." >&2
    exit 1
  fi
  exit 0
fi

mkdir -p ".repos"
git clone --depth 1 --branch "$repo_ref" "$repo_url" "$repo_dir"

actual_commit="$(git -C "$repo_dir" rev-parse HEAD)"
if [ "$actual_commit" != "$repo_commit" ]; then
  echo "Effect source resolved to $actual_commit; expected $repo_commit." >&2
  exit 1
fi
