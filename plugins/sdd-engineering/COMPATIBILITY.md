# Compatibility

**Minimum Claude Code version: `>= 2.1.110`.**

This plugin's `.claude-plugin/plugin.json` declares a `dependencies` array with semver
ranges (`engineering-paved-path ^1.0.0`, `research-tools ^1.0.0`, `architecture-review
^1.0.0`) — a version-constrained dependency declaration between plugins. Pin your Claude
Code install to at least this version before relying on that field meaning anything beyond
documentation.

If you use a Claude Code capability newer than what this floor already assumes, record it
here explicitly, with the version it requires, rather than silently raising the floor in
your head — the next person reading this file should be able to trust it without
cross-checking every agent/skill file for an undocumented requirement.

## Known open question

At the time this plugin was authored, this marketplace's own
[`docs/PLUGIN-GUIDELINES.md`](../../docs/PLUGIN-GUIDELINES.md) states that the Claude Code
plugin system has **no dependency-resolution mechanism** — `dependencies` is informational
only. Whether `>= 2.1.110` actually changes that (i.e. whether `claude plugin list --json`
reports `dependency-unsatisfied` / `range-conflict` / `no-matching-tag` on a real install) has
not been empirically verified against a live Claude Code install as part of this release.
Treat the `dependencies` field as documentation until that's confirmed one way or the other,
and update this file with the result once it is.

## Evals

This plugin's `evals/` cases use Claude Code's native `claude plugin eval` command
(`evals/**/prompt.md` + `graders/*.md`, confirmed via `claude plugin eval --help` on Claude
Code 2.1.206). That command itself reported `plugin eval is currently in early access` at
authoring time — running the evals requires whatever opt-in that feature currently needs;
the case files are written and ready regardless.
