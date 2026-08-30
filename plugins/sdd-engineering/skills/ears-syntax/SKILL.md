---
name: ears-syntax
description: "EARS (Easy Approach to Requirements Syntax) reference — the five sentence patterns for writing or verifying a testable acceptance criterion, plus worked examples translating a vague requirement into one. Use when writing acceptance criteria for a spec, or when checking that existing criteria are unambiguous and testable."
---

# EARS — Easy Approach to Requirements Syntax

EARS (Alistair Mavin, Rolls-Royce, 2009) says *how to record* a requirement so it is
unambiguous. Each criterion collapses into one **testable** statement with no ambiguity
about trigger, state, or response.

Every acceptance criterion gets an ID (`AC-1`, `AC-2`, …) and exactly one of five patterns:

| Pattern | Shape | Example |
|---|---|---|
| **Ubiquitous** — always true | The system SHALL … | The system SHALL log every authentication attempt. |
| **Event-driven** — on an event | WHEN … the system SHALL … | WHEN a user submits the login form, the system SHALL validate the credentials against the auth provider. |
| **State-driven** — during a state | WHILE … the system SHALL … | WHILE a sync is running, the system SHALL display a progress indicator that cannot be dismissed. |
| **Unwanted behavior** — the bad path | IF … THEN the system SHALL … | IF credential validation fails three times within 60 seconds, THEN the system SHALL lock the account for 15 minutes. |
| **Optional feature** — conditional | WHERE … the system SHALL … | WHERE MFA is enabled, the system SHALL require a TOTP code after the password. |

Write them in **English**, using the literal keywords `WHEN` / `WHILE` / `IF … THEN` /
`WHERE` and `SHALL`, regardless of the language the request came in.

## The hard part: translating vague into testable

The five patterns are syntax. The real skill is turning a fuzzy requirement into an
unambiguous one — replacing a vague verb with a **concrete trigger** and a **concrete
response a test can check**:

| Vague requirement | EARS criterion |
|---|---|
| "Should work fine on big datasets" | WHEN the dataset exceeds the configured threshold, the system SHALL page results instead of loading them all at once |
| "Shouldn't crash if the model is down" | IF the model call fails, THEN the system SHALL render a deterministic fallback with the reason, instead of an error |
| "Should hint where to start reading" | The system SHALL order results by relevance rank, not alphabetically or by date |

Note what each translation did: **"fine", "crash", "hint" carry no test**. "Exceeds the
configured threshold", "the model call fails", "relevance rank" do. If you cannot name the
trigger or the observable response, the requirement is not understood yet — that is an open
question, not a criterion to write loosely.

## Rules

- **One criterion, one behavior.** If it needs an "and", it is probably two criteria.
- **Observable from outside.** A criterion about a private function is implementation.
- **No adverbs of quality** — "quickly", "gracefully", "properly", "reasonably". Each is a
  missing number or a missing definition. Chase it down or mark it as an open question.
- Every edge case and every relevant learning-log lesson should trace to a criterion, usually
  an `IF … THEN` one. An edge case nobody wrote a criterion for will not be built.
