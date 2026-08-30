#!/usr/bin/env bash
# PreToolUse(Write|Edit) write-scope gate for the implementation-planner subagent.
#
# implementation-planner may ONLY create/edit an Implementation Plan. Every other path in
# the installer's repository is read-only for it. The gate is wired in the agent's OWN
# frontmatter (agents/implementation-planner.md `hooks:`), so it is active ONLY while the
# planner runs and never constrains implementer / spec-creator. A session-wide
# permissions.deny in settings.json could NOT do this: subagents inherit deny rules
# unconditionally, so it would block every writer in the project.
#
# This replaces `permissionMode: plan`, which denies Write/Edit outright and forces the
# planner to author its plan through chunked Bash heredocs — costly in context, and prone
# to truncating the file mid-write. The hook expresses the real rule (ONE directory)
# instead of the blunt one (no writes at all). Mirrors spec-creator-write-scope.sh.
#
# Allowed (markdown only):
#   docs/plans/**.md              canonical Implementation Plans
#   docs/superpowers/plans/**.md  dated, superpowers-style plans (only when explicitly asked)
#
# Deliberately NOT allowed:
#   specs/**, <pkg>/specs/**      owned by spec-creator — the planner never authors a spec
#   **/INSIGHTS.md                owned by the engineering-insights flow
#
# Contract: exit 0 = allow; exit 2 = deny (stderr is shown to the agent).
# Fails CLOSED — this is a boundary, so anything unparseable is denied, not waved through.
set -uo pipefail

HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$HOOK_DIR/../.." && pwd)}"

deny() {
  echo "🚫 implementation-planner write-scope: $1" >&2
  echo "   You may only create or edit an Implementation Plan:" >&2
  echo "     docs/plans/<kebab-feature-name>.md            (canonical)" >&2
  echo "     docs/superpowers/plans/<YYYY-MM-DD>-<slug>.md  (only if explicitly asked)" >&2
  echo "   Everything else is read-only for you. Do not try to route around this:" >&2
  echo "   work that needs another file belongs to an implementer — describe it in the" >&2
  echo "   plan instead of doing it." >&2
  exit 2
}

payload="$(cat)"

command -v jq >/dev/null 2>&1 || deny "jq is unavailable, so the target path cannot be verified."

file_path="$(printf '%s' "$payload" | jq -r '.tool_input.file_path // empty' 2>/dev/null || true)"
[ -n "$file_path" ] || deny "the tool call carries no file_path to check."

path="${file_path//\\//}"
root="${REPO_ROOT//\\//}"
root="${root%/}"

shopt -s nocasematch
if [[ "$path" == "$root"/* ]]; then
  rel="${path:${#root}+1}"
else
  rel="$path"
fi
shopt -u nocasematch

case "$rel" in
  *..*) deny "the path contains a '..' segment: $file_path" ;;
esac

case "$rel" in
  /*|?:/*) deny "the path is outside the project: $file_path" ;;
esac

case "$rel" in
  docs/plans/*.md|docs/superpowers/plans/*.md)
    exit 0
    ;;
esac

case "$rel" in
  specs/*|*/specs/*)
    deny "specs/ and <pkg>/specs/ belong to spec-creator. You plan HOW to build stated requirements — you never author or amend a spec. An unstated requirement is a question for your clarification gate, not a spec paragraph you draft." ;;
  INSIGHTS.md|*/INSIGHTS.md)
    deny "no INSIGHTS.md is yours to write. Record the lesson in the plan's '## Planning notes' and flag it in your report so the engineering-insights flow can append it." ;;
  docs/plans/*|docs/superpowers/plans/*)
    deny "a plan must be a .md file: $file_path" ;;
esac

deny "$file_path is outside the plans directory."
