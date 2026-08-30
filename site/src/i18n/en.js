// All user-facing UI text lives here, not inline in components — the single
// place to translate/edit copy or later add another locale.
export const en = {
  brand: { name: "IKDD", sub: "marketplace" },

  nav: {
    catalog: "Catalog",
    whatsnew: "What's new",
    stats: "Stats",
    onboarding: "Getting started",
    github: "GitHub ↗",
  },

  typeLabels: {
    plugin: "Plugin",
    skill: "Skill",
    command: "Command",
    agent: "Agent",
  },

  common: {
    loading: "Loading…",
    loadError: (msg) => `Failed to load catalog data: ${msg}`,
    copy: "Copy",
    copied: "Copied",
    updatedPrefix: "updated",
    unknownDash: "—",
  },

  catalog: {
    eyebrow: "Search",
    title: "Find the right tool",
    lede: "Describe what you need — for example, \"a skill for code review\" — and see every plugin, skill, command, and agent that matches.",
    tourHint: "Tip: start with the search box above or the type filters below. The \"Install\" button on an artifact's page copies a ready-to-run command for Claude Code.",
    tourDismiss: "Got it",
    searchPlaceholder: "e.g. a skill for code review",
    facetsLabel: "Type:",
    recommended: "Recommended to start",
    allResults: "All results",
    sort: {
      relevance: "Sort: relevance",
      updated: "Sort: last updated",
      name: "Sort: name",
    },
    empty: "Nothing found. Try a different query or clear the filters.",
    fromParent: (name) => `from "${name}"`,
  },

  detail: {
    back: "← Catalog",
    fromParent: (name) => `from "${name}"`,
    install: "Install",
    children: "Child artifacts",
    related: "Related artifacts",
    notFound: "Artifact not found.",
  },

  whatsnew: {
    eyebrow: "What's new",
    title: "Update history",
    subscribe: "Subscribe (RSS)",
    empty: "No updates yet.",
  },

  stats: {
    eyebrow: "Stats",
    title: "Marketplace at a glance",
    counts: { plugin: "plugins", skill: "skills", command: "commands", agent: "agents" },
    growthTitle: "Plugin growth",
    growthEmpty: "Not enough data for a chart yet.",
    githubTitle: "GitHub",
    stars: "stars",
    forks: "forks",
    githubFootnote: "Data from the GitHub API; if rate-limited, shows a dash without breaking the page.",
    tagCloudTitle: "Tag cloud",
    tagCloudEmpty: "No tags yet.",
    contributorsTitle: "Contributors",
  },

  onboarding: {
    eyebrow: "Getting started",
    title: "How to get started",
    lede: "The Claude Code marketplace is a catalog of plugins (commands, skills, agents) you can install directly in Claude Code with one line.",
    step1: { index: "Step 1", title: "Add the marketplace" },
    step2: { index: "Step 2", title: "Install the plugin you need", placeholder: "name" },
    step3: { index: "Step 3", title: "Browse the full catalog", cta: "Browse all plugins →" },
    progress: "Progress",
    checklist: {
      added: "Added the marketplace",
      browsed: "Browsed the catalog",
      installed: "Installed your first plugin",
    },
    tourInfo: "On your first visit, a short guided tour appears here — search, filters, the \"Install\" button. You can restart it with the button below.",
    tourReset: "Show the tour again",
  },
};
