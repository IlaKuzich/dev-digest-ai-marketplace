# Security policy

This repository is a Claude Code plugin marketplace: installing a plugin from it can run arbitrary code on a user's machine (via `hooks`, `mcpServers`, and command/skill instructions). Treat every addition and change accordingly.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability (e.g. a malicious or compromised plugin, a credential leak, a supply-chain issue in a plugin's `source`). Instead, email **ilakuzich@gmail.com** with:

- Which plugin/file is affected and why it's a concern.
- Steps to reproduce or evidence (e.g. the offending hook/command).
- Whether it's already been merged to `main` or is only in an open PR.

You'll get an acknowledgement, and a fix or rollback (see [RELEASE.md](./RELEASE.md)) will be prioritized over other work.

## Requirements for every plugin

- **No secrets.** Never commit API keys, tokens, or credentials in `plugin.json`, hooks, MCP configs, or example code. If one is committed, it must be rotated, not just deleted from a later commit — git history retains it.
- **Review hooks and MCP servers as code, not config.** `hooks/hooks.json` and `mcpServers` entries execute commands or start processes on the user's machine. A PR adding or modifying either requires review from a `CODEOWNERS` reviewer before merge, independent of the general PR review.
- **Pin external sources.** A plugin entry whose `source` points outside this repo (`github`, `url`, `git-subdir`, `npm`, `archive`) should pin a specific `ref`/tag or commit `sha`, not a floating branch — this keeps installs reproducible and auditable.
- **No top-level `bin/`.** Plugins distributed through this marketplace should not ship executables in a top-level `bin/` directory; keep behavior in reviewable `commands/`, `skills/`, `agents/`, and `hooks/` files.
- **`claude plugin validate .` must pass** before merge (enforced in CI, see `.github/workflows/validate.yml`) — this is a baseline structural check, not a substitute for reading a hook or MCP config that's new or changed.

## Supported versions

Only the latest released version of each plugin (the tag most recently created by `scripts/release.sh`) is supported. Security fixes are shipped as a new release per [RELEASE.md](./RELEASE.md); older tags are kept for history and rollback but are not patched in place.

## Disclosure

Given this is a course-project marketplace with a small, known set of maintainers, fixes are generally disclosed via the `CHANGELOG.md` entry for the release/rollback that addresses them, rather than a separate advisory process.
