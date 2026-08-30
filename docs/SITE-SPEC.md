# Marketplace site spec

`site/` is a static React app (Vite + React Router `HashRouter`), deployed to GitHub Pages by
`.github/workflows/deploy-pages.yml`. It exists so someone can search, browse, and install
plugins/skills/commands/agents from this marketplace without cloning the repo or knowing the
`/plugin` CLI syntax. There is no backend — everything is either baked in at build time or
fetched from public, CORS-enabled APIs at runtime.

See also [docs/marketplace-ui-spec.md](./marketplace-ui-spec.md) for the original design
rationale behind the four views below.

## Data source

Two build-time scripts are the single source of truth for what the site displays — the page
never reads `.claude-plugin/marketplace.json` or a plugin's `plugin.json` directly in the
browser:

- `scripts/build-index.mjs` reads `.claude-plugin/marketplace.json`, and for each plugin whose
  `source` is a local path (`./plugins/<name>`) reads `plugin.json`, `README.md`, and walks
  `commands/*.md`, `skills/<name>/SKILL.md`, `agents/*.md`. It emits
  `site/public/data/index.json` — a flat array of entries (`type: "plugin" | "skill" | "command"
  | "agent"`), each carrying enough text (`description`, `readmeText`/`bodyText`, `keywords`) for
  client-side full-text search, plus `lastUpdatedAt`/`firstAddedAt` from `git log`.
- `scripts/build-changelog.mjs` walks git history for `plugins/**` and
  `.claude-plugin/marketplace.json`, classifies each touched file into an update-feed event, and
  emits `site/public/data/changelog.json` (also used for the stats view's growth chart and
  contributor tally) and `site/public/feed.xml` (Atom feed for the "What's new" subscribe link).

## Page contents

The app has four tabs plus an item-detail route:

- **Catalog** (`#/catalog`) — free-text search across all entries (name, description, keywords,
  full body text), type filters (plugin/skill/command/agent), a "recommended to start" section
  (plugins tagged `starter` in `keywords`), and sort by relevance/last-updated/name.
- **Item detail** (`#/item/<id>`) — full description, keywords, a copy-to-clipboard install
  snippet (`/plugin marketplace add …` + `/plugin install …`), child artifacts for a plugin, and
  related plugins (shared keywords).
- **What's new** (`#/whatsnew`) — timeline built from `changelog.json`, plus an RSS/Atom
  subscribe link to `feed.xml`.
- **Stats** (`#/stats`) — counts by type, a plugin-growth chart, a tag cloud, contributors (all
  from `index.json`/`changelog.json`), and live GitHub star/fork counts fetched client-side from
  the public GitHub REST API (fails silently to a dash if rate-limited).
- **Getting started** (`#/onboarding`) — copyable install commands and a localStorage-backed
  progress checklist; a first-visit tour banner also lives on the Catalog tab.

All UI copy lives in `site/src/i18n/en.js`, not inline in components.

## Build & deploy

- `node scripts/build-index.mjs && node scripts/build-changelog.mjs` write
  `site/public/data/*.json` + `site/public/feed.xml`. Vite copies `site/public/` verbatim into
  `site/dist/` on build — these files are generated, not committed.
- `.github/workflows/deploy-pages.yml` runs on every PR and push touching `site/`, `scripts/`,
  `.claude-plugin/`, or `plugins/`: the `build-site` job always builds (a standalone pass/fail
  check, separate from `validate.yml`'s harness check); the `deploy` job only runs on push to
  `main`, uploading `site/dist/` via `actions/deploy-pages`.
- Local dev: from the repo root, run the two `node scripts/...` commands above, then
  `cd site && npm install && npm run dev` (or `npm run build && npx serve dist` to check the
  actual production build).

## What changes require updating this spec

Any change to what `index.json`/`changelog.json` contain, what a view displays, or how the
workflow is triggered must update this file in the same PR — `SITE-SPEC.md` is meant to be read
instead of the source by someone who just wants to know what the site shows, and it drifting
from the code defeats that purpose.
