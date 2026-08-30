#!/usr/bin/env node
// Build-time indexer: scans .claude-plugin/marketplace.json + plugins/** and
// writes a flat search index to site/public/data/index.json (Vite copies
// public/ verbatim into dist/). No network, no backend — this JSON is
// fetched client-side by the static site.

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATH = path.join(ROOT, "site", "public", "data", "index.json");

function readJson(p) {
  return JSON.parse(readFileSync(p, "utf8"));
}

function gitLastUpdated(relPath) {
  try {
    const out = execSync(`git log -1 --format=%cI -- "${relPath}"`, { cwd: ROOT }).toString().trim();
    return out || null;
  } catch {
    return null;
  }
}

function gitFirstAdded(relPath) {
  try {
    const out = execSync(`git log --diff-filter=A --format=%cI -- "${relPath}"`, { cwd: ROOT })
      .toString()
      .trim();
    const lines = out.split("\n").filter(Boolean);
    return lines.length ? lines[lines.length - 1] : null;
  } catch {
    return null;
  }
}

// Minimal frontmatter parser: `---\nkey: value\n...\n---\nbody`. No nested YAML.
function parseFrontmatter(raw) {
  if (!raw.startsWith("---")) return { attrs: {}, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { attrs: {}, body: raw };
  const head = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).replace(/^\s*\n/, "");
  const attrs = {};
  for (const line of head.split("\n")) {
    const m = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line.trim());
    if (m) attrs[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return { attrs, body };
}

// Strip common markdown syntax down to plain text for full-text search.
function toPlainText(md) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/[*_>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstParagraph(plainText) {
  return plainText.split(/\n\n|\. /)[0]?.slice(0, 200) ?? "";
}

function collectMdEntries(dir, type, pluginId, pluginDisplayName) {
  const entries = [];
  if (!existsSync(dir)) return entries;
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    let mdPath = full;
    let entryName = name.replace(/\.md$/, "");
    if (statSync(full).isDirectory()) {
      // skills/<name>/SKILL.md convention
      const skillMd = path.join(full, "SKILL.md");
      if (!existsSync(skillMd)) continue;
      mdPath = skillMd;
      entryName = name;
    } else if (!name.endsWith(".md")) {
      continue;
    }
    const raw = readFileSync(mdPath, "utf8");
    const { attrs, body } = parseFrontmatter(raw);
    const plainBody = toPlainText(body);
    const relPath = path.relative(ROOT, mdPath);
    entries.push({
      id: `${type}:${pluginId.split(":")[1]}/${entryName}`,
      type,
      name: entryName,
      parentPluginId: pluginId,
      parentPluginDisplayName: pluginDisplayName,
      description: attrs.description || firstParagraph(plainBody),
      bodyText: plainBody,
      path: relPath,
      lastUpdatedAt: gitLastUpdated(relPath),
    });
  }
  return entries;
}

function buildPluginEntry(pluginMeta) {
  const pluginDir = path.join(ROOT, pluginMeta.source.replace(/^\.\//, ""));
  const manifestPath = path.join(pluginDir, ".claude-plugin", "plugin.json");
  const manifest = existsSync(manifestPath) ? readJson(manifestPath) : {};
  const readmePath = path.join(pluginDir, "README.md");
  const readmeText = existsSync(readmePath) ? toPlainText(readFileSync(readmePath, "utf8")) : "";

  const pluginId = `plugin:${manifest.name || pluginMeta.name}`;
  const displayName = manifest.displayName || pluginMeta.displayName || manifest.name;

  const commands = collectMdEntries(path.join(pluginDir, "commands"), "command", pluginId, displayName);
  const skills = collectMdEntries(path.join(pluginDir, "skills"), "skill", pluginId, displayName);
  const agents = collectMdEntries(path.join(pluginDir, "agents"), "agent", pluginId, displayName);
  const children = [...commands, ...skills, ...agents];

  const pluginRelDir = path.relative(ROOT, pluginDir);
  const lastUpdatedAt =
    [gitLastUpdated(pluginRelDir), ...children.map((c) => c.lastUpdatedAt)].filter(Boolean).sort().pop() || null;

  const pluginEntry = {
    id: pluginId,
    type: "plugin",
    name: manifest.name || pluginMeta.name,
    displayName,
    description: manifest.description || pluginMeta.description || "",
    version: manifest.version || pluginMeta.version || "0.0.0",
    author: manifest.author || null,
    license: manifest.license || null,
    keywords: manifest.keywords || [],
    path: pluginRelDir,
    readmeText,
    counts: { commands: commands.length, skills: skills.length, agents: agents.length },
    childIds: children.map((c) => c.id),
    firstAddedAt: gitFirstAdded(pluginRelDir),
    lastUpdatedAt,
  };

  return [pluginEntry, ...children];
}

function main() {
  const marketplace = readJson(path.join(ROOT, ".claude-plugin", "marketplace.json"));
  const entries = marketplace.plugins.flatMap(buildPluginEntry);

  mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  writeFileSync(
    OUT_PATH,
    JSON.stringify({ generatedAt: new Date().toISOString(), entries }, null, 2)
  );
  console.log(`Wrote ${entries.length} entries to ${path.relative(ROOT, OUT_PATH)}`);
}

main();
