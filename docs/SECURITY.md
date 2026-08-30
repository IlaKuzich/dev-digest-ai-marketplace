# Security policy

This repository is a Claude Code plugin marketplace: installing a plugin from it can run arbitrary code on a user's machine (via `hooks`, `mcpServers`, and command/skill instructions). Treat every addition and change accordingly.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability (e.g. a malicious or compromised plugin, a credential leak, a supply-chain issue in a plugin's `source`). Instead, email **ilakuzich@gmail.com** with:

- Which plugin/file is affected and why it's a concern.
- Steps to reproduce or evidence (e.g. the offending hook/command).
- Whether it's already been merged to `main` or is only in an open PR.

You'll get an acknowledgement, and a fix or rollback (see [RELEASES.md](./RELEASES.md)) will be prioritized over other work.

## Requirements for every plugin

- **No secrets.** Never commit API keys, tokens, or credentials in `plugin.json`, hooks, MCP configs, or example code. If one is committed, it must be rotated, not just deleted from a later commit — git history retains it.
- **No absolute paths.** Plugin manifests, hooks, and scripts must not hardcode absolute filesystem paths (e.g. `/Users/<name>/...`, `/home/<name>/...`, a Windows drive path). They leak details of the author's machine, and they silently break for every consumer whose checkout lives somewhere else. Use paths relative to `${CLAUDE_PLUGIN_ROOT}` (for plugin-relative files) or the project root the hook receives (e.g. `$CLAUDE_PROJECT_DIR`), never a literal path.
- **Review hooks and MCP servers as code, not config.** `hooks/hooks.json` and `mcpServers` entries execute commands or start processes on the user's machine. A PR adding or modifying either requires review from a `CODEOWNERS` reviewer before merge, independent of the general PR review.
- **Pin external sources.** A plugin entry whose `source` points outside this repo (`github`, `url`, `git-subdir`, `npm`, `archive`) should pin a specific `ref`/tag or commit `sha`, not a floating branch — this keeps installs reproducible and auditable.
- **No top-level `bin/`.** Plugins distributed through this marketplace should not ship executables in a top-level `bin/` directory; keep behavior in reviewable `commands/`, `skills/`, `agents/`, and `hooks/` files.
- **`claude plugin validate .` must pass** before merge (enforced in CI, see `.github/workflows/validate.yml`) — this is a baseline structural check, not a substitute for reading a hook or MCP config that's new or changed.

## After a dangerous release

If a merged release turns out to run something it shouldn't (a hook doing more than reviewed, a
leaked credential, a dependency substitution), treat it as an incident, not a normal bug:

1. **Stop the bleeding first.** Roll the affected plugin back immediately with `scripts/rollback.sh` (see [RELEASES.md](./RELEASES.md)) so `main` stops serving the dangerous content — do this before root-causing it.
2. **Rotate, don't just remove.** If a secret was exposed, rotate it immediately; removing it from a later commit does not remove it from git history.
3. **Notify.** If anyone could plausibly have already installed the bad version (i.e. it was on `main` or tagged for any nonzero amount of time), say so in the rollback's `CHANGELOG.md` entry and, for anything more than a trivial issue, email the address above so affected users can be tracked down individually.
4. **Record it.** The rollback's CHANGELOG entry is the incident record for this repo — state what happened and what the rollback restored, per [Disclosure](#disclosure) below.
5. **Fix forward.** Only after the rollback is live and secrets (if any) are rotated, prepare a new release that actually fixes the root cause — never re-apply the same change without addressing why it was dangerous.

## Supported versions

Only the latest released version of each plugin (the tag most recently created by `scripts/release.sh`) is supported. Security fixes are shipped as a new release per [RELEASES.md](./RELEASES.md); older tags are kept for history and rollback but are not patched in place.

## Disclosure

Given this is a course-project marketplace with a small, known set of maintainers, fixes are generally disclosed via the `CHANGELOG.md` entry for the release/rollback that addresses them, rather than a separate advisory process.
