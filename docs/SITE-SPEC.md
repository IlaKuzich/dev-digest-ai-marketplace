# Marketplace site spec

`site/` is a static, browsable index of this marketplace's plugins, deployed to GitHub Pages
by `.github/workflows/pages.yml`. It exists so someone can discover what's in the marketplace
without cloning the repo or knowing the `/plugin` CLI syntax.

## Data source

`scripts/build-index.mjs` is the single source of truth for what the site displays. It:

1. Reads `.claude-plugin/marketplace.json`.
2. For each entry whose `source` is a relative path (`./plugins/<name>`), reads that plugin's
   `.claude-plugin/plugin.json` and `README.md`.
3. Emits `site/index.json` — an array of `{ name, displayName, description, version, keywords,
   installCommand, readmeExcerpt }` objects, one per plugin.

The site never reads `marketplace.json` or `plugin.json` directly in the browser — everything
goes through `index.json` so the page has one static file to fetch, and so a plugin can be
represented on the site even if its `source` isn't a local path (future case).

## Page contents

`site/index.html` renders, per plugin:

- `displayName` (falls back to `name`)
- `description`
- `version` — shown as `vX.Y.Z`; a `0.0.0` version renders a "placeholder — not yet published" badge instead of a version number
- `keywords`, as filterable tags
- The install command, pre-filled and copyable:
  ```
  /plugin install <name>@dev-digest-ai-marketplace
  ```
- A link to the plugin's `README.md` on GitHub (not inlined — keeps `index.json` small)

Plugins are sorted alphabetically by `name`. There is no pagination target — this marketplace
is not expected to exceed a few dozen plugins.

## Build & deploy

- `node scripts/build-index.mjs` writes `site/index.json`. It must be run (via CI) before the
  site is deployed — `site/index.json` is generated, not committed.
- `.github/workflows/pages.yml` runs the build on every push to `main` that touches
  `.claude-plugin/`, `plugins/`, or `site/`, then deploys `site/` via
  `actions/deploy-pages`.
- The site has no server-side component and no build step beyond generating `index.json` —
  keep it that way; this is a catalog page, not an application.

## What changes require updating this spec

Any change to what `index.json` contains, or to what the page displays, must update this file
in the same PR — `SITE-SPEC.md` is meant to be read instead of `build-index.mjs` by someone who
just wants to know what the site shows, and it drifting from the code defeats that purpose.
