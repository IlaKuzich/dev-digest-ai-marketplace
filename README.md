# DevDigest AI Marketplace

A Claude Code plugin marketplace, kept separate from the DevDigest product repo on purpose:
the product and this harness have different owners and different release cadences. A DevDigest
UI change should never force a plugin release, and a plugin fix should never force a product
release.

Browsable index: https://ilakuzich.github.io/dev-digest-ai-marketplace/ (built by
`.github/workflows/pages.yml`, see [docs/SITE-SPEC.md](./docs/SITE-SPEC.md)).

## Installing this marketplace

```
/plugin marketplace add IlaKuzich/dev-digest-ai-marketplace
/plugin install <plugin-name>@dev-digest-ai-marketplace
```

## Repository structure

```
dev-digest-ai-marketplace/
├── .claude-plugin/
│   └── marketplace.json       # marketplace catalog (required)
├── .github/workflows/
│   ├── validate.yml            # claude plugin validate . on every PR
│   └── pages.yml                # builds site/ and deploys to GitHub Pages
├── plugins/
│   ├── engineering-paved-path/  # placeholder — see plugin READMEs for status
│   ├── research-tools/
│   ├── architecture-review/
│   └── sdd-engineering/
├── docs/
│   ├── PLUGIN-GUIDELINES.md      # plugin structure, manifest fields, dependency rules, PR checklist
│   ├── SITE-SPEC.md               # what the public site shows and how it's built
│   ├── SECURITY.md                 # secrets/absolute-path bans, vulnerability reporting, incident runbook
│   ├── RELEASES.md                  # SemVer, tags, release channels, update, rollback
│   └── COST-BASELINE.md              # per-agent model/token baseline tracking
├── scripts/
│   ├── build-index.mjs           # generates site/index.json from marketplace.json + plugin.json
│   ├── release.sh                 # cut a release (see docs/RELEASES.md)
│   ├── rollback.sh                 # roll back a bad release (see docs/RELEASES.md)
│   └── _lib.sh
├── site/
│   └── index.html                  # static page reading the generated index.json
├── CODEOWNERS
├── CONTRIBUTING.md
└── README.md
```

## Adding a new plugin

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full checklist — in short: create
`plugins/<name>/.claude-plugin/plugin.json`, add a `README.md`, register it in
`.claude-plugin/marketplace.json`, run `claude plugin validate .`, open a PR. The detailed
manifest/structure/dependency reference is [docs/PLUGIN-GUIDELINES.md](./docs/PLUGIN-GUIDELINES.md).

## Validating locally

```
claude plugin validate .
```

CI runs the same check on every pull request (`.github/workflows/validate.yml`).

## Releases and rollbacks

Publishing a new plugin version or undoing a bad one is done via `scripts/release.sh` and
`scripts/rollback.sh`, never by hand-editing version numbers — see
[docs/RELEASES.md](./docs/RELEASES.md).

## Security

Hooks, MCP servers, and external plugin sources can run code on a user's machine, and every
plugin manifest/hook/script must avoid secrets and absolute paths — see
[docs/SECURITY.md](./docs/SECURITY.md) for the full requirements and how to report a
vulnerability.

## Review

`CODEOWNERS` + a repository ruleset require review from the responsible team before a PR can
merge (bypassable only by a repo admin, for emergencies).
