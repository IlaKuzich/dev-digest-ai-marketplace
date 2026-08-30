# Research Tools

A single, read-only research subagent — **`researcher`** — for investigating a codebase or
the web and reporting findings with evidence. It never edits, writes, or deletes anything.

## What it's for

Two situations come up constantly while building or reviewing software, and both benefit
from a fresh, focused context instead of burning your main conversation's tokens on a
side-quest:

- **"Where/how is X implemented in this repo?"** — `researcher` greps, reads, and reports
  `file:line` evidence, with an honest "not found" when it can't confirm something.
- **"What does this library actually do / which version fixed this / what do people
  recommend?"** — `researcher` runs targeted web searches and cites real URLs, never a
  half-remembered answer from training data.

It is deliberately **narrow**: no deep-research mode, no ability to spawn other agents, no
write tools at all. That's what makes its reports trustworthy enough for another agent (or
you) to act on without re-verifying everything it says.

## Installing and using it directly

```
/plugin install research-tools@dev-digest-ai-marketplace
```

Then just ask, in plain language:

> Use the researcher subagent to find where rate limiting is implemented in this repo.

> Use the researcher subagent to check whether Zod v4's `.pipe()` is stable and what changed
> from v3.

If your request is ambiguous (codebase or web? which package?), `researcher` will ask 1–4
pointed clarifying questions with a suggested default, instead of guessing — resume it with
the answers rather than starting a new one.

## Report shape

Every report — codebase or web — ends with three sections that make it safe to trust
without re-reading the underlying grep output:

- **Findings** — one verifiable fact per row, each with `file:line` or a real URL.
- **❌ Not found** — what was searched for and didn't turn up. This section is never
  omitted; an honest miss is a valid result.
- **Methodology** — exactly what was searched, so a reader can judge whether the
  investigation was thorough enough for their purposes.

## Using it from another plugin

Another installed plugin can spawn this agent by its **namespaced** name:
`research-tools:researcher`. It's a single, self-contained agent with no dependencies of its
own, so any plugin can rely on it without pulling in anything else. This is how
`sdd-engineering`'s `spec-creator` agent resolves an external fact (a library capability, a
standard, a competing product's behavior) it isn't allowed to guess at — see that plugin's
README for the full picture.

## Requires

None.

## Status

Initial release — `1.0.0`. Ported near-verbatim from an internal research agent; already
project-agnostic (no hardcoded paths or product-specific conventions).
