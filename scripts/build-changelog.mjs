#!/usr/bin/env node
// Build-time changelog: walks git history for plugins/** and classifies each
// touched file into an event for the "What's new" feed + a contributor tally
// for the stats view. Writes site/public/data/changelog.json + site/public/feed.xml.

import { writeFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATH = path.join(ROOT, "site", "public", "data", "changelog.json");

function sh(cmd) {
  return execSync(cmd, { cwd: ROOT, maxBuffer: 1024 * 1024 * 32 }).toString();
}

function pluginNameFromPath(p) {
  const m = /^plugins\/([^/]+)\//.exec(p);
  return m ? m[1] : null;
}

function classify(status, filePath) {
  if (/\.claude-plugin\/plugin\.json$/.test(filePath)) {
    return status === "A" ? "plugin-added" : "version-bump";
  }
  if (/^plugins\/[^/]+\/commands\//.test(filePath)) return status === "A" ? "command-added" : "plugin-updated";
  if (/^plugins\/[^/]+\/skills\//.test(filePath)) return status === "A" ? "skill-added" : "plugin-updated";
  if (/^plugins\/[^/]+\/agents\//.test(filePath)) return status === "A" ? "agent-added" : "plugin-updated";
  return "plugin-updated";
}

const KIND_LABELS = {
  "plugin-added": "New plugin",
  "plugin-updated": "Update",
  "version-bump": "Version bump",
  "skill-added": "New skill",
  "command-added": "New command",
  "agent-added": "New agent",
};

const KIND_DOTS = {
  "plugin-added": "var(--rust-500)",
  "plugin-updated": "var(--sky-500)",
  "version-bump": "var(--olive-500)",
  "skill-added": "var(--rust-500)",
  "command-added": "var(--rust-500)",
  "agent-added": "var(--rust-500)",
};

function buildChangelog() {
  // Format: <sha>\x1f<committerISO>\x1e<status>\t<path>\n<status>\t<path>...\x1e (next commit)
  const log = sh(
    `git log --name-status --format="%x1e%H%x1f%cI" -- plugins .claude-plugin`
  );
  const commits = log.split("").filter(Boolean);
  const entries = [];

  for (const block of commits) {
    const [header, ...rest] = block.split("\n").filter((l) => l.length);
    if (!header) continue;
    const [sha, date] = header.split("");
    for (const line of rest) {
      const m = /^([AMD])\s+(.+)$/.exec(line.trim());
      if (!m) continue;
      const [, status, filePath] = m;
      if (!filePath.startsWith("plugins/") && filePath !== ".claude-plugin/marketplace.json") continue;
      const pluginName = pluginNameFromPath(filePath);
      const kind = classify(status, filePath);
      entries.push({
        date: date.slice(0, 10),
        kind,
        kindLabel: KIND_LABELS[kind],
        dot: KIND_DOTS[kind],
        pluginId: pluginName ? `plugin:${pluginName}` : null,
        summary: summarize(kind, pluginName, filePath),
        commitSha: sha.slice(0, 7),
      });
    }
  }

  entries.sort((a, b) => b.date.localeCompare(a.date));
  return entries;
}

function summarize(kind, pluginName, filePath) {
  const base = path.basename(filePath, path.extname(filePath));
  switch (kind) {
    case "plugin-added":
      return `Added new plugin ${pluginName}`;
    case "skill-added":
      return `Added skill ${base} to ${pluginName}`;
    case "command-added":
      return `Added command /${base} to ${pluginName}`;
    case "agent-added":
      return `Added agent ${base} to ${pluginName}`;
    default:
      return `Updated ${pluginName || filePath}`;
  }
}

function buildContributors() {
  const raw = sh(`git shortlog -sne --all -- plugins .claude-plugin`);
  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const m = /^\s*(\d+)\t(.+?)\s*<(.+?)>$/.exec(line);
      if (!m) return null;
      const [, commits, name] = m;
      const initials = name
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
      return { name, initials, commits: Number(commits) };
    })
    .filter(Boolean);
}

function xmlEscape(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]
  ));
}

function buildFeed(entries) {
  const updated = entries[0] ? `${entries[0].date}T00:00:00Z` : new Date().toISOString();
  const items = entries
    .slice(0, 30)
    .map(
      (e) => `  <entry>
    <title>${xmlEscape(e.summary)}</title>
    <id>urn:ikdd-marketplace:${xmlEscape(e.commitSha)}:${xmlEscape(e.pluginId || "repo")}:${e.date}</id>
    <updated>${e.date}T00:00:00Z</updated>
    <link href="https://github.com/IlaKuzich/ikdd-ai-marketplace/commit/${xmlEscape(e.commitSha)}"/>
    <summary>${xmlEscape(e.kindLabel)}</summary>
  </entry>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>IKDD AI Marketplace — what's new</title>
  <link href="https://ilakuzich.github.io/ikdd-ai-marketplace/"/>
  <updated>${updated}</updated>
  <id>urn:ikdd-marketplace:feed</id>
${items}
</feed>
`;
}

function main() {
  const entries = buildChangelog();
  const contributors = buildContributors();

  mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  writeFileSync(
    OUT_PATH,
    JSON.stringify({ generatedAt: new Date().toISOString(), entries, contributors }, null, 2)
  );
  writeFileSync(path.join(ROOT, "site", "public", "feed.xml"), buildFeed(entries));
  console.log(`Wrote ${entries.length} changelog entries, ${contributors.length} contributors to ${path.relative(ROOT, OUT_PATH)}`);
}

main();
