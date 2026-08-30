# Changelog — sdd-engineering

Plugin-local log, kept in addition to the marketplace's root `CHANGELOG.md` (which remains
authoritative for release tags — see `docs/RELEASES.md`). This file exists so someone
inspecting only this plugin's directory can see its history without checking out the whole
marketplace's tag log.

## 1.0.0 — Initial release

- Four agents ported from an internal SDD pipeline: `spec-creator`, `implementation-planner`,
  `implementer`, `plan-verifier`.
- Two orchestration skills: `run-plan` (executes an approved spec + plan end to end) and
  `workflow-retro` (manual-only run grading).
- Two workflow skills made local to this plugin (generalized, no fixed module names):
  `engineering-insights`, `pr-self-review`, with `pr-self-review`'s push-gate hook wired via
  `hooks/hooks.json`.
- Declares `dependencies` on `engineering-paved-path`, `research-tools`, and
  `architecture-review`, all `^1.0.0`.
- Evals: one case per agent/skill under the plugin-root `evals/<component>/<case>/`
  (`prompt.md` + `graders/criteria.md`), matching Claude Code's native `claude plugin eval`
  convention (early-access as of Claude Code 2.1.206 — see `COMPATIBILITY.md`).
