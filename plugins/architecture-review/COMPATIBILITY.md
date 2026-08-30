# Compatibility

**Minimum Claude Code version: `>= 2.1.110`.**

This plugin's `.claude-plugin/plugin.json` declares a `dependencies` array
(`engineering-paved-path ^1.0.0`) — see `sdd-engineering`'s `COMPATIBILITY.md` for the fuller
discussion of what that field does and doesn't guarantee today; the same caveat applies here.

`claude plugin eval` (used by this plugin's `evals/`) is early-access as of Claude Code
2.1.206 — running the evals yourself requires whatever opt-in that feature currently needs.
