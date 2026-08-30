---
name: react-best-practices
description: "Modern React best practices and anti-pattern catalog. Use when writing, reviewing, or refactoring React components, hooks, and state management. Covers component design, state patterns, hooks misuse, performance, data fetching, and code organization."
---

# React Best Practices & Anti-Patterns

Modern React conventions — what to do and what to avoid.

## Severity Levels

- **CRITICAL** — will cause bugs, broken reconciliation, or maintenance nightmares.
- **HIGH** — will cause performance issues or scaling problems.
- **MEDIUM** — will hurt maintainability or developer experience.

## Component Design (CRITICAL)

- Components must be pure — same inputs = same outputs, no side effects during render.
- Business logic lives in hooks/helpers, NOT in component bodies.
- Container components fetch data; presentational components receive props and render UI.
- Helper functions extracted OUTSIDE the component body.
- Max ~200 lines per component — split if larger.
- Max 5-7 props — more suggests the component does too much.
- One component per file (small colocated internal helpers are fine).

**Composition**: compose small focused components over monolithic ones; "lift content up"
(move children to the parent when the wrapper doesn't need them for logic); "push state
down" (keep state in the component that actually needs it); prefer `children` and
composition over deep prop drilling.

## Derive, Don't Store (CRITICAL)

The #1 React anti-pattern — look for it in every review.

- NEVER store a derived value in `useState` — compute it during render.
- NEVER use `useState` + `useEffect` to sync a computed value — just compute it.
- Use `useMemo` ONLY if the computation is expensive (measured, not assumed).
- If a value can be calculated from existing props/state, calculate it inline.

## State Management (HIGH)

**State location**: colocate state with the components that use it; don't lift state higher
than necessary — it causes unnecessary re-renders; don't duplicate state across components.

**Context API**: for dependency injection (auth, theme), NOT global state management —
Context changes re-render ALL consumers, so split contexts by concern; prefer a hook return
value over Context when only one subtree needs the data.

**State hygiene**: not everything needs `useState` — only values that change over time and
affect the UI; combine related state with `useReducer` instead of many `useState` calls;
URL-dependent state (filters, pagination, search) belongs in URL search params, not
component state.

## Hooks (HIGH)

**`useEffect` rules** — before each one, ask: is there an external system being
synchronized? If no, it's misused.

- NEVER use `useEffect` for derived state — compute during render.
- NEVER use `useEffect` for event handling — put logic in the event handler.
- NEVER chain effects that trigger each other — usually means derived state.
- ALWAYS declare all dependencies correctly.
- ALWAYS clean up subscriptions, timers, and event listeners.

**Memoization** — most `useMemo`/`useCallback` calls are unnecessary; be skeptical:
`useMemo` only for actually expensive computations; `useCallback` only when the function is
passed to a `React.memo` child; simple string/arithmetic/boolean work needs neither.

## Render Factories (CRITICAL)

camelCase functions returning JSX are NOT React components — they break reconciliation,
hooks, and dev tools.

- NEVER use a `renderThing()` pattern — use `<Thing />` component syntax.
- ALWAYS use PascalCase for anything that returns JSX.
- A render factory loses component identity on every render, causing a full unmount/remount.

## Inline Creation in JSX (HIGH)

New arrays/objects/functions created inline in JSX props break `React.memo` on children.

- Extract static arrays/objects to module-level constants.
- Extract dynamic arrays/objects to `useMemo`.
- Extract inline functions to `useCallback` (only when passed to memoized children).

## Over-Engineering (CRITICAL)

- Abstractions with only one consumer are premature — inline it.
- A "reusable" hook with hardcoded field names is not reusable — accept config as parameters.
- Context storing state that could be computed locally is over-engineered.
- A wrapper component that only calls a hook and returns `null` is unnecessary — call the
  hook directly.
- A wrapper that only forwards props adds indirection without value.

## Data Fetching (HIGH)

- ALL data fetching in custom hooks, never in component bodies.
- Handle loading, error, and empty states in the container component.
- Use try-catch in async functions within hooks.
- Server-state hooks are the only place a component reaches for remote data — never `fetch`
  directly inside a component body.

## Error Boundaries (HIGH)

- Use `react-error-boundary` (or equivalent) for a function-component-friendly API.
- Reset the boundary on navigation (e.g. a `resetKeys` tied to the current route).
- Provide a "Try again" action in the fallback UI.
- Error boundaries do NOT catch errors in event handlers, async code, or SSR — use
  try/catch there.

## Key Prop Patterns (CRITICAL)

- NEVER use array index as `key` when the list can be reordered, filtered, or modified.
- NEVER use `Math.random()` or another unstable value as a key.
- When mapping Fragments, put `key` on `<React.Fragment key={id}>`, not on a child.

## Conditional Rendering (HIGH)

- NEVER write `{count && <Component />}` when `count` can be `0` — it renders the literal `0`.
- Use `{count > 0 && <Component />}` or a ternary instead.
- Replace nested ternaries with early returns or extracted components.
- For multiple UI states (loading/error/empty/success), use the early-returns pattern.

## Accessibility (HIGH)

- `aria-label` on icon-only buttons — without it, they're invisible to screen readers.
- Link error messages to fields with `aria-describedby` and `aria-invalid`.
- `aria-live="polite"` for dynamic content updates.
- Trap focus inside modals; provide an escape path (Escape key + visible Close button).
- Announce route changes for screen readers — SPA navigation is silent by default.

## Performance Beyond Memoization (MEDIUM)

- `React.lazy()` + `<Suspense>` for route-level code splitting.
- Split vendor bundles for better caching.
- Use static (not dynamically-computed) import paths for `lazy(() => import('./X'))` —
  dynamic paths break build analysis.

## Async Requests + React Patterns (HIGH)

- Cancel in-flight requests on unmount/dependency change with an `AbortController`.
- Use a centralized HTTP client instance with `baseURL`, default headers, and interceptors.
- Request interceptors for auth tokens, response interceptors for 401/403 handling.

## Modern React (React 19+) Patterns (MEDIUM)

- Accept `ref` as a regular prop instead of `forwardRef`.
- With the React Compiler enabled, avoid adding `memo`/`useMemo`/`useCallback` unless a
  measurement shows it's needed.

## Code Organization (MEDIUM)

- Colocate component + hook + helpers + tests per feature.
- Shared utilities go in a shared `utils/`/UI-kit location, not duplicated per feature.
- File order: imports, constants, helpers, component, exports.
- Reuse existing types and constants over creating new ones.
