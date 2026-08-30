# Releases, rollback, and update channels

This marketplace is a git repository that Claude Code reads directly (`/plugin marketplace add owner/repo`), tracking the `main` branch. That makes it **mutable state**, not an immutable package registry — which shapes both how releases are cut and how a bad release gets undone.

## Versioning model

- Each plugin is versioned independently with [SemVer](https://semver.org/) in its own `plugins/<name>/.claude-plugin/plugin.json`.
- If a `marketplace.json` entry for a plugin also carries a `version` field, it must mirror `plugin.json` — `plugin.json` is the source of truth (`strict` behavior).
- The marketplace catalog itself (`.claude-plugin/marketplace.json`) has its own top-level `version`, bumped when the catalog structure changes (new fields, renamed/removed plugins) rather than for individual plugin changes.
- Every plugin release is recorded as a git tag `<plugin-name>--v<version>` (double dash) —
  this is the convention the native `claude plugin tag` command creates and validates against
  (confirmed via `claude plugin tag --help`), so tags stay usable with that command directly,
  not just with `scripts/release.sh`. The marketplace catalog itself isn't a plugin (no
  `plugin.json` for `claude plugin tag` to validate against), so it keeps its own single-dash
  `marketplace-v<version>`.
- **Version numbers are never reused**, even for a rollback — see below.

## Releasing a plugin

Use `scripts/release.sh` instead of hand-editing versions — it keeps `plugin.json` and `marketplace.json` in sync, validates before committing, and writes a changelog entry.

```bash
scripts/release.sh <plugin-name|marketplace> <patch|minor|major|X.Y.Z> [-m "note"]

# examples
scripts/release.sh research-tools patch -m "Fix researcher tool allowlist"
scripts/release.sh sdd-engineering 2.0.0 -m "Breaking: renamed spec-creator output path"
scripts/release.sh marketplace minor -m "Add category field to catalog"
```

What it does:
1. Refuses to run on a dirty working tree.
2. Computes the new version (semver bump or explicit version) and rejects it if that tag already exists.
3. Updates `plugin.json` (and the matching `marketplace.json` entry, if versioned).
4. Runs `claude plugin validate .`; on failure it reverts the JSON changes and aborts.
5. Appends an entry to `CHANGELOG.md`.
6. Commits and creates the tag `<plugin-name>--v<version>` locally.

It does **not** push. Review with `git show <tag>`, then push explicitly:

```bash
git push origin main --tags
```

## Rolling back a plugin

Because `main` is mutable and already-installed users track it, a rollback must **never** force-push, rewrite history, or delete/move a tag — someone may already have pulled the bad version. Instead, `scripts/rollback.sh` restores the previous release's content and republishes it under a **new, higher version number**.

```bash
scripts/rollback.sh <plugin-name> <target-version> [-m "reason"]

# example: v1.3.0 is broken, restore what v1.2.0 shipped
scripts/rollback.sh sdd-engineering 1.2.0 -m "v1.3.0 broke the spec-creator write-scope hook"
```

What it does:
1. Requires the target tag `<plugin-name>--v<target-version>` to exist.
2. Replaces the plugin's directory with its exact tree from that tag (so files added after that release are removed too, not just reverted-in-place).
3. Sets the version to a new patch bump of the *current* version (e.g. current `1.3.0` → rollback content from `1.2.0` → published as `1.3.1`).
4. Validates, records the rollback in `CHANGELOG.md`, commits, and tags `<plugin-name>--v<new-version>` locally.

Push the same way: `git push origin main --tags`.

## Release channels

Consumers choose their channel by what they pass to `/plugin marketplace add`:

| Channel | How to install | Gets |
|---|---|---|
| **latest** (`main`) | `/plugin marketplace add IlaKuzich/dev-digest-ai-marketplace` | Whatever is on `main` right now, including in-progress changes merged since the last tag. Fine for trying things out; not recommended for anything you depend on. |
| **pinned** (a release tag) | `/plugin marketplace add IlaKuzich/dev-digest-ai-marketplace@<plugin-name>--v<version>` | Exactly the content published at that tag. Never changes under you. **Recommended for any real usage.** |

There is no separate "beta"/"stable" branch — a plugin at `0.x.y` (per SemVer) is implicitly
pre-1.0/unstable, and `major` version bumps are the signal for breaking changes. Pin to a tag
if you need stability regardless of version number.

## Updating

Updating means moving a pin forward, not mutating anything in place:

1. Check `CHANGELOG.md` (or `git tag -l "<plugin-name>--v*"`) for the latest tag of the plugin you depend on.
2. Re-run `/plugin marketplace add IlaKuzich/dev-digest-ai-marketplace@<plugin-name>--v<new-version>` (or `/plugin install <plugin-name>@dev-digest-ai-marketplace` if you track `main`).
3. Re-read the CHANGELOG entry for that tag — a `major` bump means behavior you rely on may have changed.

If updating breaks you, that's what [Rolling back a plugin](#rolling-back-a-plugin) above is for
— either roll the *plugin* back yourself (maintainers) or simply re-pin your own install to the
previous tag (consumers).

## Security-sensitive changes

Any release that touches `hooks/`, `mcpServers`, or plugin `source` entries pointing outside this repo requires the review described in [SECURITY.md](./SECURITY.md) before tagging.
