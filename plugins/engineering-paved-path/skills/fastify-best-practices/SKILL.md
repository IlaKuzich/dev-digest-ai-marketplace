---
name: fastify-best-practices
description: "Guides development of Fastify Node.js backend servers and REST APIs using TypeScript or JavaScript. Use when building, configuring, or debugging a Fastify application — routes, plugins, JSON Schema validation, error handling, auth, CORS/security headers, database integration, WebSockets, or production deployment."
---

# Fastify Best Practices

## Quick Start

```ts
import Fastify from 'fastify'

const app = Fastify({ logger: true })

app.get('/health', async (request, reply) => {
  return { status: 'ok' }
})

await app.listen({ port: 3000, host: '0.0.0.0' })
```

## Core Principles

- **Encapsulation** — Fastify's plugin system automatically scopes decorators, hooks, and
  routes registered inside a plugin to that plugin's subtree, unless explicitly marked
  global. Register a feature as a plugin (`fastify-plugin` to opt out of encapsulation when
  a decorator genuinely needs to be app-wide).
- **Schema-first** — every route declares a JSON Schema (or a Zod schema via a type
  provider) for `params`/`querystring`/`body`/`response`. This both validates input and
  drives fast, ahead-of-time response serialization — never hand-roll `Schema.parse(req.body)`
  inside a handler when the route-level schema already does it.
- **Async/await everywhere** — every handler and hook supports `async`; return the payload
  or call `reply.send()`, don't mix callback-style with a returned promise in the same
  handler.
- **Minimal dependencies** — prefer Fastify's built-in features and official `@fastify/*`
  plugins over ad-hoc middleware ported from another framework.

## Plugins & Routes

- One plugin per feature/module; register routes inside it so its middleware/hooks/decorators
  stay scoped to that feature.
- A route handler should parse (via schema), delegate to a service/use-case function, and
  map the result to a status code — it should not contain business-logic branching itself.
- Use `fastify.register(plugin, { prefix: '/api/things' })` to namespace a feature's routes.

## Schema Validation & Serialization

- Define `schema: { params, querystring, body, response }` on every route. The `response`
  schema also drives serialization — Fastify serializes faster when it knows the exact
  output shape, and it strips any field not declared in the response schema (a useful
  safety net against accidentally leaking an internal field).
- With a TypeScript type provider (e.g. `@fastify/type-provider-json-schema-to-ts`, or a
  Zod-based provider), the request/response types are inferred from the schema — no
  separate hand-written interface to keep in sync.

## Error Handling

- Register a single `setErrorHandler` for consistent error-response shape across the app.
- Use `fastify.httpErrors` (via `@fastify/sensible`) or throw a typed error class the error
  handler recognizes — avoid `reply.code(500).send(...)` scattered ad hoc across handlers.
- Return a generic message in production; log the full error server-side always.

## Hooks & Request Lifecycle

- Lifecycle hooks run in this order: `onRequest` → `preParsing` → `preValidation` →
  `preHandler` → handler → `preSerialization` → `onSend` → `onResponse`.
- Auth checks belong in `preHandler` (schema validation has already run by then) or
  `onRequest` if you want to reject before body parsing.
- Register a hook at the plugin level to scope it to that plugin's routes only, or at the
  root instance to make it global.

## Authentication & Authorization

- Implement auth as a `preHandler` hook applied via `fastify.addHook` at the plugin/route
  level — never per-route ad hoc, so it can't be forgotten on a new route.
- Decorate the request with the authenticated principal (`fastify.decorateRequest('user',
  null)` + set it in the hook) so handlers read `request.user`, not re-derive it.

## Testing

- Use `app.inject({ method, url, payload })` instead of starting a real HTTP server — it's
  fast and avoids port binding in CI.
- Build the app via a factory function (`buildApp({ config, overrides })`) so tests can
  inject mock adapters instead of hitting real external services.

## Performance

- Fastify's schema-based serialization is the single biggest performance lever — always
  define response schemas on hot routes.
- Avoid heavy synchronous work inside a hook that runs on every request.
- Use `fastify.decorate` to memoize any expensive-to-construct dependency rather than
  building it per-request.

## Logging

- Fastify ships with Pino built in (`logger: true`) — structured JSON logs by default.
- Log at `request.log` inside a handler so entries are automatically correlated with a
  request id.
- Redact sensitive fields (`authorization`, `password`) via Pino's `redact` option, not
  manual string manipulation.

## TypeScript Integration

- Fastify 4+ supports type providers that infer request/response types directly from the
  route's JSON Schema (or a Zod schema) — prefer this over manually typing `FastifyRequest<...>`.
- Type a plugin with `FastifyPluginAsync` for correct `fastify`/`opts`/`done` typing.

## Decorators

- `fastify.decorate` for app-level values/functions (e.g. a database client).
- `fastify.decorateRequest` / `decorateReply` for per-request additions (e.g. the
  authenticated user) — always give a default value in the decoration call so TypeScript
  and runtime agree on the property's presence.

## Content-Type & Serialization

- Fastify parses `application/json` by default; register `addContentTypeParser` for any
  other content type (e.g. `multipart/form-data` via `@fastify/multipart`).
- A route's `response` schema controls output serialization — a field not declared there is
  silently stripped, which is usually what you want for security but can surprise a
  handler author who forgot to declare a new field.

## CORS & Security Headers

- `@fastify/cors` with an explicit origin allowlist — never a wildcard combined with
  credentialed requests.
- `@fastify/helmet` for standard security headers.
- `@fastify/rate-limit` for per-route or global rate limiting.

## WebSockets

- `@fastify/websocket` registers a WebSocket route alongside normal HTTP routes on the same
  Fastify instance — no separate server needed.

## Database Integration

- Register the database client as a plugin that decorates `fastify` with the client/pool,
  so every route accesses it via `fastify.db`/`request.server.db` rather than importing a
  singleton module directly — this is what makes it swappable in tests.

## Configuration

- Load and validate environment configuration once at startup (`@fastify/env` or a
  hand-rolled schema check) — fail fast on missing/invalid config rather than discovering
  it mid-request.

## Deployment

- Set `logger` to a production-appropriate level and enable Pino's pretty-print only in
  development.
- Run behind a reverse proxy with `trustProxy: true` if you need the real client IP for
  rate limiting or logging.
