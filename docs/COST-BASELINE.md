# Cost baseline

Plugins in this marketplace run on the *installer's* Claude usage, not this repo's. A plugin
that defaults an agent to a larger model, or preloads a heavy skill into every agent's context,
multiplies that cost across everyone who installs it. This document is the place that cost
choice gets written down and reviewed, instead of being an invisible side effect of a PR.

## What to record per plugin

For every `agents/*.md` a plugin ships, record:

| Plugin | Agent | Model | Typical run (input/output tokens, rough) | Notes |
|---|---|---|---|---|
| _(none yet — all four plugins are placeholders, see below)_ | | | | |

- **Model**: the `model:` field in the agent's frontmatter (`opus` / `sonnet` / `haiku`, or
  inherited from the session if unset — call that out explicitly, since it means the plugin's
  cost varies with whatever the installer happens to be running).
- **Typical run**: a rough order of magnitude from actually running the agent on a
  representative task, not a guess. Update it if the agent's preloaded skills or tool set
  changes materially.
- For skills (not agents): note if the skill is preloaded into an agent's frontmatter
  (`skills:`) versus loaded on-demand — a preloaded skill's tokens are paid on every
  invocation of that agent, an on-demand one only when triggered.

## Baseline for this repo today

All four `plugins/*` directories are placeholders (`version: 0.0.0`, no `agents/`/`skills/`
content yet) — there is nothing to baseline. This table must be filled in as part of the PR
that replaces a placeholder with real content; see the checklist in
[PLUGIN-GUIDELINES.md](./PLUGIN-GUIDELINES.md).

## When a change affects cost

Any PR that does one of the following must update this file:

- Adds a new agent, or changes an existing agent's `model:`.
- Adds a skill to another agent's preloaded `skills:` list (as opposed to leaving it on-demand).
- Materially grows a preloaded skill's content (e.g. a `SKILL.md` gaining large embedded
  reference material that loads on every invocation).

## If a release's real-world cost exceeds its baseline

Treat it the same as any other regression from a bad release: record the discrepancy, then
follow [RELEASES.md → Rolling back a plugin](./RELEASES.md#rolling-back-a-plugin) if the
increase is severe enough to warrant reverting rather than shipping a fix forward. Either way,
update the baseline table so it reflects reality before the next release.
