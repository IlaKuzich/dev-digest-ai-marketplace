# Architecture Review

A single, read-only subagent — **`architecture-reviewer`** — that judges a diff purely on
whether it respects your project's architectural boundaries: the onion dependency rule and
DI-container usage on the backend, and colocation + the Server/Client Component boundary on
a Next.js frontend.

It is not a general code-quality reviewer. It has one job: **does this diff move a
responsibility to the wrong layer, or wire a dependency the wrong way?**

## What it checks

1. **Onion dependency direction** — nothing in the domain core imports from an outer layer
   or a concrete adapter.
2. **DI container usage** — services resolve adapters from the composition root, never `new`
   one directly; secrets go through the project's secrets abstraction, never a raw env read.
3. **Repository / tenancy / DTO boundary** — one module doesn't reach into another's table;
   a raw DB row never leaks past the service boundary.
4. **Route vs service placement** — business logic lives in the service layer, not the
   transport/route layer.
5. **Client colocation & the RSC boundary** — server state flows through a data-fetching
   hook, `'use client'` sits at the interactive leaf, and page-local code isn't
   prematurely globalized (or left duplicated when it should be shared).
6. **Cross-package boundaries** — shared code crosses through one designated contracts
   module, never a direct cross-package import.

It reads your repository's own architecture documentation first (`ARCHITECTURE.md`,
`docs/architecture.md`, or an architecture section in `CLAUDE.md`/a README) if one exists —
that becomes the authority on your actual module layout. Absent one, it assumes an
illustrative Fastify + PostgreSQL backend / Next.js App Router frontend shape and says so
explicitly whenever a finding rests on that assumption rather than a documented rule.

## Verdict and severity

Exactly three severities — **CRITICAL** (blocks merge), **WARNING**, **SUGGESTION** — and
the verdict (`approve` / `comment` / `request_changes`) is a pure function of the findings:
no findings means approve, always. It never pads a report to look thorough, and it never
re-derives a mechanical check (a forbidden config file, a grep-catchable import) that your
own pre-push review process already owns — its value is the semantic judgment a grep can't make.

## Installing and using it

```
/plugin install architecture-review@dev-digest-ai-marketplace
```

```
Use the architecture-reviewer subagent to review this diff for architectural issues.
```

It's read-only (`permissionMode: plan`, no `Edit`/`Write` in its tool list) — safe to run
against any diff without risk of it touching your files.

## Requires

- **`engineering-paved-path`** (`^1.0.0`) — this agent preloads four of its skills by
  namespaced reference: `engineering-paved-path:onion-architecture`,
  `engineering-paved-path:client-project-structure`, `engineering-paved-path:typescript-expert`,
  `engineering-paved-path:security`. These skills **are** the rule-sets its findings cite by
  section. Without `engineering-paved-path` installed, the preload silently fails to resolve
  and the agent has no rule-set to cite findings against — install both together.

## Using it from another plugin

Spawn it by its namespaced name: `architecture-review:architecture-reviewer`. This is how
`sdd-engineering`'s `run-plan` skill uses it — as a fix-loop gate between implementation and
final verification, run read-only on the accumulated diff before tests are written against
the current shape of the code. See that plugin's README for the full pipeline.

## Evals

`evals/checkout-diff-flags-violations/` and `evals/benign-refactor-approves/` — two cases
using Claude Code's native eval convention (`prompt.md` + `graders/criteria.md`, run via
`claude plugin eval`), verified against real diffs to actually discriminate prompt quality:
does the agent cite the specific rule broken and avoid inventing an unrelated finding on a
diff with one real issue, and does it stay quiet (empty findings, `approve`) on a diff with
none. `claude plugin eval` is early-access as of Claude Code 2.1.206 — see this plugin's
`COMPATIBILITY.md`. `evals/` is not part of this plugin's runtime surface — an installer
never loads it; it exists for whoever maintains this plugin to catch a prompt regression
before shipping a new version.

## Status

Initial release — `1.0.0`. Adapted from an internal architecture-review agent: the source
project's own module/class names removed, the underlying stack (Next.js + Fastify + JS/TS ecosystem)
kept, and the "which repo's rules apply" question resolved by reading repo-local docs
instead of assuming one hardcoded layout.
