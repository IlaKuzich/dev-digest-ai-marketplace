---
name: zod
description: Zod schema validation best practices for type safety, parsing, and error handling. Use when defining z.object schemas, choosing between parse() and safeParse(), inferring types with z.infer, composing schemas, or reviewing Zod code for correctness and performance.
---

# Zod Best Practices

A condensed, project-agnostic guide to writing correct, safe, and maintainable Zod schemas —
covering schema definition, parsing, type inference, error handling, composition, and
performance. Organized by priority so the highest-impact rules come first.

## When to Apply

- Writing new Zod schemas.
- Choosing between `parse()` and `safeParse()`.
- Implementing type inference with `z.infer`.
- Handling validation errors for user feedback.
- Composing complex object schemas.
- Using refinements and transforms.
- Reviewing Zod code for best practices.

## 1. Schema Definition (CRITICAL)

- **Use the correct primitive for the type** — `z.string()`, `z.number()`, `z.boolean()`,
  not a loosely-typed catch-all.
- **`z.unknown()`, not `z.any()`** — `any` silently disables type checking on everything
  downstream; `unknown` forces a narrowing check before use.
- **Don't overuse `.optional()`** — an optional field that is actually always present just
  pushes a null-check onto every consumer. Make it required, and use `.default()` if there's
  a sensible fallback.
- **Validate string shape at the schema**, not after parsing — `.email()`, `.url()`,
  `.min()/.max()`, `.regex()` belong on the schema, not as a follow-up `if` check.
- **Use `z.enum([...])` for a fixed, known set of string values** instead of a bare `string()`
  — it turns an invalid value into a parse error instead of a runtime surprise three layers
  downstream.
- **Use `z.coerce.*` for form/query-string data** — everything arrives as a string there;
  coerce at the boundary rather than hand-parsing before validation.

```ts
const CreateUserInput = z.object({
  email: z.string().email(),
  role: z.enum(["member", "admin"]),
  age: z.coerce.number().int().min(0).optional(),
});
```

## 2. Parsing & Validation (CRITICAL)

- **`safeParse()` for any input you don't control** (user input, request bodies, external
  API responses) — `parse()` throws, which is fine for input you already trust (e.g. your
  own config) but turns an ordinary bad-request into an uncaught exception for untrusted input.
- **`parseAsync()`** when a refinement does async work (an async uniqueness check, a
  network call) — a sync `parse()`/`safeParse()` silently ignores an async refinement's result.
- **Read every issue in `result.error.issues`**, not just the first — a form needs to show
  every invalid field at once, not one at a time.
- **Validate at the system boundary** (route handler, form submit) — not again three
  functions later. Passing an already-validated, typed value through internal functions with
  the same schema is redundant defense that just costs cycles and hides which layer owns
  the check.
- **Never trust `JSON.parse()`'s output as typed** — it returns `any`; always run it through
  a schema before treating it as the shape you expect.

```ts
const result = CreateUserInput.safeParse(req.body);
if (!result.success) {
  return res.status(422).json({ errors: result.error.flatten() });
}
const input = result.data; // typed, validated
```

## 3. Type Inference (HIGH)

- **`z.infer<typeof Schema>`, never a hand-written parallel type** — a manually maintained
  type and its schema drift apart silently; inference makes drift a compile error instead.
- **`z.input` vs `z.infer` (`z.output`) differ when a schema transforms** — `z.input` is the
  pre-transform shape (what you accept), `z.infer`/`z.output` is the post-transform shape
  (what you get back). Using the wrong one at a boundary produces a type that lies about
  what's actually there.
- **Export both the schema and its inferred type** from the module that owns the contract,
  so every consumer imports one pair, not two independently-maintained things.
- **Branded types for domain primitives** you don't want accidentally interchangeable
  (`UserId` vs `OrderId`, both strings) — `z.string().brand<"UserId">()`.
- **Enable TypeScript `strict` mode** — Zod's inference quality depends on it; without it,
  `z.infer` results can widen unexpectedly.

## 4. Error Handling (HIGH)

- **Custom messages at the point of definition** (`z.string().min(8, "Password must be at
  least 8 characters")`) — a generic Zod message rarely reads well as user-facing copy.
- **`error.flatten()`** for form-style error display (field → message map).
- **`issue.path`** to locate an error inside a nested object/array — don't assume a flat
  field name.
- **Internationalize error messages** at the presentation layer, not by hardcoding one
  language into the schema.
- **Return `false` from `.refine()`, never `throw`** — a thrown error inside a refinement
  produces a worse, less structured failure than a normal validation issue.

## 5. Object Schemas (MEDIUM-HIGH)

- **`.strict()` vs `.strip()`**: `.strict()` rejects unknown keys (use for contracts you
  fully own, e.g. request bodies); `.strip()` (the default) silently drops them (use when a
  caller may pass extra fields you intentionally ignore).
- **`.partial()`** for an update/PATCH schema derived from a create schema — don't
  hand-duplicate every field as optional.
- **`.pick()` / `.omit()`** to derive a schema variant instead of redefining fields.
- **`.extend()`** to add fields when composing, instead of copy-pasting the base shape.
- **`.optional()` vs `.nullable()` are different** — optional means "the key may be absent";
  nullable means "the key is present but may be `null`." Confusing them produces a type that
  accepts the wrong absence-shape.
- **Discriminated unions** (`z.discriminatedUnion("type", [...])`) for tagged variants — far
  better error messages and narrowing than a plain `z.union`.

## 6. Schema Composition (MEDIUM)

- **Extract shared sub-schemas into their own module** (a `Pagination` schema reused across
  ten list endpoints) instead of repeating the shape.
- **`.and()` / `z.intersection()`** to combine two schemas into one type.
- **`z.lazy()`** for recursive schemas (a tree/comment-reply shape) — a schema can't
  reference itself directly without it.
- **`.preprocess()`** to normalize data before validation (trim strings, coerce a
  legacy format) — keep this narrow and documented, since it makes the schema's accepted
  input wider than what it appears to validate.
- **`.pipe()`** to chain a transform into a second schema's validation.

## 7. Refinements & Transforms (MEDIUM)

- **`.refine()`** for a single boolean condition; **`.superRefine()`** when you need to add
  multiple issues or issues at different paths from one check.
- **`.transform()`** changes the output shape/type; **`.refine()`** only validates without
  changing it; **`.coerce`** converts the input type before validating. Don't reach for the
  wrong one — a `.refine()` that tries to "fix" the value silently drops the fix.
- **`.default()`** for an optional field with a sensible fallback, instead of `?? fallback`
  scattered at every call site.
- **`.catch()`** for fault-tolerant parsing where a malformed value should fall back to a
  default rather than fail the whole parse — use sparingly, since it can hide real bad data.

## 8. Performance & Bundle (LOW-MEDIUM)

- **Cache schema instances** — define a schema once at module scope, never inside a hot
  function/request handler.
- **Zod Mini** for bundle-size-sensitive client code, if the tree-shaken full build is still
  too large.
- **Avoid building a schema dynamically per-call** in a hot path — build it once from
  config, at startup.
- **Lazy-load very large schemas** that aren't needed on every request.
- **For large arrays**, validate with `.array()` directly rather than mapping and validating
  each element manually — it's both faster and produces per-index error paths for free.

## Related

- For a schema shared between a client and a server, put it in the package/module both
  sides import — never redefine the same shape twice by hand (see the reuse skill for your
  project's data layer, if one exists).

## Sources

- [Zod Official Documentation](https://zod.dev/)
- [Zod v4 Release Notes](https://zod.dev/v4)
- [Zod GitHub Repository](https://github.com/colinhacks/zod)
- [Zod Mini](https://zod.dev/packages/mini)
