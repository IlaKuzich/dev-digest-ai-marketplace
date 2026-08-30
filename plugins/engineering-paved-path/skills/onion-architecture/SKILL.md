---
name: onion-architecture
description: "Use when adding or refactoring a Fastify server feature module — creating routes/service/repository, deciding where business logic, persistence, or an external integration belongs, wiring a new adapter through a DI container, or keeping the domain core free of DB/HTTP/SDK concerns. Trigger terms: onion architecture, layering, ports and adapters, dependency rule, composition root, container, adapter, repository layer, where does this code go."
---

# Onion Architecture (Fastify backend)

## Overview

A Fastify server organized as an onion: **dependencies point inward only.** The pure domain
core (shared contracts + port interfaces) knows nothing about your database, Fastify, or any
vendor SDK. Outer layers depend on inner ones through interfaces; a composition root is the
single place where concrete adapters are wired to those interfaces.

This is a **pattern skill** — adapt it to the feature and to your project's actual module
layout, but never invert the dependency rule. Violating the letter (a `service.ts` importing
a vendor SDK directly, a `repository.ts` exposing a raw DB row to a route) violates the
spirit.

## Layer map (outer → inner)

| Layer | Typically lives in | Role | May import |
|---|---|---|---|
| **Transport** (primary adapter) | `modules/<name>/routes.ts` | Fastify + schema validation: parse request, map status codes, delegate | service, shared contracts |
| **Application** (use case) | `modules/<name>/service.ts` (+ `helpers.ts`, `constants.ts`) | Business logic, orchestration; receives the DI container | ports, own repository, contracts, domain errors |
| **Persistence / Infra** (secondary adapters) | `modules/<name>/repository.ts`, `adapters/<port>/*` | The only code touching a DB table or a vendor SDK | your DB client, your schema, the port it implements |
| **Domain core** | a shared package/module of contracts | Validated schemas + **port interfaces** (e.g. `GitHubClient`, `LlmProvider`, `SecretsProvider`) | nothing — pure, zero side effects |
| **Composition root** | e.g. `platform/container.ts` | Wires concrete adapters → port interfaces, lazily; override-able in tests | everything |

The dependency rule in one line: **routes → service → (ports + repository); adapters
_implement_ ports; the container wires them.** Nothing flows the other way.

## The Dependency Rule (non-negotiable)

- The domain core imports **nothing** from the server's outer layers.
- `service.ts` depends on **port interfaces**, never concrete adapter classes — services
  receive the DI container; they never instantiate an adapter directly.
- A `repository.ts` is the ONLY place that touches its table, and every query is scoped to
  the correct tenant/workspace where multi-tenancy applies.
- Raw DB rows stay inside the repository/service; routes return DTOs mapped from the
  domain contract (a `toXDto` helper), never the raw row shape.

## Canonical module recipe

A feature module is a thin slice through all layers:

```
modules/<name>/
  routes.ts       # transport: parses the request, calls the service, maps status codes
  service.ts      # use case: class XService { constructor(private container: Container) {} }
  repository.ts   # persistence: class XRepository { constructor(private db: Db) {} }
  helpers.ts       # pure transforms (parse, map row → DTO) — no I/O
  constants.ts     # literals (job kinds, secret names, depths)
```

- **routes** declare a schema for `params`/`body` — no hand-rolled manual parsing.
- **service** calls ports off the container and its own repository.
- **repository** returns rows; **helpers** map rows → contract DTOs.

## Adding an external integration (a new port + adapter)

1. Define the **port interface** in the shared contracts module — it speaks the domain's
   language, not the vendor's (e.g. `GitClient`, not `SimpleGit`).
2. Implement the **adapter** under `adapters/<port>/<impl>.ts` (e.g. `adapters/github/octokit.ts`
   implements `GitHubClient`).
3. Wire it in the **composition root** as a lazy getter, resolving secrets via your
   secrets-provider abstraction (never a raw environment-variable read in feature code):
   ```ts
   get git(): GitClient {
     if (this.overrides.git) return this.overrides.git;   // tests inject mocks
     this._git ??= new SimpleGitClient(this.config.cloneDir);
     return this._git;
   }
   ```
4. Add an override slot to the container's test-overrides type so unit tests can inject a
   mock — no real network/DB access in hermetic tests.

## Quick reference — "where does this code go?"

| You're writing… | Put it in |
|---|---|
| HTTP status / request parsing | `routes.ts` |
| Business rule / orchestration / job handler | `service.ts` |
| A database query | `repository.ts` |
| Pure transform, URL parse, row→DTO map | `helpers.ts` |
| Call to an external API/LLM/git/filesystem | a **port** (interface in shared contracts) + **adapter** |
| Wiring a concrete impl to an interface | the composition root |
| A validated contract / shared type / port interface | the shared contracts module |

## Common mistakes

- **Service `new`s an adapter** (`new SomeConcreteClient(...)` inside `service.ts`). → Resolve
  it off the container; the container owns construction and secrets.
- **Route contains business logic** (loops, branching on domain state). → Move it to the
  service; routes only parse, delegate, and map status.
- **Repository leaks a raw DB row to the client.** → Map to a contract DTO first.
- **Cross-module reach-in** (importing another module's `repository.ts` directly). → Share
  cross-cutting repositories through the container, and cross-package code only through the
  designated shared-contracts boundary.
- **Domain core importing infra** (a contract file importing your ORM or framework package).
  → The core must stay pure; push the dependency outward to an adapter.
- **Reading a raw environment variable in feature code.** → Secrets via the
  secrets-provider abstraction; config via the app-config abstraction.

## When NOT to use this

- A pure computation/algorithm package with no DB/FS/network dependency doesn't need this
  layering — apply it to server feature modules that actually touch persistence, transport,
  or an external integration.
- One-off scripts and migrations don't need the full layering.
