# Engineering Paved Path

Reusable, project-agnostic engineering skills for the JavaScript/TypeScript ecosystem —
React, Next.js, Fastify, PostgreSQL/Drizzle, TypeScript, Zod, OWASP security, and Mermaid
diagramming. No agents, no hooks — just a shared skill library other plugins (and you,
directly) can pull from instead of re-writing the same best practices into every project or
every agent's prompt.

This is the "paved path": the set of practices a team has already agreed on, packaged so an
agent invokes them by name instead of re-deriving them from scratch (or getting them wrong)
on every task.

## What's in here

| Skill | Scope | What it covers |
|-------|-------|-----------------|
| [`react-best-practices`](skills/react-best-practices/SKILL.md) | Frontend | Component design, state/hooks anti-patterns, performance, accessibility |
| [`react-testing-library`](skills/react-testing-library/SKILL.md) | Frontend | RTL + Vitest testing philosophy, query priority, mocking, anti-patterns |
| [`next-best-practices`](skills/next-best-practices/SKILL.md) | Frontend | Next.js App Router — file conventions, RSC boundaries, async APIs, data patterns, metadata |
| [`client-project-structure`](skills/client-project-structure/SKILL.md) | Frontend | Where a component/hook/helper lives — page-local vs shared, RSC boundary, naming |
| [`fastify-best-practices`](skills/fastify-best-practices/SKILL.md) | Backend | Routes, plugins, schema validation, error handling, hooks, auth, testing |
| [`onion-architecture`](skills/onion-architecture/SKILL.md) | Backend | Layering, ports & adapters, the dependency rule, DI container, "where does this code go" |
| [`drizzle-orm-patterns`](skills/drizzle-orm-patterns/SKILL.md) | Backend | Schema, queries, relations, transactions, migrations across SQL dialects |
| [`postgresql-table-design`](skills/postgresql-table-design/SKILL.md) | Backend | Data types, indexing, constraints, partitioning, performance patterns |
| [`security`](skills/security/SKILL.md) | Full-stack | OWASP Top 10:2025 — access control, injection, secrets, auth, file uploads |
| [`zod`](skills/zod/SKILL.md) | Full-stack | Schema definition, parsing, type inference, error handling, composition |
| [`typescript-expert`](skills/typescript-expert/SKILL.md) | Full-stack | Type-level programming, performance, migrations, monorepo tooling |
| [`mermaid-diagram`](skills/mermaid-diagram/SKILL.md) | Shared | Flowcharts, sequence/class/ER/state diagrams embedded in markdown |

Every skill here is invoked **on demand** — Claude loads a skill's content when its
`description` matches what you're doing, or when another agent's `skills:` frontmatter
preloads it by name. None of them run automatically or all at once.

## Using it standalone

Install this plugin on its own if you just want the practices, with no SDD pipeline attached:

```
/plugin install engineering-paved-path@dev-digest-ai-marketplace
```

Then either let Claude pick up a skill automatically (its `description` is written as a
trigger condition — "use when writing/reviewing a Fastify route", etc.), or invoke one
explicitly:

```
Use the onion-architecture skill to review where this new integration should live.
```

## Using it from another plugin (namespaced references)

Any other installed plugin can reference a skill here by its **namespaced** name —
`<plugin-name>:<skill-name>` — never the bare skill name, since a bare name is ambiguous
once more than one plugin is installed:

```yaml
# in another plugin's agent frontmatter
skills:
  - engineering-paved-path:security
  - engineering-paved-path:typescript-expert
  - engineering-paved-path:zod
```

```markdown
<!-- inside another plugin's SKILL.md body -->
Invoke `engineering-paved-path:onion-architecture` before wiring the new adapter.
```

This is exactly how the `sdd-engineering` plugin's agents pull in these practices — see its
README for the full skill→area map. If `engineering-paved-path` is not installed, a
namespaced reference to it simply won't resolve; the calling agent should treat that as "this
practice wasn't applied," not crash.

## Requires

None. This plugin has no dependencies of its own — it's the plugin other plugins depend on.

## Adding a new skill here

1. Create `skills/<name>/SKILL.md` with YAML frontmatter (`name`, `description` written as a
   trigger condition, third person) and the skill body.
2. Add a row to the table above with its scope (Frontend / Backend / Full-stack / Shared).
3. If an agent in another plugin should have this skill **preloaded** (always in context,
   not just on-demand), that agent's own `skills:` frontmatter references it by the
   namespaced name — this plugin doesn't control who preloads it.

## Status

Initial release — `1.0.0`. Skills are adapted from an internal engineering conventions set
and trimmed to be project-agnostic; none reference a specific product's file layout.
