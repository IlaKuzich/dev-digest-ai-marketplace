---
name: client-project-structure
description: "Use when adding or refactoring code in a Next.js App Router + React client — deciding where a component, subcomponent, data hook, helper, constant, type, API call, or business-logic predicate should live, whether something is page-local or shared, how to name files/folders, where the Server/Client Component boundary goes, and how data fetching must flow. Trigger terms: where does this go, folder structure, colocation, _components, page-local vs shared, helpers vs lib, constants location, business logic placement, file naming, RSC boundary, use client, data-fetching hook, App Router."
---

# Client Project Structure (Next.js App Router)

## Overview

Colocate code by where it is used. **Page-local code lives next to its route; shared code
lives in a small set of top-level homes.** This is a **pattern skill** — adapt the concrete
folder names to your project's own conventions (a `client/CLAUDE.md`-style top-level map, if
your project has one, is the source of truth for the exact names; this skill must never
contradict it), but never bypass the three rules below.

1. **Colocation + lift.** Used by **one page** → it lives in that page's `_components/`.
   Reused by **2+ pages** → lift it to a shared home (e.g. `src/components`, `src/lib`).
   Never pre-globalize single-use code.
2. **Data flows through hooks only.** ALL server state goes through a data-fetching hook
   (e.g. a TanStack Query hook) in a shared hooks location — a component **never** calls
   `fetch` or an API client module directly.
3. **App Router only.** Routes are `src/app/**/page.tsx`. Pages are thin — they compose
   `_components`, they don't hold logic.

## Where things live (decision table)

| Artifact | Page-local (one route) | Shared (2+ routes) |
|---|---|---|
| Component | `app/<route>/_components/<Name>/<Name>.tsx` | `src/components/<kebab>/` |
| Subcomponent | same `_components/<Name>/` folder as parent | `src/components/<kebab>/` |
| Data hook (server state) | `src/lib/hooks/<domain>.ts` (one per query) | `src/lib/hooks/<domain>.ts` |
| Pure helper / util | `_components/<Name>/helpers.ts` | `src/lib/<kebab>.ts` |
| Constant | `_components/<Name>/constants.ts` | `src/lib/<kebab>.ts` |
| Local type | colocated `types.ts` | `src/lib/types.ts` |
| Server-contract type | — (never redefine) | infer from your shared/validated contract module |
| API call | never in a component — go through a hook that uses your API client module | `src/lib/api.ts` |
| Business logic / predicate | `_components/<Name>/helpers.ts` — pure, **no React import** | `src/lib/<kebab>.ts` |
| App chrome (nav, shortcuts) | — | a shared app-shell component |
| UI primitive | — | your design-system/UI-kit package |
| Route / page | `src/app/<route>/page.tsx` — thin, composes `_components` | — |

**Business logic never lives inside a component.** A predicate like "can the current user
edit this item?" is a pure function (colocated `helpers.ts` when page-local, `src/lib/` when
shared) so it is unit-testable without rendering.

## Next.js App Router specifics

- **Route files** (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`) stay in the route
  folder. `page.tsx` is a thin entry that renders one `_components` view.
- **Private folders** — prefix with `_` (`_components/`, `_hooks/`) so Next.js excludes
  them from routing. This is the page-local colocation home.
- **RSC boundary.** Components are Server Components by default. Add `'use client'` at the
  **leaf** that needs interactivity or hooks — not at the page root — so the server tree
  stays as large as possible.
- **Data fetching.** Server state is fetched via data-fetching hooks (client-side), never
  with `fetch` in a component body.
- For RSC mechanics, streaming, and metadata, **invoke the `next-best-practices` skill**
  rather than re-deriving them here. For component design, **`react-best-practices`**.

## Naming

| Kind | Convention | Example |
|---|---|---|
| Shared component folder (`src/components/`) | kebab-case | `app-shell/`, `diff-viewer/` |
| `_components/` slice folder (page-local) | PascalCase (matches component) | `CommentList/`, `ItemDetailView/` |
| Component file | PascalCase | `AppShell.tsx`, `DiffViewer.tsx` |
| Colocated helpers file | `helpers.ts` (**not** `utils.ts`) | `diff-viewer/helpers.ts` |
| Colocated constants file | `constants.ts` | `diff-viewer/constants.ts` |
| Public surface of a folder | `index.ts` barrel | re-exports what's imported outside |
| `lib/` utility file | kebab-case | `format-relative-time.ts`, `model-label.ts` |
| Data hook | `useX` fn, grouped by domain | `lib/hooks/reviews.ts` |

Match whatever a given project has already established for these names — the point is
consistency within one codebase, not the exact strings above.

## The lift decision

```
New artifact
  → Is it server data?
      yes → a data-fetching hook in src/lib/hooks/
      no  → Used by 2+ routes?
              no  → keep it in the page's _components/
              yes → Is it a server/client contract type?
                      yes → infer it from your shared contract module
                      no  → lift to src/components/ or src/lib/
```

## Example — a page-local feature

Feature scoped to one route:

```
src/app/items/[id]/comments/
  page.tsx                       # thin: renders <CommentList />, no logic
  _components/
    CommentList/
      CommentList.tsx            # 'use client' — needs the query hook + interactivity
      CommentItem.tsx            # subcomponent, only used by CommentList
      CommentForm.tsx
      helpers.ts                 # canEditComment(user, c) — pure, no React import
      constants.ts               # MAX_COMMENT_LENGTH = 500
      index.ts                   # barrel: exports CommentList

src/lib/hooks/comments.ts        # useComments(), usePostComment() — data-fetching hooks
```

- The `Comment` shape is returned by the backend, so it is a **contract**: infer it from
  your shared contract module — never redefine it locally.
- A generic `"3h ago"` formatter is reused across routes, so it **lifts** out to
  `src/lib/format-relative-time.ts`, not the feature.

## Common mistakes

| Mistake | Fix |
|---|---|
| Inventing a top-level `src/features/` folder without one already existing in the project | Page-local code goes in `app/<route>/_components/` unless your project has explicitly adopted a features folder. |
| Calling `fetch` or the API client module from a component | Server state always flows through a data-fetching hook. |
| `'use client'` at the page root | Push the boundary to the interactive leaf; keep the server tree large. |
| Inconsistent casing across files in the same project | Match whatever this project already established (see Naming). |
| Naming a colocated helper `utils.ts` in a project that uses `helpers.ts` elsewhere | Match the existing convention. |
| Predicate logic inside a component or hook | Pure function in `helpers.ts` (page-local) or `src/lib/` (shared). |
| Redefining a server type locally | Infer it from the shared contract module. |
| Reaching into a sealed design-system package's internals | Use its public exports only. |
