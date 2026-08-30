# Cost baseline

Plugins in this marketplace run on the *installer's* Claude usage, not this repo's. A plugin
that defaults an agent to a larger model, or preloads a heavy skill into every agent's context,
multiplies that cost across everyone who installs it. This document is the place that cost
choice gets written down and reviewed, instead of being an invisible side effect of a PR.

## What to record per plugin

For every `agents/*.md` a plugin ships, record:

| Plugin | Agent | Model | Typical run (input/output tokens, rough) | Notes |
|---|---|---|---|---|
| sdd-engineering | implementer | sonnet (pinned in frontmatter) | ~3.9M tokens, $2.20, 53 turns for a 2-file/~15-line change | Measured 2026-08-31 in a consumer project (`next_js_harness_testing`), task: return-reason length validation. Cold spawn — ~two-thirds of the run's turns went to environment setup (installing `bun`, `bun install`) the orchestrator's own shell had already paid for, not to the edit itself. See that project's `docs/agent-runs/2026-08-31-return-reason-length-validation.md`. |
| _(remaining agents — spec-creator, implementation-planner, plan-verifier, architecture-reviewer, researcher — not yet measured)_ | | | | |

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

All four plugins now ship real `agents/`/`skills/` content (`engineering-paved-path` and
`architecture-review`/`sdd-engineering` at `1.0.0`, `research-tools` at `1.1.0`), but only one
agent — `sdd-engineering:implementer` — has an actual measured run so far (row above). The
remaining agents in the table must be filled in from a real run, not a guess, as they get
exercised — see the checklist in [PLUGIN-GUIDELINES.md](./PLUGIN-GUIDELINES.md).

**Optimization candidate identified, not yet applied:** the same run's retro flagged that a
2-file/line-level-planned change didn't need a cold `implementer` spawn at all — the
orchestrator could have made the edits directly. Adding a spawn-threshold heuristic ("≤2 files
and the plan is already line-level ⇒ edit directly, don't spawn") to `sdd-engineering`'s
`run-plan` skill would likely take this class of run from ~$2.20/cold-spawn to near $0. This
needs a before/after pair (this row is "before") once the heuristic ships.

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
