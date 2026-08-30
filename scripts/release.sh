#!/usr/bin/env bash
# Bump a plugin's (or the marketplace's own) version, validate, changelog, commit, and tag.
# See RELEASE.md for the full process.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
source "$(dirname "$0")/_lib.sh"

usage() {
  cat <<EOF
Usage: $(basename "$0") <plugin-name|marketplace> <patch|minor|major|X.Y.Z> [-m "changelog note"]

Examples:
  $(basename "$0") example-plugin patch -m "Fix hello command output"
  $(basename "$0") example-plugin 2.0.0 -m "Breaking: renamed command"
  $(basename "$0") marketplace minor -m "Add category field to catalog"
EOF
  exit 1
}

[[ $# -lt 2 ]] && usage
TARGET=$1
BUMP=$2
shift 2
NOTE=""
while getopts ":m:" opt; do
  case $opt in
    m) NOTE="$OPTARG" ;;
    *) usage ;;
  esac
done

require_jq
require_clean_tree

if [[ "$TARGET" == "marketplace" ]]; then
  MANIFEST="$MARKETPLACE_FILE"
else
  MANIFEST=$(plugin_manifest "$TARGET")
  [[ -f "$MANIFEST" ]] || { echo "Error: no plugin.json for '$TARGET' at $MANIFEST" >&2; exit 1; }
  marketplace_entry_exists "$TARGET" || echo "Warning: '$TARGET' is not listed in $MARKETPLACE_FILE." >&2
fi

CURRENT=$(jq -r '.version' "$MANIFEST")
[[ "$CURRENT" == "null" || -z "$CURRENT" ]] && { echo "Error: $MANIFEST has no 'version' field." >&2; exit 1; }

if is_semver "$BUMP"; then
  NEW_VERSION="$BUMP"
elif [[ "$BUMP" =~ ^(major|minor|patch)$ ]]; then
  NEW_VERSION=$(bump_semver "$CURRENT" "$BUMP")
else
  echo "Error: bump must be 'patch', 'minor', 'major', or an explicit X.Y.Z version." >&2
  exit 1
fi

TAG=$(tag_name "$TARGET" "$NEW_VERSION")
git rev-parse "$TAG" >/dev/null 2>&1 && { echo "Error: tag $TAG already exists. Versions must never be reused." >&2; exit 1; }

echo "Releasing $TARGET: $CURRENT -> $NEW_VERSION"

TMP=$(mktemp)
jq --arg v "$NEW_VERSION" '.version = $v' "$MANIFEST" > "$TMP" && mv "$TMP" "$MANIFEST"

if [[ "$TARGET" != "marketplace" ]] && marketplace_entry_exists "$TARGET" && marketplace_entry_has_version "$TARGET"; then
  set_marketplace_entry_version "$TARGET" "$NEW_VERSION"
fi

echo "Validating..."
if ! claude plugin validate .; then
  echo "Validation failed — reverting changes." >&2
  git checkout -- "$MANIFEST" "$MARKETPLACE_FILE" 2>/dev/null || true
  exit 1
fi

{
  echo ""
  echo "## $TAG"
  echo "${NOTE:-No release notes provided.}"
} >> CHANGELOG.md

git add "$MANIFEST" "$MARKETPLACE_FILE" CHANGELOG.md
git commit -m "Release $TAG${NOTE:+: $NOTE}" >/dev/null
git tag "$TAG"

cat <<EOF

Done. Created commit and tag '$TAG' locally.
  Review:  git show $TAG
  Publish: git push origin main --tags
EOF
