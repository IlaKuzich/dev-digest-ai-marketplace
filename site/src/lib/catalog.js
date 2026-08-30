// Pure helpers over the flat entries[] array from data/index.json.
// Kept dependency-free (no React) so they're easy to unit test in isolation.

export function findEntry(entries, id) {
  return entries.find((e) => e.id === id) || null;
}

export function parentOf(entries, entry) {
  return entry && entry.parentPluginId ? findEntry(entries, entry.parentPluginId) : null;
}

export function keywordsOf(entries, entry) {
  if (!entry) return [];
  if (entry.keywords && entry.keywords.length) return entry.keywords;
  const parent = parentOf(entries, entry);
  return parent ? parent.keywords || [] : [];
}

export function installNameOf(entries, entry) {
  if (entry.type === "plugin") return entry.name;
  const parent = parentOf(entries, entry);
  return parent ? parent.name : entry.parentPluginId?.split(":")[1] || entry.name;
}

export function formatDate(iso) {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

function searchScore(entries, entry, tokens) {
  if (!tokens.length) return 1;
  const fields = [
    { text: `${entry.displayName || entry.name}`, weight: 5 },
    { text: entry.description || "", weight: 3 },
    { text: keywordsOf(entries, entry).join(" "), weight: 4 },
    { text: entry.bodyText || entry.readmeText || "", weight: 1 },
  ];
  let score = 0;
  for (const token of tokens) {
    let matched = false;
    for (const f of fields) {
      if (f.text.toLowerCase().includes(token)) {
        score += f.weight;
        matched = true;
      }
    }
    if (!matched) return 0; // every token must match somewhere (AND across tokens, OR across fields)
  }
  return score;
}

export function filterAndSort(entries, { query, activeTypes, sortOrder }) {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  let list = entries
    .map((e) => ({ entry: e, score: searchScore(entries, e, tokens) }))
    .filter(({ entry, score }) => score > 0 && (!activeTypes.size || activeTypes.has(entry.type)))
    .map(({ entry, score }) => ({ ...entry, _score: score }));

  if (sortOrder === "updated") {
    list.sort((a, b) => (b.lastUpdatedAt || "").localeCompare(a.lastUpdatedAt || ""));
  } else if (sortOrder === "name") {
    list.sort((a, b) => (a.displayName || a.name).localeCompare(b.displayName || b.name));
  } else {
    list.sort((a, b) => b._score - a._score);
  }
  return list;
}

export function typeCounts(entries) {
  const counts = { plugin: 0, skill: 0, command: 0, agent: 0 };
  for (const e of entries) counts[e.type] = (counts[e.type] || 0) + 1;
  return counts;
}

export function tagCloud(entries) {
  const freq = new Map();
  for (const e of entries) {
    if (e.type !== "plugin") continue;
    for (const k of e.keywords || []) freq.set(k, (freq.get(k) || 0) + 1);
  }
  const colors = ["var(--rust-500)", "var(--olive-500)", "var(--sky-500)", "var(--stone-500)"];
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 16)
    .map(([word, count], i) => ({ word, size: Math.min(30, 14 + count * 5), color: colors[i % colors.length] }));
}

export function growthPolyline(changelog) {
  const added = changelog
    .filter((e) => e.kind === "plugin-added")
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!added.length) return null;
  const points = [];
  let cumulative = 0;
  for (const e of added) {
    cumulative += 1;
    points.push(cumulative);
  }
  if (points.length === 1) points.unshift(0);
  const w = 460, top = 10, bottom = 130;
  const max = Math.max(...points, 1);
  const step = w / (points.length - 1 || 1);
  const coords = points.map((v, i) => {
    const x = i * step;
    const y = bottom - (v / max) * (bottom - top);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return {
    line: coords.join(" "),
    fill: `0,${bottom} ${coords.join(" ")} ${w},${bottom} 0,${bottom}`,
    from: added[0].date,
    to: added[added.length - 1].date,
  };
}
