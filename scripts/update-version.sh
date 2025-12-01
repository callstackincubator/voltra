#!/usr/bin/env bash
set -euo pipefail

TAG=$(git describe --tags --exact-match HEAD 2>/dev/null || true)

if [[ "$TAG" =~ ^alpha_v([0-9]+\.[0-9]+\.[0-9]+)\(([0-9]+)\)$ ]]; then
  NEW_VERSION="${BASH_REMATCH[1]}-alpha${BASH_REMATCH[2]}"
elif [[ "$TAG" =~ ^v([0-9]+\.[0-9]+\.[0-9]+)$ ]]; then
  NEW_VERSION="${BASH_REMATCH[1]}"
fi

if [[ -n "${NEW_VERSION:-}" ]]; then
  jq --arg v "$NEW_VERSION" '.version = $v' package.json > package.json.tmp \
    && mv package.json.tmp package.json
fi
