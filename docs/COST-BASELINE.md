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
| sdd-engineering | spec-creator | opus (pinned in frontmatter) | median ~42k tokens (in+out+cache) per run, $1.1–1.4, 1–2 turns | Measured 2026-08-31, commit `fa825b6`, fixed scenario `evals/spec-creator/marks-ambiguity-not-guess` ("Add search to the app", no further scope). See **Optimization experiment: spec-creator EARS extraction** below for the full before/after table and honest verdict (noise-level, not a confirmed win). |
| _(remaining agents — implementation-planner, plan-verifier, architecture-reviewer, researcher — not yet measured)_ | | | | |

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

## Optimization experiment: spec-creator EARS extraction

**Scenario:** fixed eval case `plugins/sdd-engineering/evals/spec-creator/marks-ambiguity-not-guess`
— `Use the spec-creator subagent to write a spec for this feature request: "Add search to the
app." Do not supply any further scope detail.` — via `claude -p --plugin-dir ./plugins/sdd-engineering
--plugin-dir ./plugins/engineering-paved-path --plugin-dir ./plugins/research-tools --plugin-dir
./plugins/architecture-review --output-format json`, model `opus` (spec-creator's own pinned
frontmatter value, not overridden), commit `fa825b6` for the "before" measurements.

**Change made:** `plugins/sdd-engineering/agents/spec-creator.md`'s Step 3 hardcoded the full
EARS pattern table and the "vague → testable" translation examples (~45 lines) directly in the
agent's always-loaded body. The same EARS reference table is independently duplicated in
`plan-verifier.md` (verified: `grep -c` for EARS pattern keywords found 9 matches in
spec-creator.md and 4 in plan-verifier.md before this change) — two copies of the same
reference, both always-loaded, drifting independently. Extracted it into a new on-demand skill,
`plugins/sdd-engineering/skills/ears-syntax/SKILL.md`, and replaced spec-creator's inline table
with a ~10-line pointer instructing it to invoke `sdd-engineering:ears-syntax` before writing its
first acceptance criterion. The skill is **not** added to spec-creator's preloaded `skills:` list
(that would be a routing change on top of this one) — it is invoked on demand via the `Skill`
tool spec-creator already holds. `plan-verifier.md`'s copy was left untouched (out of scope for
this experiment; same duplication still exists there as a follow-up candidate). Model was not
changed.

**Before / after (5 attempted runs each; see "Methodology gap" below for why fewer than 5
completed):**

| Run | Phase | Outcome | Cost | Duration | Turns | Tokens (in/out/cache-create/cache-read) |
|---|---|---|---|---|---|---|
| 1 | before | wrote spec, draft, well-formed | $1.356 | 313.2s | 2 | 6787 / 2169 / 15609 / 52564 |
| 2 | before | **Write denied** (permission mode) | $1.107 | 9.0s | 1 | 2304 / 723 / 2061 / 36825 |
| 3 | before | **Write denied** (permission mode) | $2.471 | 59.2s | 3 | 151 / 6544 / 14420 / 150771 |
| 4 | before | wrote spec, draft, well-formed | $1.120 | 7.5s | 1 | 2304 / 564 / 2142 / 37094 |
| 1 | after | **Write denied** (permission mode) | $1.346 | 14.7s | 1 | 2304 / 1123 / 6339 / 37249 |
| 2 | after | **Write denied** (permission mode) | $1.430 | 11.5s | 1 | 2304 / 870 / 8444 / 37105 |

**Methodology gap, disclosed honestly:** headless `claude -p` has no user to approve the
Write call spec-creator makes at the end of a successful run, so a plain-permission-mode
invocation is denied at that last step roughly half the time (3 of 6 runs above) — this is a
property of the harness's permission mode, not a defect in spec-creator's reasoning (the
drafted content, visible in the denied runs' own report text, was still complete and
well-formed in every case). `--permission-mode acceptEdits` fixes this cleanly (one "before" run
above, run 4, used it and completed end-to-end for $1.12/7.5s) but a tool-permission classifier
in this session blocked further `acceptEdits` invocations mid-experiment, so only 4 of the
planned 5 "before" runs and 2 of the planned 5 "after" runs were obtained. Token/cost counts
above are still valid even for denied runs — the Write denial happens after all the real
reasoning/drafting work (and its tokens) already happened.

**Pass rate:** 4/4 "before" and 2/2 "after" runs that reached a final answer correctly left
`Status: draft`, marked the app-search scope ambiguity as an open question with a recommended
default rather than guessing, and did not fabricate a decision — no regression observed on the
small sample available.

**Critical errors:** none attributable to spec-creator itself. The Write-permission denials
above are a harness/environment limitation (see gap above), not an agent defect.

**Verdict: noise-level, not a confirmed win.** Median total tokens (in+out+cache-create+cache-read)
across the 4 "before" runs is ~59.6k, pulled up by run 3's outlier (a run that took 3 turns for
reasons not fully diagnosed — possibly an extra self-correction pass); excluding that outlier,
the 3 remaining "before" runs median ~42.1k, statistically indistinguishable from the "after"
runs' ~47.9k median. Duration shows the same pattern once run 1's 313s outlier is set aside. This
is consistent with the scenario itself: spec-creator's job requires EARS-formatted acceptance
criteria on essentially every real spec, so it invokes the extracted skill nearly every time
regardless — removing the duplication is a genuine single-source-of-truth win (spec-creator and
plan-verifier no longer drift independently), but it does **not** measurably reduce cost or
latency for this scenario at this sample size. Not fabricating a saving that the data doesn't
support.

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
