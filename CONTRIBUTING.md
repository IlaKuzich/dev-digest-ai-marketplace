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
7. Once merged, versioning and publishing a new plugin version is done via `scripts/release.sh` — see [RELEASE.md](./RELEASE.md).

## Guidelines

- Prefer relative `source` paths (`./plugins/...`) for plugins hosted in this monorepo; use `github`/`url` sources only for plugins hosted elsewhere, and see [SECURITY.md](./SECURITY.md) for pinning requirements on those.
- If renaming or removing a plugin, add an entry to the `renames` field in `marketplace.json` so existing installs don't break.
- Versioning, releasing, and rolling back a plugin: [RELEASE.md](./RELEASE.md).
- Security requirements for hooks, MCP servers, secrets, and reporting a vulnerability: [SECURITY.md](./SECURITY.md).
