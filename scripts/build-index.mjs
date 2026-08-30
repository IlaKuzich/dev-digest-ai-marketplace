#!/usr/bin/env node
// Builds site/index.json from .claude-plugin/marketplace.json + each plugin's plugin.json/README.md.
// See docs/SITE-SPEC.md for what this output feeds and why the site only ever reads index.json.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MARKETPLACE_FILE = path.join(ROOT, ".claude-plugin", "marketplace.json");
const SITE_DIR = path.join(ROOT, "site");
const OUT_FILE = path.join(SITE_DIR, "index.json");
const MARKETPLACE_NAME = "dev-digest-ai-marketplace";

function readmeExcerpt(markdown, maxLen = 280) {
  const withoutHeading = markdown.replace(/^#.*\n+/, "").trim();
  const firstParagraph = withoutHeading.split(/\n\s*\n/)[0] ?? "";
  const flat = firstParagraph.replace(/\s+/g, " ").trim();
  return flat.length > maxLen ? `${flat.slice(0, maxLen - 1)}…` : flat;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function buildEntry(entry) {
  const { name, source } = entry;
  if (typeof source !== "string" || !source.startsWith("./")) {
    // Non-local sources (github/url/npm/archive) aren't readable from this checkout.
    return {
      name,
      displayName: entry.displayName ?? name,
      description: entry.description ?? "",
      version: entry.version ?? null,
      keywords: entry.keywords ?? [],
      installCommand: `/plugin install ${name}@${MARKETPLACE_NAME}`,
      readmeExcerpt: null,
    };
  }

  const pluginDir = path.join(ROOT, source);
  const manifestPath = path.join(pluginDir, ".claude-plugin", "plugin.json");
  const readmePath = path.join(pluginDir, "README.md");

  const manifest = await readJson(manifestPath);

  let excerpt = null;
  try {
    excerpt = readmeExcerpt(await readFile(readmePath, "utf8"));
  } catch {
    // README.md is required by docs/PLUGIN-GUIDELINES.md, but don't fail the whole build over one missing file.
  }

  return {
    name: manifest.name,
    displayName: manifest.displayName ?? entry.displayName ?? manifest.name,
    description: manifest.description ?? entry.description ?? "",
    version: manifest.version ?? entry.version ?? null,
    keywords: manifest.keywords ?? entry.keywords ?? [],
    installCommand: `/plugin install ${manifest.name}@${MARKETPLACE_NAME}`,
    readmeExcerpt: excerpt,
  };
}

async function main() {
  const marketplace = await readJson(MARKETPLACE_FILE);
  const plugins = await Promise.all((marketplace.plugins ?? []).map(buildEntry));
  plugins.sort((a, b) => a.name.localeCompare(b.name));

  await mkdir(SITE_DIR, { recursive: true });
  await writeFile(OUT_FILE, `${JSON.stringify({ marketplace: marketplace.name, plugins }, null, 2)}\n`);
  console.log(`Wrote ${plugins.length} plugin(s) to ${path.relative(ROOT, OUT_FILE)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
