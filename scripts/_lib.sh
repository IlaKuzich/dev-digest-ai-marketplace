#!/usr/bin/env bash
# Shared helpers for scripts/release.sh and scripts/rollback.sh.
set -euo pipefail

MARKETPLACE_FILE=".claude-plugin/marketplace.json"

require_jq() {
  command -v jq >/dev/null 2>&1 || { echo "Error: jq is required (https://jqlang.github.io/jq/)." >&2; exit 1; }
}

require_clean_tree() {
  if [[ -n "$(git status --porcelain)" ]]; then
    echo "Error: working tree is not clean. Commit or stash changes before running this script." >&2
    exit 1
  fi
}

is_semver() {
  [[ "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]
}

bump_semver() {
  local version=$1 part=$2 major minor patch
  IFS='.' read -r major minor patch <<< "$version"
  case "$part" in
    major) echo "$((major + 1)).0.0" ;;
    minor) echo "${major}.$((minor + 1)).0" ;;
    patch) echo "${major}.${minor}.$((patch + 1))" ;;
    *) echo "$part" ;;
  esac
}

plugin_dir() { echo "plugins/$1"; }
plugin_manifest() { echo "$(plugin_dir "$1")/.claude-plugin/plugin.json"; }
tag_name() { echo "$1-v$2"; }

marketplace_entry_exists() {
  local name=$1
  [[ "$(jq --arg n "$name" '[.plugins[] | select(.name == $n)] | length' "$MARKETPLACE_FILE")" != "0" ]]
}

marketplace_entry_has_version() {
  local name=$1
  [[ "$(jq --arg n "$name" '(.plugins[] | select(.name == $n) | has("version"))' "$MARKETPLACE_FILE")" == "true" ]]
}

set_marketplace_entry_version() {
  local name=$1 version=$2 tmp
  tmp=$(mktemp)
  jq --arg n "$name" --arg v "$version" \
    '(.plugins[] | select(.name == $n) | .version) = $v' \
    "$MARKETPLACE_FILE" > "$tmp" && mv "$tmp" "$MARKETPLACE_FILE"
}
