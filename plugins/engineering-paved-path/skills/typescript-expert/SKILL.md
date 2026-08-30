---
name: typescript-expert
description: TypeScript and JavaScript expertise covering type-level programming, performance optimization, monorepo management, migration strategies, and modern tooling. Use when writing type-heavy code, diagnosing slow builds or excessive type-instantiation depth, migrating JS to TS, or reviewing TypeScript for type safety and idiom.
---

# TypeScript Expert

Deep, practical TypeScript/JavaScript guidance based on current best practices — type-level
programming, performance, migration, and modern tooling.

## Analyze before changing

**Use internal tools (Read, Grep, Glob) first for project detection — shell commands are a
fallback.**

```bash
npx tsc --version
node -v
# Detect tooling ecosystem (prefer parsing package.json)
node -e "const p=require('./package.json');console.log(Object.keys({...p.devDependencies,...p.dependencies}||{}).join('\n'))" 2>/dev/null | grep -E 'biome|eslint|prettier|vitest|jest|turborepo|nx' || echo "No tooling detected"
# Check for monorepo
(test -f pnpm-workspace.yaml || test -f lerna.json || test -f nx.json || test -f turbo.json) && echo "Monorepo detected"
```

After detection: match the project's import style (absolute vs relative), respect existing
`baseUrl`/`paths`, prefer existing project scripts over raw tool invocations, and in a
monorepo consider project references before a broad `tsconfig.json` change.

Validate any change with fast, one-shot commands — never a long-lived watch/serve process:

```bash
npm run -s typecheck || npx tsc --noEmit
npm test -s || npx vitest run --reporter=basic --no-watch
```

## Type-Level Programming Patterns

**Branded types for domain modeling** — prevent accidental mixing of same-shape primitives:

```typescript
type Brand<K, T> = K & { __brand: T };
type UserId = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;

function processOrder(orderId: OrderId, userId: UserId) { }
```
Use for critical domain primitives, API boundaries, currency/units.

**Advanced conditional types** — recursive type manipulation and template-literal typing:

```typescript
type DeepReadonly<T> = T extends (...args: any[]) => any
  ? T
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

type PropEventSource<Type> = {
  on<Key extends string & keyof Type>
    (eventName: `${Key}Changed`, callback: (newValue: Type[Key]) => void): void;
};
```
Use for library APIs, type-safe event systems, compile-time validation. Watch for type
instantiation depth errors — keep recursion under ~10 levels.

**Type inference techniques**:

```typescript
// 'satisfies' (TS 5.0+) validates a constraint while preserving literal types
const config = {
  api: "https://api.example.com",
  timeout: 5000,
} satisfies Record<string, string | number>;

// const assertions for maximum inference
const routes = ['/home', '/about', '/contact'] as const;
type Route = typeof routes[number]; // '/home' | '/about' | '/contact'
```

## Performance Optimization

**Diagnosing slow type checking**:

```bash
npx tsc --extendedDiagnostics --incremental false | grep -E "Check time|Files:|Lines:|Nodes:"
```

Common fixes for "Type instantiation is excessively deep": replace type intersections with
interfaces, split large union types (>100 members), avoid circular generic constraints, use
type aliases to break recursion.

**Build performance**: `skipLibCheck: true` (skip re-checking library `.d.ts` files — a
large win on big projects, but don't let it mask app-code typing issues); `incremental: true`
with a `.tsbuildinfo` cache; precise `include`/`exclude`; project references with
`composite: true` in a monorepo.

## Common Error Patterns

**"The inferred type of X cannot be named"** — usually a missing type export or a circular
dependency. Fix priority: export the required type explicitly → use `ReturnType<typeof fn>`
→ break the cycle with a type-only import.

**Missing type declarations for an untyped package**:
```typescript
// types/ambient.d.ts
declare module 'some-untyped-package' {
  const value: unknown;
  export default value;
}
```

**"Excessive stack depth comparing types"** — circular or deeply recursive types. Fix
priority: limit recursion depth with a conditional type → use `interface extends` instead of
a type intersection → simplify generic constraints.

```typescript
// Bad: infinite recursion
type InfiniteArray<T> = T | InfiniteArray<T>[];

// Good: bounded recursion
type NestedArray<T, D extends number = 5> =
  D extends 0 ? T : T | NestedArray<T, [-1, 0, 1, 2, 3, 4][D]>[];
```

**Module resolution mysteries** ("Cannot find module" despite the file existing): check
`moduleResolution` matches your bundler, verify `baseUrl`/`paths` alignment, ensure the
workspace protocol is used correctly in a monorepo, clear the cache
(`rm -rf node_modules/.cache .tsbuildinfo`).

**Path mapping is compile-time only** — `tsconfig` `paths` don't resolve at runtime.
Node/ts-node needs `tsconfig-paths/register` or a pre-compile step that resolves the paths.

## Migration

**JavaScript → TypeScript, incrementally**: enable `allowJs`/`checkJs` in the existing
`tsconfig.json` → rename files gradually (`.js` → `.ts`) → type file by file → enable strict
mode features one at a time.

**Tool migration decisions**:

| From | To | When | Effort |
|------|-----|------|-----------------|
| ESLint + Prettier | Biome | Need much faster speed, okay with fewer rules | Low (~1 day) |
| TSC for linting | Type-check only | 100+ files, need faster feedback | Medium (2-3 days) |
| Lerna | Nx/Turborepo | Need caching, parallel builds | High (~1 week) |
| CJS | ESM | Node 18+, modern tooling | High (varies) |

## Monorepo Management

**Turborepo vs Nx**: Turborepo for a simple structure, <20 packages, speed-first. Nx for
complex dependencies, needing visualization, or plugin ecosystem; often performs better past
~50 packages.

```json
// Root tsconfig.json
{
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/ui" },
    { "path": "./apps/web" }
  ],
  "compilerOptions": { "composite": true, "declaration": true, "declarationMap": true }
}
```

## Modern Tooling

**Biome vs ESLint**: Biome when speed matters, you want a single lint+format tool, and the
project is TypeScript-first — no type-aware linting yet, and fewer rules than
typescript-eslint. Stay on ESLint for specific plugins/custom rules, Vue/Angular support, or
type-aware linting.

**Type testing** (Vitest):
```typescript
import { expectTypeOf } from 'vitest';
import type { Avatar } from './avatar';

test('Avatar props are correctly typed', () => {
  expectTypeOf<Avatar>().toHaveProperty('size');
  expectTypeOf<Avatar['size']>().toEqualTypeOf<'sm' | 'md' | 'lg'>();
});
```
Worth it for: publishing libraries, complex generic functions, type-level utilities, API
contracts.

## Debugging

```bash
# Trace module resolution
npx tsc --traceResolution > resolution.log 2>&1 && grep "Module resolution" resolution.log

# Debug type-checking performance
npx tsc --generateTrace trace --incremental false

# Memory usage on a huge project
node --max-old-space-size=8192 node_modules/typescript/lib/tsc.js
```

Custom error classes preserve the stack correctly:
```typescript
class DomainError extends Error {
  constructor(message: string, public code: string, public statusCode: number) {
    super(message);
    this.name = 'DomainError';
    Error.captureStackTrace(this, this.constructor);
  }
}
```

## Current Best Practices

**Strict by default**:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true
  }
}
```

**ESM-first**: `"type": "module"` in `package.json`; `"moduleResolution": "bundler"` for
modern tools; dynamic `import()` for interop with a CJS-only dependency.

## Code Review Checklist

**Type Safety**: no implicit `any`; strict null checks handled; `as` assertions justified and
minimal; generic constraints defined; discriminated unions for error handling; explicit
return types on public APIs.

**TypeScript idiom**: prefer `interface` over `type` for object shapes (clearer error
messages); const assertions for literal types; type guards over repeated `as`; template
literal types where they clarify a string-shaped domain; branded types for domain primitives.

**Performance**: type complexity doesn't slow compilation; no excessive instantiation depth;
`skipLibCheck: true`; project references in a monorepo.

**Module system**: consistent import/export style; no circular dependencies; barrel exports
used without over-bundling; ESM/CJS interop handled correctly.

**Error handling**: result types or discriminated unions for recoverable errors; custom
error classes with correct inheritance; exhaustive `switch` with a `never` check.

**Organization**: types colocated with their implementation; shared types in a dedicated
module; minimal global type augmentation.

## Expert Resources

- [TypeScript Wiki — Performance](https://github.com/microsoft/TypeScript/wiki/Performance)
- [Type Challenges](https://github.com/type-challenges/type-challenges)
- [Biome](https://biomejs.dev)
- [Vitest Type Testing](https://vitest.dev/guide/testing-types)
