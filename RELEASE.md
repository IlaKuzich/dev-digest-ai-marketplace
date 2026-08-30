# Releasing and rolling back

This marketplace is a git repository that Claude Code reads directly (`/plugin marketplace add owner/repo`), tracking the `main` branch. That makes it **mutable state**, not an immutable package registry — which shapes both how releases are cut and how a bad release gets undone.

## Versioning model

- Each plugin is versioned independently with [SemVer](https://semver.org/) in its own `plugins/<name>/.claude-plugin/plugin.json`.
- If a `marketplace.json` entry for a plugin also carries a `version` field, it must mirror `plugin.json` — `plugin.json` is the source of truth (`strict` behavior).
- The marketplace catalog itself (`.claude-plugin/marketplace.json`) has its own top-level `version`, bumped when the catalog structure changes (new fields, renamed/removed plugins) rather than for individual plugin changes.
- Every release is recorded as a git tag: `<plugin-name>-v<version>` (or `marketplace-v<version>` for the catalog).
- **Version numbers are never reused**, even for a rollback — see below.

## Releasing a plugin

Use `scripts/release.sh` instead of hand-editing versions — it keeps `plugin.json` and `marketplace.json` in sync, validates before committing, and writes a changelog entry.

```bash
scripts/release.sh <plugin-name|marketplace> <patch|minor|major|X.Y.Z> [-m "note"]

# examples
scripts/release.sh example-plugin patch -m "Fix hello command output"
scripts/release.sh example-plugin 2.0.0 -m "Breaking: renamed command"
scripts/release.sh marketplace minor -m "Add category field to catalog"
```

What it does:
1. Refuses to run on a dirty working tree.
2. Computes the new version (semver bump or explicit version) and rejects it if that tag already exists.
3. Updates `plugin.json` (and the matching `marketplace.json` entry, if versioned).
4. Runs `claude plugin validate .`; on failure it reverts the JSON changes and aborts.
5. Appends an entry to `CHANGELOG.md`.
6. Commits and creates the tag `<plugin-name>-v<version>` locally.

It does **not** push. Review with `git show <tag>`, then push explicitly:

```bash
git push origin main --tags
```

## Rolling back a plugin

Because `main` is mutable and already-installed users track it, a rollback must **never** force-push, rewrite history, or delete/move a tag — someone may already have pulled the bad version. Instead, `scripts/rollback.sh` restores the previous release's content and republishes it under a **new, higher version number**.

```bash
scripts/rollback.sh <plugin-name> <target-version> [-m "reason"]

# example: v1.3.0 is broken, restore what v1.2.0 shipped
scripts/rollback.sh example-plugin 1.2.0 -m "v1.3.0 broke the hello command"
```

What it does:
1. Requires the target tag `<plugin-name>-v<target-version>` to exist.
2. Replaces the plugin's directory with its exact tree from that tag (so files added after that release are removed too, not just reverted-in-place).
3. Sets the version to a new patch bump of the *current* version (e.g. current `1.3.0` → rollback content from `1.2.0` → published as `1.3.1`).
4. Validates, records the rollback in `CHANGELOG.md`, commits, and tags `<plugin-name>-v<new-version>` locally.

Push the same way: `git push origin main --tags`.

## Pinning for consumers

Anyone installing from this marketplace can pin to a specific release instead of tracking `main`:

```
/plugin marketplace add IlaKuzich/ikdd-ai-marketplace@<plugin-name>-v<version>
```

This is the recommended way to depend on this marketplace from anything other than casual/course use, since it isolates you from in-progress changes on `main`.

## Security-sensitive changes

Any release that touches `hooks/`, `mcpServers`, or plugin `source` entries pointing outside this repo requires the review described in [SECURITY.md](./SECURITY.md) before tagging.
