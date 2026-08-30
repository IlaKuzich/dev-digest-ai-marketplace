#!/usr/bin/env bash
# Restore a plugin's content from a previous release tag and republish it as a NEW,
# forward version. Never reuses or rewrites a previously published version/tag.
# See RELEASE.md for the full process.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
source "$(dirname "$0")/_lib.sh"

usage() {
  cat <<EOF
Usage: $(basename "$0") <plugin-name> <target-version> [-m "reason"]

Restores plugin content from git tag <plugin-name>-v<target-version> and
republishes it as a new patch release (content = old, version = new).

Example:
  $(basename "$0") example-plugin 1.2.0 -m "v1.3.0 broke the hello command"
EOF
  exit 1
}

[[ $# -lt 2 ]] && usage
TARGET=$1
TARGET_VERSION=$2
shift 2
REASON=""
while getopts ":m:" opt; do
  case $opt in
    m) REASON="$OPTARG" ;;
    *) usage ;;
  esac
done

require_jq
require_clean_tree

SRC_TAG=$(tag_name "$TARGET" "$TARGET_VERSION")
if ! git rev-parse "$SRC_TAG" >/dev/null 2>&1; then
  echo "Error: tag $SRC_TAG not found. Available releases for '$TARGET':" >&2
  git tag -l "${TARGET}-v*" >&2
  exit 1
fi

PLUGIN_DIR=$(plugin_dir "$TARGET")
MANIFEST=$(plugin_manifest "$TARGET")
[[ -f "$MANIFEST" ]] || { echo "Error: '$TARGET' is not a current plugin (missing $MANIFEST)." >&2; exit 1; }

CURRENT=$(jq -r '.version' "$MANIFEST")
NEW_VERSION=$(bump_semver "$CURRENT" patch)
NEW_TAG=$(tag_name "$TARGET" "$NEW_VERSION")

echo "Rolling back '$TARGET': restoring content from $SRC_TAG (v$TARGET_VERSION), publishing as $NEW_VERSION"

# Replace the whole plugin directory with its exact state at SRC_TAG, so files
# added after that release (and not present in it) are removed, not just left behind.
git rm -rq --ignore-unmatch "$PLUGIN_DIR" >/dev/null
git checkout "$SRC_TAG" -- "$PLUGIN_DIR"

TMP=$(mktemp)
jq --arg v "$NEW_VERSION" '.version = $v' "$MANIFEST" > "$TMP" && mv "$TMP" "$MANIFEST"

if marketplace_entry_exists "$TARGET" && marketplace_entry_has_version "$TARGET"; then
  set_marketplace_entry_version "$TARGET" "$NEW_VERSION"
fi

echo "Validating..."
if ! claude plugin validate .; then
  echo "Validation failed — reverting all changes." >&2
  git reset --hard HEAD >/dev/null
  exit 1
fi

{
  echo ""
  echo "## $NEW_TAG (rollback)"
  echo "Restored '$TARGET' to its $SRC_TAG (v$TARGET_VERSION) content. ${REASON:-No reason provided.}"
} >> CHANGELOG.md

git add "$PLUGIN_DIR" "$MARKETPLACE_FILE" CHANGELOG.md
git commit -m "Rollback $TARGET to v$TARGET_VERSION content (released as $NEW_TAG)${REASON:+: $REASON}" >/dev/null
git tag "$NEW_TAG"

cat <<EOF

Done. Created commit and tag '$NEW_TAG' locally, restoring '$TARGET' to its $SRC_TAG state.
  Review:  git show $NEW_TAG
  Publish: git push origin main --tags
EOF
