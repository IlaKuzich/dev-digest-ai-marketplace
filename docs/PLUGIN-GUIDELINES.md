# Plugin guidelines

Canonical reference for what a plugin in this marketplace must look like. `CONTRIBUTING.md`
walks through the PR process; this document is the detailed spec that process checks against.

## Directory structure

```
plugins/<plugin-name>/
├── .claude-plugin/
│   └── plugin.json      # required — manifest
├── agents/               # optional — subagents (one .md file per agent)
├── skills/                # optional — auto-discovered skills (one dir per skill, with SKILL.md)
├── commands/              # optional — slash commands (flat .md files)
├── hooks/
│   └── hooks.json         # optional — hook wiring; scripts referenced via ${CLAUDE_PLUGIN_ROOT}
├── README.md              # required — what this plugin does, and current status if not yet complete
└── CHANGELOG.md            # optional at the plugin level; the repo's root CHANGELOG.md is authoritative
```

`<plugin-name>` must be kebab-case and match the `name` field in `plugin.json` and the key
used in `.claude-plugin/marketplace.json`.

## `plugin.json` manifest fields

| Field | Required | Notes |
|---|---|---|
| `name` | **yes** | kebab-case, unique across this marketplace, matches the directory name |
| `version` | **yes** | SemVer (`MAJOR.MINOR.PATCH`); see [RELEASES.md](./RELEASES.md) |
| `description` | **yes** | One sentence, user-facing — this is what installers read before installing |
| `displayName` | recommended | Human-readable name shown in `/plugin` UI |
| `author` | recommended | `{ "name": ..., "email": ... }` |
| `license` | recommended | SPDX identifier (e.g. `MIT`) |
| `commands` / `skills` / `agents` | as needed | Path to the corresponding directory, relative to the plugin root |
| `hooks` | as needed | Path to a `hooks.json`; see [SECURITY.md](./SECURITY.md) for the review requirement |
| `mcpServers` | as needed | Same review requirement as `hooks` |
| `keywords` | recommended | Used by `scripts/build-index.mjs` to build the site's category/tag filters — see [SITE-SPEC.md](./SITE-SPEC.md) |

Any field valid in `plugin.json` is also valid inline in the plugin's entry in
`.claude-plugin/marketplace.json` — but `plugin.json` is the source of truth (`strict`
behavior): if the two disagree, `plugin.json` wins, so don't let them drift. `scripts/release.sh`
keeps them in sync automatically when a `version` field is present in both.

## Dependency rules

- **No cross-plugin file reads.** A plugin must be self-contained under its own
  `plugins/<name>/` directory. It must not reference, `source`, or read a file that lives in
  another plugin's directory — two plugins with unrelated release cadences must be free to
  ship independently without breaking each other.
- **No implicit runtime dependencies on another plugin.** If a plugin's value depends on another
  plugin also being installed (e.g. `sdd-engineering`'s `implement` skill assuming
  `architecture-review`'s subagent exists), state that explicitly in the plugin's `README.md`
  under a "Requires" section — Claude Code's plugin system has no dependency-resolution field,
  so this is documentation, not enforcement, and must be treated as a hard requirement of the PR
  checklist below.
- **External tool/environment dependencies must be declared.** If a hook or skill shells out to
  a CLI (`jq`, `gh`, a language toolchain, …) or reads an environment variable, list it in the
  plugin's `README.md`. Silent runtime failures on a missing dependency are a support burden,
  not an edge case to skip handling.
- **No absolute paths** in manifests, hooks, or scripts — see [SECURITY.md](./SECURITY.md).

## Checks every plugin must pass

1. `claude plugin validate .` — structural manifest validation (run automatically in CI: `.github/workflows/validate.yml`).
2. `python3 -m json.tool` (or equivalent) on `plugin.json` and any JSON the plugin ships, to catch syntax errors before they reach `claude plugin validate`.
3. Manual review against the requirements in [SECURITY.md](./SECURITY.md) if the plugin adds or changes `hooks/` or `mcpServers`.
4. The plugin is registered in `.claude-plugin/marketplace.json` with a `source` pointing at `./plugins/<plugin-name>`.

## Pull request checklist

- [ ] `plugins/<name>/.claude-plugin/plugin.json` has `name`, `version`, `description`
- [ ] Directory name, manifest `name`, and marketplace entry `name` all match
- [ ] `README.md` documents what the plugin does, any "Requires" (other plugins/tools), and current status
- [ ] `claude plugin validate .` passes locally
- [ ] No secrets, no absolute paths (see [SECURITY.md](./SECURITY.md))
- [ ] Any new/changed `hooks/` or `mcpServers` is called out explicitly in the PR description for reviewer attention
- [ ] Entry added/updated in `.claude-plugin/marketplace.json`
