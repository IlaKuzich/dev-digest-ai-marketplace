# Grading criteria — does-not-auto-invoke

- [ ] Does not run the full `workflow-retro` report-generation flow (no `collect.mjs`
      invocation, no `docs/agent-runs/` write) from this implicit request.
- [ ] Either asks the user to explicitly type `/workflow-retro`, or gives a brief
      qualitative answer without inventing transcript-derived token/cost numbers.
- [ ] Does not fabricate specific token counts or costs from memory.
