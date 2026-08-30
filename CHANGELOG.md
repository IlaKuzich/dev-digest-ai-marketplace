# Changelog

Records every release and rollback made via `scripts/release.sh` / `scripts/rollback.sh`,
most recent entry at the bottom. Each entry corresponds to a git tag named
`<plugin-name>--v<version>` (or `marketplace-v<version>` for the catalog itself) — the
double-dash form is what the native `claude plugin tag` command also creates and validates.

Rollbacks are recorded as new forward releases that restore prior content —
version numbers are never reused or rewritten. See [docs/RELEASES.md](./docs/RELEASES.md).

## research-tools--v1.1.0
Record repo commit hash in codebase reports (Methodology section)
