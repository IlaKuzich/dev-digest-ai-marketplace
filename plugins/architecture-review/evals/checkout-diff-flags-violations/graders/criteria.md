# Grading criteria — checkout-diff-flags-violations

The diff has two real architectural violations: a domain file importing a `fastify` type
(inward-dependency violation), and a service constructing `new PgCheckoutRepository()`
directly instead of resolving it from the DI container (DI-discipline violation). It has no
other architectural problems.

- [ ] Flags the domain file (`checkout.ts`) importing a type from `fastify` as a violation of
      the inward-only dependency rule.
- [ ] Flags the `new PgCheckoutRepository()` call inside `service.ts` as a violation of DI
      discipline.
- [ ] Names the specific architectural rule broken for each finding, not just a vague
      description in prose.
- [ ] Assigns a severity (CRITICAL/WARNING/SUGGESTION) to each finding.
- [ ] Quotes or cites the offending line as evidence for each finding.
- [ ] Does not invent an additional architecture finding for the optional
      `reply?: FastifyReply` parameter beyond the import-direction issue itself (no fabricated
      security/runtime-bug finding).
- [ ] Does not comment on naming, style, or test coverage — stays scoped to
      structural/layering/DI findings.
- [ ] Ends with an explicit verdict; since a CRITICAL exists, the verdict must be
      `request_changes`.
