---
name: run-plan
description: Use to execute an ALREADY-APPROVED spec and its ALREADY-WRITTEN Implementation Plan — the build half of this project's Spec-Driven-Development chain. Gates the plan (plan-verifier Mode A), runs N × implementer by file ownership, then architecture-review:architecture-reviewer with a bounded fix loop, plan-verifier Mode B, and pr-self-review. Invoke via /run-plan with a spec path and a plan path, or when the user says to build/implement an existing spec or plan. It does NOT write the spec or the plan — spec-creator and implementation-planner are run manually, by hand, before this. This skill ORCHESTRATES agents and is never preloaded into a subagent's `skills:` list.
---

# /run-plan — execute an approved spec + plan

You are the **orchestrator** of the build half of this project's SDD chain. You do not write
the spec, the plan, the code, or the tests — each has an agent that owns it. Your job is to
route work between them, keep the fix loop bounded and warm, and stop at the one human gate.

**This skill starts where the thinking has already been done.** `spec-creator` and
`implementation-planner` are run **manually, by hand**, outside this skill — deliberately, so
a human sits with the *what/why* and the *how* before any agent spends tokens on code. Do not
invoke either of them here, and do not paper over their absence:

| You find | Do NOT | Do |
|---|---|---|
| No spec, or `Status: draft` | Write one, or flip the bit | **Stop.** Tell the user to run `spec-creator` and ratify it |
| No plan | Sketch tasks yourself | **Stop.** Tell the user to run `implementation-planner` |
| Spec and plan disagree | Pick a reading | **Stop at Phase 1** — that is Mode A's job, not yours |

Writing a plan inline "just to get moving" is the failure this split exists to prevent: it
puts the design decision in the context least equipped to make it and least likely to be
read by a human.

**Read this plugin's [`README.md`](../../README.md) before Phase 1 and treat it as
authoritative.** It owns the workflow diagram, the fix-loop routing table, the four
enforcement points of the spec → plan → code chain, and the token-discipline rules. This
skill is the runbook for the phases it still covers; where the two disagree, the README wins
and this file is the thing to fix.

## Input

Arguments arrive as `$ARGUMENTS` when invoked as `/run-plan`; otherwise take them from what
the user asked for. Both paths are required — find them, don't guess them:

| Form | Means |
|---|---|
| `--spec <path>` | The approved spec. **Read it first**; if `Status:` is not `approved`, stop (see above) |
| `--plan <path>` | The Implementation Plan from `docs/plans/` |
| `--from <phase>` | Resume an interrupted run (`implement`, `review`, `verify`). Requires the earlier phases' artifacts on disk — check, don't assume |

If either path is missing, look for the obvious candidate (`specs/`, `<pkg>/specs/`,
`docs/plans/`) and **confirm it with the user before starting**. Running the wrong plan is
expensive and silent. If nothing plausible exists, say which step is missing.

## Before you start — announce the plan

One short paragraph: which phases will run, that the run stops at the final report before any
push, and what you resolved for the spec and plan paths. A user who sees where you will come
back does not have to guess whether the run is stuck.

---

## Phase 1 — 🅰️ Plan gate (`plan-verifier` Mode A)

Spawn `plan-verifier`, **naming Mode A explicitly** — it runs at two different points and its
report leads with which mode it chose.

Mode A reads two markdown files (spec + plan) and answers one question: does every `AC-N`
appear in the plan's `## Criteria coverage` table, mapped to a task? It needs no `Bash` and
no code. This is the cheapest phase in the run and it guards the most expensive defect, so
**never skip it to save a spawn** — even when the plan was written by hand minutes ago. The
planner cannot catch an `AC-N` its own plan dropped; that is the whole reason this gate has
fresh eyes.

| Verdict | You do |
|---|---|
| Every AC scheduled | Go to Phase 2 |
| Any AC unscheduled | **Do not spawn implementers.** Report it to the user — the planner is theirs to re-run — then re-check the amended plan with the same warm plan-verifier |

Past this point, N implementers have already built the wrong scope.

---

## Phase 2 — Implement (`implementer` × N)

The plan states whether it was written for a **multi-agent** parallel run or a
**single-agent** pass. Follow it; that decision was made with the user at planning time.

**Multi-agent:** one implementer per task, spawned in parallel — but only where tasks are
genuinely independent. If task B hard-depends on task A's exports, give both to one
implementer warm: you lose no wall-clock (B could never overlap A) and save a cold start.

There is **no worktree isolation** — collision-freedom rests entirely on the plan's disjoint
file ownership. Pass each implementer its task's `Owns` list and nothing else's.

**Single-agent:** one implementer executes the ordered tasks in one warm context.

Each implementer self-verifies by making its task's `Verify` command green — pass it through
verbatim and do not let an implementer report done without it.

### Keep a roster — this is the load-bearing bit

Record, and carry through the rest of the run:

| Task | Implementer agent ID | Owned files |
|---|---|---|

Every later fix routes by **which agent owns the file**. Without the roster you cannot honour
that rule, and you will cold-spawn a fresh agent to fix code it has never seen. Do not let
the roster fall out of context — restate it compactly if the run gets long.

---

## Phase 3 — Architecture review + the fix iterations

Spawn `architecture-review:architecture-reviewer` on the diff. It is read-only and judges
product code. If this dependency plugin isn't installed, say so plainly, skip the phase with
a warning in the final report, and proceed — do not fail the whole run for a missing
optional gate, but never silently skip it either.

### The fix loop (bounded, warm, owner-routed)

Expect findings — this phase is normally two or three passes, not one. Run it like this:

1. **Triage by severity.** `CRITICAL` and `WARNING` get fixed. `SUGGESTION` is recorded in
   your final report and **not** fixed — polishing to a clean report is how this loop stops
   terminating.
2. **Fix goes to the owner.** Group the findings by file, then `SendMessage` each group to
   the **warm implementer that owns that file** (your Phase 2 roster). Never cold-spawn: that
   agent already holds the module's context, and a fresh one pays the full cold start to
   arrive at a worse answer.
3. **Re-check goes to the finder.** `SendMessage` the **same** architecture-reviewer that
   raised the findings. It already knows what it was looking for; a fresh reviewer re-derives
   a different opinion and you never converge.
4. **Bound it.** If the same finding survives **two** fix attempts, stop and put it to the
   user. A finding that will not die usually means the requirement is wrong, not the code —
   and that is the one thing no agent in this chain may decide.

Report each pass to the user in one line (`pass 2: 1 CRITICAL fixed, 2 SUGGESTIONs noted`) so
the loop is visible while it runs. Proceed when no CRITICAL or WARNING remains.

---

## Phase 4 — 🅱️ Full trace (`plan-verifier` Mode B)

Spawn `plan-verifier`, **naming Mode B explicitly**. It traces `AC-N → Task → code → test`
from the spec — not from the plan, because a plan cannot report the requirement it never
scheduled.

| Verdict | You do |
|---|---|
| **MISSING** — no code | A real gap. Route it (table below) |
| **PARTIAL** — code, no test | Collect into the final report's **test debt** list |
| **PASS** | Nothing |

**The test debt list is the deliverable** of this phase whenever it's non-empty — the moment
nobody reads it, an untested behavior has quietly become a decision to ship untested code.
Report it every run, even when it is long.

Route each real gap by **what kind it is**, not by who found it:

| Gap | Who fixes it | Who re-checks |
|---|---|---|
| **Plan-level** — a Task's Steps/Verify unmet | The warm implementer that owns that Task, via `SendMessage` | The same plan-verifier, via `SendMessage` |
| **Spec-level** — an `AC-N` no Task covered, or a Non-goal that got built | **Nobody here — the plan is wrong.** Stop and report: the user re-runs `implementation-planner` | plan-verifier **Mode A** on the amended plan, then Mode B again |
| A criterion that is simply wrong or unbuildable | **The user.** A new spec that `Supersedes:` the old one — never an edit in place | The chain, from the top |

Do not hand a spec-level gap to an implementer as a coding task. No Task owns those files, so
it would either work unowned or reach into another agent's `Owns`, and the plan stays
permanently out of sync with the code.

The same bound applies: two failed attempts on the same gap ⇒ take it to the user.

---

## Phase 5 — PR gate

Invoke the `pr-self-review` skill — the broad pre-push gate. `plan-verifier` and
`architecture-review:architecture-reviewer` complement it on their narrow axes; none of them
replaces it.

### 🚦 GATE — the final report (a human, always)

**Stop here. Do not push, do not open a PR** unless the user explicitly asked this run to.
Report:

- The spec path + ID, the plan path, and the final `AC-N` coverage verdict.
- What was built, by which tasks.
- The architecture-review outcome (or "skipped — plugin not installed"), including every
  `SUGGESTION` you deliberately did not fix.
- **The test-debt list** — every PARTIAL from Phase 4. Not an appendix; a section.
- Anything a gate escalated and how it was resolved.
- Any cross-cutting lesson only visible from the orchestrator's seat (spanning multiple
  tasks/agents, or about the run itself) that no single implementer could have surfaced.

Then ask whether to push / open the PR.

---

## Phase 6 — Insights

Each **implementer** already appends its own module-local lessons directly to that module's
learning log during Phase 2 (if the repo keeps one) — this is intentional, not a gap;
`implementer.md` preloads `engineering-insights` for exactly this. Phase 6 is **your** pass,
not a re-delegation: invoke the `engineering-insights` skill yourself to capture whatever a
single implementer's local context couldn't see — a lesson spanning two tasks' files,
something the fix loop or a gate surfaced that no task owns, or a process observation about
the run itself. Don't skip this step.

**Caveat:** when 2+ implementers touching the SAME package run in parallel, each may append
to that package's learning log in the same window — treat a lost or conflicted append after
a parallel wave as a live risk to flag, not a one-off.

---

## Phase 7 — Retro (when the run was expensive, surprising, or novel)

Phase 6 captures what this run learned about the **code**. The `workflow-retro` skill
captures what it learned about **this chain** — actual token spend, the agent roster, which
fixes went to a cold spawn instead of the warm owner, and whether the gates above earned
their cost. It reads this session's own transcripts, so the numbers are measured rather than
remembered.

Not every run needs it (see that skill's "When NOT to run this"). Run it when the chain was
costly, thrashed, or exercised something new. It reports; it never edits the workflow.

## Running economically

Cold starts and verbose reports cost far more than the code does — a fresh subagent re-reads
context and the target files before doing any work, and its final report sits in your
context on **every** subsequent turn. So:

- **Never cold-spawn for a follow-up.** Every fix, re-review, and clarification in this
  runbook is a `SendMessage` to a warm agent. That is why the roster exists.
- **Do small work inline.** A one-line wiring fix or a config tweak is cheaper done yourself
  than shipped to an agent that must first re-derive the context to make it.
- **Ask for terse, structured returns** — verdict + bulleted findings + `file:line`. Reserve
  the full traceability matrix for plan-verifier, where the matrix *is* the deliverable.
- **Match gate weight to risk.** The architecture-reviewer earns its cost on a diff that
  crosses module boundaries or touches auth/tenancy. On a change with no such surface, say
  you are lightening it and why — don't run a heavy gate as a formality, and don't skip one
  silently.

## Requires

- **`architecture-review`** (`^1.0.0`) — Phase 3 spawns `architecture-review:architecture-reviewer`.
  Not installed ⇒ Phase 3 is skipped with a warning, not a hard failure.
- **`engineering-paved-path`** (`^1.0.0`) — the agents this skill orchestrates preload its
  skills. Not installed ⇒ those agents run without the practices it would have applied.
- **`research-tools`** (`^1.0.0`) — used by `spec-creator`, upstream of this skill, not by
  `run-plan` itself.

## Why this skill is never preloaded into an agent

Every skill in `engineering-paved-path` describes a **practice**. This one describes an
**orchestration**, and no agent writes by it. Preloading it into a subagent would hand a
worker the instructions for running the whole chain — including spawning more agents, which
most of these agents structurally cannot do and none of them should. It belongs to the
top-level context only.

## Two rules that outrank everything above

- **`AC-N` IDs are permanent.** The plan's coverage table, each Task's `Satisfies:`, and both
  verifier passes all join on them. Renumbering one re-points every reference at a
  requirement that changed underneath it — while the traceability still *looks* intact.
  Changing an agreed criterion means a new spec that `Supersedes:` the old one, never an edit
  in place.
- **Every gate can fail, and a gate whose failure path is undefined is not a gate.** If
  something happens that this runbook does not cover, route it by the README's principle —
  fix goes to the owner, re-check goes to the finder, and a requirement that keeps failing
  goes to the user — rather than inventing a shortcut past it.
