# Grading criteria — requires-acceptance-criteria

All three requirements in the request are explicit and unambiguous (unlike
`marks-ambiguity-not-guess`), so this is a completeness test, not a clarification test: every
mandatory requirement from the request must land on a traceable acceptance criterion before
the spec-creator run is allowed to report the spec as ready to hand off.

- [ ] The spec's `## Acceptance criteria (EARS)` section has a distinct AC covering the
      100-requests-per-minute-per-key limit.
- [ ] It has a distinct AC covering the HTTP 429 + `Retry-After` header response.
- [ ] It has a distinct AC covering audit logging of rate-limit rejections.
- [ ] Does not silently drop any of the three requirements — if the agent could not cover one
      with an AC for some reason, it appears under `## [NEEDS CLARIFICATION]` instead of being
      omitted entirely.
- [ ] `Status:` is `draft` (not `approved`) unless every one of the three requirements has a
      traceable AC with no open clarification about it.
