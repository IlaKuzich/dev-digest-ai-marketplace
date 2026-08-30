# Contributing a plugin

1. Create a new folder under `plugins/<plugin-name>/`.
2. Add `.claude-plugin/plugin.json` with at minimum: `name`, `version`, `description`.
3. Add your `commands/`, `skills/`, `agents/`, or `hooks/` as needed.
4. Register the plugin in `.claude-plugin/marketplace.json`:
   ```json
   {
     "name": "<plugin-name>",
     "source": "./plugins/<plugin-name>",
     "displayName": "<Human readable name>",
     "description": "<one-line description>",
     "version": "<semver>"
   }
   ```
5. Run `claude plugin validate .` and fix any errors.
6. Open a pull request. A `CODEOWNERS`-designated reviewer will be requested automatically.

## Guidelines

- Use semantic versioning (`MAJOR.MINOR.PATCH`) for every plugin.
- Keep `plugin.json` as the source of truth for a plugin's own metadata (`strict: true` behavior).
- Do not commit secrets, API keys, or credentials in any plugin.
- Prefer relative `source` paths (`./plugins/...`) for plugins hosted in this monorepo; use `github`/`url` sources only for plugins hosted elsewhere.
- If renaming or removing a plugin, add an entry to the `renames` field in `marketplace.json` so existing installs don't break.
