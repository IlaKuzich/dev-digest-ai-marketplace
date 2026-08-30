# IKDD AI Marketplace

A Claude Code plugin marketplace for the IKDD course project — a catalog of agents, skills, and commands installable directly in Claude Code.

## Installing this marketplace

```
/plugin marketplace add IlaKuzich/ikdd-ai-marketplace
/plugin install <plugin-name>@ikdd-ai-marketplace
```

## Repository structure

```
ikdd-ai-marketplace/
├── .claude-plugin/
│   └── marketplace.json      # marketplace catalog (required)
├── plugins/
│   └── <plugin-name>/
│       ├── .claude-plugin/
│       │   └── plugin.json   # plugin manifest (required)
│       ├── commands/         # slash commands
│       ├── skills/           # auto-discovered skills
│       ├── agents/           # subagents
│       └── hooks/            # hooks.json
├── scripts/                   # release.sh / rollback.sh
└── .github/                  # CI, issue templates, CODEOWNERS
```

## Adding a new plugin

1. Copy `plugins/example-plugin` to `plugins/<your-plugin-name>`.
2. Update `plugin.json` — `name`, `version`, `description`, `author`.
3. Add an entry for it in `.claude-plugin/marketplace.json` under `plugins`.
4. Run `claude plugin validate .` locally.
5. Open a PR — see [CONTRIBUTING.md](./CONTRIBUTING.md).

## Validating locally

```
claude plugin validate .
```

CI runs the same check on every pull request (see `.github/workflows/validate.yml`).

## Releases and rollbacks

Publishing a new plugin version or undoing a bad one is done via `scripts/release.sh` and `scripts/rollback.sh`, never by hand-editing version numbers — see [RELEASE.md](./RELEASE.md).

## Security

Hooks, MCP servers, and external plugin sources can run code on a user's machine — see [SECURITY.md](./SECURITY.md) for review requirements and how to report a vulnerability.
