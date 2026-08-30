---
name: next-best-practices
description: "Next.js best practices — file conventions, RSC boundaries, data patterns, async APIs, metadata, error handling, route handlers, image/font optimization, and bundling. Use when writing or reviewing Next.js App Router code."
---

# Next.js Best Practices

Apply these rules when writing or reviewing Next.js (App Router) code.

## File Conventions

- Routes live under `app/`; a route segment is a folder whose `page.tsx` renders it.
- Special files per segment: `layout.tsx` (persists across navigations within it),
  `loading.tsx` (Suspense fallback), `error.tsx` (error boundary), `not-found.tsx`,
  `route.ts` (a Route Handler instead of a page).
- Dynamic segments: `[slug]`; catch-all: `[...slug]`; optional catch-all: `[[...slug]]`.
- Route groups `(group)` organize routes without affecting the URL path.
- Private folders `_folder` are excluded from routing — the standard home for page-local
  colocated code.
- Parallel routes (`@slot`) and intercepting routes (`(.)`, `(..)`) enable modal-over-page
  and multi-pane layouts; always pair a parallel slot with a `default.tsx` fallback.
- Middleware (renamed `proxy` in Next.js 16) runs before a request reaches routing — use it
  for auth redirects, header rewriting, not business logic.

## RSC Boundaries

- Components are **Server Components by default**. Add `'use client'` at the interactive
  **leaf**, not the page root — pushing it down keeps the server-rendered tree as large as
  possible and avoids shipping unnecessary JS.
- An async **Client** Component is invalid — `async function Component()` with `'use client'`
  will not work as expected; do the async data fetching in a Server Component parent and
  pass the result down as a prop.
- Props crossing the Server→Client boundary must be **serializable** — no functions, class
  instances, or `Date` objects passed directly (pass a formatted string, or a Server Action
  reference for a function).
- Server Actions (`'use server'`) are the sanctioned way to call server logic from a Client
  Component; they get their own exception to the serializable-props rule for the action
  reference itself.

## Async Patterns (Next.js 15+)

- `params` and `searchParams` are **async** in the App Router — `await` them inside a
  Server Component or Route Handler before destructuring.
- `cookies()` and `headers()` are also async — `await cookies()` / `await headers()`.
- A codemod (`npx @next/codemod@latest next-async-request-api .`) automates this migration
  from pre-15 code.

## Runtime Selection

- Default to the **Node.js runtime** — it supports the full Node API surface.
- Use the **Edge runtime** only when you specifically need low-latency global execution and
  can live with its restricted API surface (no native Node modules, limited `fs`).

## Directives

- `'use client'` — marks a module's exports (and everything it imports) as Client
  Components.
- `'use server'` — marks a function as a Server Action, callable from the client.
- `'use cache'` — opts a function/component's output into the Next.js cache explicitly.

## Functions & Hooks

- Navigation hooks (`useRouter`, `usePathname`, `useSearchParams`, `useParams`) are
  Client-Component-only.
- Server-side data functions: `cookies()`, `headers()`, `draftMode()`, `after()` (schedule
  work after the response is sent, without delaying it).
- `generateStaticParams()` pre-renders dynamic routes at build time; `generateMetadata()`
  produces per-route `<head>` metadata, including from async data.

## Error Handling

- `error.tsx` catches errors in its segment and below; `global-error.tsx` is the last-resort
  root boundary (must render its own `<html>`/`<body>`).
- `not-found.tsx` renders on `notFound()`.
- `redirect()` / `permanentRedirect()` throw internally — call them, don't wrap in a
  try/catch that swallows the throw.
- `forbidden()` / `unauthorized()` are the dedicated auth-error helpers — prefer them over
  a manual redirect to a login page when the semantics are "you don't have access."
- `unstable_rethrow()` inside a `catch` block re-throws Next.js's internal
  redirect/not-found signals instead of swallowing them as a generic error.

## Data Patterns

- Prefer **Server Components** for reads, **Server Actions** for mutations, and **Route
  Handlers** only when you need a real HTTP endpoint (webhooks, non-Next.js clients).
- Avoid request waterfalls: kick off independent fetches with `Promise.all`, or use
  Suspense boundaries + `preload()` patterns so siblings don't block each other.
- A Client Component that needs server data goes through a data-fetching hook (e.g. a
  TanStack Query hook) — never a raw `fetch` scattered through component bodies.

## Route Handlers

- `route.ts` in a segment defines an HTTP endpoint; it cannot coexist with a `page.tsx` at
  the exact same segment if both define a `GET` — the Route Handler wins.
- Route Handlers run outside the React render tree — no access to React context or DOM APIs.
- Prefer a Server Action for a form submission from within the app; reach for a Route
  Handler when the caller isn't a page rendered by this app (a webhook, a third-party client).

## Metadata & OG Images

- Static metadata: export a `metadata` object. Dynamic: export an async
  `generateMetadata()` function that can read `params`/fetch data.
- File-based metadata (`favicon.ico`, `opengraph-image.tsx`, `robots.ts`, `sitemap.ts`) is
  auto-wired by convention.
- `next/og` generates Open Graph images from JSX at request or build time.

## Image Optimization

- Always use `next/image` over a raw `<img>` — automatic sizing, lazy loading, format
  negotiation.
- Configure `images.remotePatterns` for any external image domain.
- Set a `sizes` attribute for responsive images so the browser doesn't over-fetch.
- Use a blur placeholder for above-the-fold images; set `priority` on the LCP image.

## Font Optimization

- `next/font` self-hosts and inlines font-loading — no client-side font request waterfall.
- Works for Google Fonts and local font files; integrates with Tailwind via a CSS variable.
- Preload only the subsets/weights actually used.

## Bundling

- Some npm packages assume a browser or Node-only environment — check
  `serverExternalPackages`/`transpilePackages` config when a package breaks in one runtime.
- Import CSS via `import './styles.css'`, not a `<link>` tag.
- Common Node polyfills are already included for the Edge runtime where supported; verify
  before assuming an API is available there.
- Use the bundle analyzer (`@next/bundle-analyzer`) to find unexpectedly large client chunks.

## Scripts

- Use `next/script` instead of a native `<script>` tag for third-party scripts — it
  supports loading strategies (`beforeInteractive`/`afterInteractive`/`lazyOnload`).
- An inline script passed to `next/script` needs an `id`.
- `@next/third-parties` provides pre-built, optimized wrappers for common integrations
  (e.g. Google Analytics).

## Hydration Errors

Common causes: reading a browser-only API (`window`, `localStorage`) during render without
guarding it; using `Date`/`Math.random()` directly in JSX (differs between server and
client render); invalid HTML nesting (e.g. `<div>` inside `<p>`). Debug via the dev-mode
hydration error overlay, which points at the mismatched node.

## Suspense Boundaries

- `useSearchParams()` and `usePathname()` opt a Client Component out of static rendering
  (CSR bailout) unless wrapped in a `<Suspense>` boundary — wrap the component that calls
  them, not the whole page, to keep the rest statically rendered.

## Parallel & Intercepting Routes

- Modal-over-page pattern: a `@modal` parallel slot + an intercepting route (`(.)photo`)
  renders the modal on top of the current page for in-app navigation, while a direct URL
  visit renders the full page instead.
- Always provide `default.tsx` for a parallel slot so an unmatched sub-route doesn't 404
  the whole layout.
- Close a modal by calling `router.back()`, not by unmounting it manually — that keeps
  browser history correct.

## Self-Hosting

- `output: 'standalone'` produces a minimal deployable bundle for Docker.
- Multi-instance ISR needs a shared cache handler (e.g. Redis-backed) — the default
  filesystem cache handler doesn't coordinate across instances.
- Verify which features need extra setup outside a managed platform (image optimization,
  ISR revalidation, on-demand revalidation webhooks).

## Debug Tricks

- Next.js exposes an MCP-compatible debug endpoint in dev mode for AI-assisted debugging of
  build/runtime errors, where supported.
- `--debug-build-paths` rebuilds only the specified routes, useful for isolating a slow or
  failing page during a large build.
