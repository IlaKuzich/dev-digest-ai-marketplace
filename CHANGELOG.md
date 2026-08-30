# Changelog

Records every release and rollback made via `scripts/release.sh` / `scripts/rollback.sh`,
most recent entry at the bottom. Each entry corresponds to a git tag named
`<plugin-name>--v<version>` (or `marketplace-v<version>` for the catalog itself) — the
double-dash form is what the native `claude plugin tag` command also creates and validates.

Rollbacks are recorded as new forward releases that restore prior content —
version numbers are never reused or rewritten. See [docs/RELEASES.md](./docs/RELEASES.md).

## research-tools--v1.1.0
Record repo commit hash in codebase reports (Methodology section)

## engineering-paved-path--v1.0.0
First tagged release — 12 reusable skills for the JS/TS ecosystem, already at 1.0.0 in
plugin.json/marketplace.json before this tag existed. Tagged directly via `claude plugin tag`
(not `scripts/release.sh`, since no version bump was needed).

## architecture-review--v1.0.0
First tagged release — read-only onion-architecture/DI/RSC-boundary diff reviewer. Tagged
directly via `claude plugin tag` for the same reason as above.

## sdd-engineering--v1.0.0
First tagged release — spec-creator/implementation-planner/implementer/plan-verifier pipeline
orchestrated by run-plan. Required fixing a broken YAML frontmatter in
`skills/workflow-retro/SKILL.md` first (an unquoted description containing `: ` mid-string,
which `claude plugin tag`'s per-file check caught and `claude plugin validate` did not). Tagged
directly via `claude plugin tag`.
