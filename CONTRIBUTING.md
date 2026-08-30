# Contributing a plugin

This repo is a plugin marketplace, kept separate from the DevDigest product repo on purpose:
a UI change in DevDigest should never force a skill release, and a skill fix should never force
a product release. Each plugin here has its own version and its own release cadence.

The full reference this checklist is derived from is [docs/PLUGIN-GUIDELINES.md](./docs/PLUGIN-GUIDELINES.md) — read it before your first plugin, come back to this file for the checklist on every PR after that.

## Plugin structure

```
plugins/<plugin-name>/
├── .claude-plugin/
│   └── plugin.json      # required
├── agents/               # optional
├── skills/                # optional
├── commands/              # optional
├── hooks/hooks.json       # optional — extra review required, see Security below
└── README.md              # required
```

`<plugin-name>` is kebab-case and must match the manifest `name` and the marketplace entry key.

## `plugin.json` manifest fields

Required: `name`, `version` (SemVer), `description`. Recommended: `displayName`, `author`,
`license`, `keywords`. As needed: `commands`, `skills`, `agents`, `hooks`, `mcpServers` — each a
path relative to the plugin root. `plugin.json` is the source of truth if it and the
`marketplace.json` entry ever disagree (`strict` behavior). Full field-by-field detail:
[docs/PLUGIN-GUIDELINES.md](./docs/PLUGIN-GUIDELINES.md#pluginjson-manifest-fields).

## Dependency rules

- A plugin is self-contained — it must not read or reference files inside another plugin's directory.
- If it only makes sense installed alongside another plugin in this marketplace, say so explicitly in a "Requires" section of its `README.md` — there is no dependency-resolution field to enforce this automatically.
- Any external CLI, tool, or environment variable a hook/skill relies on must be documented in the plugin's `README.md`.
- No absolute paths anywhere in the plugin (manifest, hooks, scripts) — see [docs/SECURITY.md](./docs/SECURITY.md).

## Steps

1. Create `plugins/<plugin-name>/.claude-plugin/plugin.json` with at minimum `name`, `version`, `description`.
2. Add `commands/`, `skills/`, `agents/`, or `hooks/` as needed, plus a `README.md`.
3. Register the plugin in `.claude-plugin/marketplace.json`:
   ```json
   {
     "name": "<plugin-name>",
     "source": "./plugins/<plugin-name>",
     "displayName": "<Human readable name>",
     "description": "<one-line description>",
     "version": "<semver>"
   }
   ```
4. Run `claude plugin validate .` and fix any errors.
5. If you touched cost-relevant surface (a new agent, a `model:` change, a newly-preloaded skill), update [docs/COST-BASELINE.md](./docs/COST-BASELINE.md).
6. Open a pull request. `CODEOWNERS` requires review from the responsible team before it can merge (bypassable only by a repo admin for emergencies).
7. Once merged, versioning and publishing a new plugin version is done via `scripts/release.sh` — see [docs/RELEASES.md](./docs/RELEASES.md).

## Pull request checklist

- [ ] `plugin.json` has `name`, `version`, `description`; directory name / manifest `name` / marketplace entry `name` all match
- [ ] `README.md` documents purpose, any "Requires", and current status
- [ ] `claude plugin validate .` passes locally
- [ ] No secrets, no absolute paths ([docs/SECURITY.md](./docs/SECURITY.md))
- [ ] New/changed `hooks/` or `mcpServers` called out explicitly in the PR description
- [ ] `docs/COST-BASELINE.md` updated if this PR changes an agent's model or preloaded skills
- [ ] Entry added/updated in `.claude-plugin/marketplace.json`

## Other guidelines

- Prefer relative `source` paths (`./plugins/...`) for plugins hosted in this monorepo; use `github`/`url` sources only for plugins hosted elsewhere, and see [docs/SECURITY.md](./docs/SECURITY.md) for pinning requirements on those.
- If renaming or removing a plugin, add an entry to the `renames` field in `marketplace.json` so existing installs don't break.
- Security requirements for hooks, MCP servers, secrets, and reporting a vulnerability: [docs/SECURITY.md](./docs/SECURITY.md).
- What the marketplace's public site displays and how it's built: [docs/SITE-SPEC.md](./docs/SITE-SPEC.md).
