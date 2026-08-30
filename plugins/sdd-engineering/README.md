# Spec-Driven Development Engineering

A Spec-Driven Development (SDD) agent pipeline: four agents that turn a feature idea into
shipped, traced, tested code, plus two orchestration skills that run the build and grade the
run afterward.

```
research-tools:researcher (optional) → spec-creator → implementation-planner
  → plan-verifier (Mode A) → implementer × N → architecture-review:architecture-reviewer
  → plan-verifier (Mode B) → pr-self-review → a human → push
```

## Catalog

| Component | Type | Model | Write scope | Role |
|---|---|---|---|---|
| [`spec-creator`](agents/spec-creator.md) | agent | opus | `specs/**`, `<pkg>/specs/**` (hook-enforced) | WHAT & WHY — EARS acceptance criteria, six-category interview |
| [`implementation-planner`](agents/implementation-planner.md) | agent | opus | `docs/plans/**` (hook-enforced) | Requirements review → task contracts (HOW) |
| [`implementer`](agents/implementer.md) | agent | sonnet | files its task owns | Executes ONE task, self-verifies, writes code |
| [`plan-verifier`](agents/plan-verifier.md) | agent | sonnet, read-only | nothing | Traces spec → plan → code → test (Mode A / Mode B) |
| [`run-plan`](skills/run-plan/SKILL.md) | skill | — | orchestrates only | Executes an approved spec + plan end to end |
| [`workflow-retro`](skills/workflow-retro/SKILL.md) | skill | — | `docs/agent-runs/**` | Manual-only — grades a finished run's cost and routing |
| [`engineering-insights`](skills/engineering-insights/SKILL.md) | skill | — | project's `INSIGHTS.md` files | Append-only code-lesson log, generalized (no fixed module names) |
| [`pr-self-review`](skills/pr-self-review/SKILL.md) | skill | — | `.claude/.pr-self-review-state.json` | Pre-push gate: routes the diff through domain skills |

`spec-creator` and `implementation-planner` are run **manually, by hand**, before `run-plan`
— deliberately, so a human sits with the *what/why* and the *how* before any agent spends
tokens on code. `run-plan` refuses to write either for you.

## Requires

- **`engineering-paved-path`** (`^1.0.0`) — every agent here preloads its technical skills by
  namespaced reference (`engineering-paved-path:security`, `:zod`, `:onion-architecture`, …).
  Not installed ⇒ the preload silently fails to resolve; the agent still runs, but without
  that practice applied. Install both together.
- **`research-tools`** (`^1.0.0`) — `spec-creator` spawns `research-tools:researcher` for any
  external fact it isn't allowed to guess (a library capability, a standard, a competing
  product's behavior). Not installed ⇒ `spec-creator` can't resolve that kind of question and
  will leave it as `[NEEDS CLARIFICATION]` instead.
- **`architecture-review`** (`^1.0.0`) — `run-plan`'s Phase 3 spawns
  `architecture-review:architecture-reviewer` as a fix-loop gate. Not installed ⇒ Phase 3 is
  skipped with an explicit warning in the run's report, never silently.

None of these are enforced by the plugin system itself — there is no dependency-resolution
mechanism in Claude Code's plugin loader. `plugin.json`'s `dependencies` field records the
same version contract structurally, alongside this prose, but the actual behavior above
(preload fails quietly, `spec-creator` degrades to asking, Phase 3 warns and skips) is what
actually happens if you install this plugin alone.

## Why this order (two decisions that aren't obvious)

**`plan-verifier` runs twice, in two different modes.** Mode A (spec ⇄ plan, two file reads,
no `Bash`) gates the plan *before* anyone writes code: an `AC-N` the plan forgot to schedule
is the workflow's most expensive defect, and catching it needs no code at all. Mode B (the
full `AC-N → Task → code → test` trace) runs last, after implementation and architecture
review — it **cannot** move earlier, because its rule "an AC with code but no test is
PARTIAL" would mark everything PARTIAL before any code exists, producing a report that is
noise.

**`architecture-reviewer` runs BEFORE tests are written**, not after. It judges product code,
not tests, so it loses nothing by running early — and it gains a lot: a CRITICAL finding
("resolve this adapter from the container instead of `new`") changes the code's shape, and
any test written against the old shape has to be rewritten. Review → fix → test is strictly
cheaper than test → review → fix → re-test.

## The fix loop (what happens when a gate reports a problem)

| Finding | Who fixes it | Who re-checks |
|---|---|---|
| `architecture-reviewer` CRITICAL / WARNING | The **implementer that owns the file**, resumed via `SendMessage` | The **same** architecture-reviewer, via `SendMessage` |
| `plan-verifier` Mode B **plan-level** gap (a Task's Steps/Verify unmet) | The **implementer that owns that Task**, resumed via `SendMessage` | The same plan-verifier, via `SendMessage` |
| `plan-verifier` Mode B **spec-level** gap (an `AC-N` no Task covered) | **Nobody — re-plan.** Back to `implementation-planner` (warm), then spawn an implementer for the new task | plan-verifier Mode A on the amended plan, then Mode B again |
| `plan-verifier` Mode A: an unscheduled `AC-N` | `implementation-planner`, warm, before any implementer spawns | plan-verifier Mode A again |
| An `AC-N` with code but no test (PARTIAL) | Written by the owning implementer if the plan's `Owns` names the test file; otherwise it's a plan defect | plan-verifier Mode B |
| A criterion that turns out to be wrong / unbuildable | **The user.** A new spec that `Supersedes:` the old one — never an edit in place | The chain, from the top |

Three rules make the loop terminate and stay honest:

- **Fix goes to the owner; re-check goes to the finder.** Both are `SendMessage` to a warm
  agent, never a fresh spawn. A cold respawn pays the full cold start to arrive at a worse
  answer.
- **A spec-level gap is not a coding task.** No Task owns those files, so handing it to an
  implementer means it either works unowned or reaches into someone else's `Owns`. Re-plan
  first.
- **Bound the loop.** If the same finding survives two fix attempts, stop and put it to the
  user. A gate that keeps failing usually means the requirement is wrong, not the code.

## The spec → plan → code chain (four enforcement points)

| Point | Agent | Rule |
|---|---|---|
| Question → guess | `spec-creator` | Never guesses; unresolved requirements become `[NEEDS CLARIFICATION]` and go back to the user |
| `draft` → `approved` | **a human** | `spec-creator` writes `draft` and **never** raises it. Only the user's explicit yes flips the bit |
| `draft` → plan | `implementation-planner` | **Refuses to plan** a spec that is `draft` or has an open `[NEEDS CLARIFICATION]`; every `AC-N` must appear in the plan's `## Criteria coverage` table |
| Plan → code | `plan-verifier` **Mode A** | Fresh eyes on that coverage table **before** implementers spawn |
| Code → merge | `plan-verifier` **Mode B** | Every `AC-N` must reach code **and a test** |

The load-bearing convention that ties them together: **`AC-N` IDs are permanent.** Changing
an agreed criterion means a **new spec that `Supersedes:` the old one**, never an edit in place.

## Insights (learning logs)

If the target project keeps a per-package `INSIGHTS.md` (or adopts one), the agents use a
hybrid strategy: `spec-creator` and `implementation-planner` **read** it but never write to
it — their write scope is confined to specs/plans respectively, so a new lesson goes out in
their report instead. `implementer` reads only its **module-local** log on site and can
append a new lesson via the `engineering-insights` skill. `run-plan`'s Phase 6 is the
orchestrator's own pass, for a lesson no single implementer's local context could see.

## Orchestrating economically

Delegation is not free — a fresh subagent cold-starts (re-reading conventions and target
files before doing any work) and its final report lands verbatim in the orchestrator's
context, re-sent on every later turn. So: don't spawn a cold agent for small work; reuse a
warm agent via `SendMessage` instead of respawning for a follow-up; ask for terse, structured
returns; match gate weight to actual risk. See [`run-plan`](skills/run-plan/SKILL.md)'s
"Running economically" section for the full reasoning.

## Installing and using it

```
/plugin install sdd-engineering@dev-digest-ai-marketplace
/plugin install engineering-paved-path@dev-digest-ai-marketplace
/plugin install research-tools@dev-digest-ai-marketplace
/plugin install architecture-review@dev-digest-ai-marketplace
```

1. Ask `spec-creator` to write a spec for your feature. Read it. When you agree it's
   complete, flip its `Status:` to `approved` yourself — the agent never does this for you.
2. Ask `implementation-planner` to turn the approved spec into an Implementation Plan.
   Answer its execution-mode question (multi-agent vs single-agent) and any gaps it surfaces.
3. Run `/run-plan --spec <path> --plan <path>` to build it. The run stops at a human gate
   before any push.
4. Occasionally, after an expensive or surprising run, type `/workflow-retro` to see what it
   actually cost and whether the gates earned their keep.

## Cost

Model choice per agent and rough per-run token order-of-magnitude are tracked centrally in
this marketplace's `docs/COST-BASELINE.md` — not duplicated here, since it's a cross-plugin
concern the marketplace maintainers keep current.

## Status

Initial release — `1.0.0`. Adapted from an internal SDD pipeline: source-project-specific
paths, package names, and class names removed and replaced with either namespaced references to
`engineering-paved-path`/`research-tools`/`architecture-review`, or explicit "if the repo has
one" framing for conventions (a learning log, a conventions doc) this plugin can't assume
every installer's project already keeps.
