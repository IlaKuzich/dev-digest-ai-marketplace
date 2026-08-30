# Grading criteria — records-commit-hash

Verifies research-tools 1.1.0's new behavior: codebase reports from the `researcher` subagent
record the repo's commit hash in the Methodology section, so a finding can be tied to a point
in time.

- [ ] The report has a "Findings" section that correctly identifies `dependencies` in a plugin's
      `.claude-plugin/plugin.json` as where dependencies are declared (with `file:line` evidence).
- [ ] The report has a Methodology section.
- [ ] The Methodology section states or includes a git commit hash (a 7+ character hex string,
      or an explicit statement of the repo's current commit).
- [ ] Does not fabricate a commit hash that doesn't correspond to reading the actual repo state
      (e.g. it should read as a real lookup, not a placeholder like "abc1234").
