import { useEffect, useState } from "react";

// Loads the build-time generated JSON (scripts/build-index.mjs,
// scripts/build-changelog.mjs). Relative paths so this works whether the app
// is served from a domain root or a GitHub Pages project subpath.
export function useCatalogData() {
  const [state, setState] = useState({
    entries: [],
    changelog: [],
    contributors: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [indexRes, changelogRes] = await Promise.all([
          fetch("./data/index.json"),
          fetch("./data/changelog.json"),
        ]);
        if (!indexRes.ok) throw new Error(`index.json: HTTP ${indexRes.status}`);
        if (!changelogRes.ok) throw new Error(`changelog.json: HTTP ${changelogRes.status}`);
        const index = await indexRes.json();
        const changelog = await changelogRes.json();
        if (cancelled) return;
        setState({
          entries: index.entries || [],
          changelog: changelog.entries || [],
          contributors: changelog.contributors || [],
          loading: false,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        setState((s) => ({ ...s, loading: false, error: err.message || String(err) }));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return state;
}
