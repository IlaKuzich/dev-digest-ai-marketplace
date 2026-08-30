import { useEffect, useState } from "react";
import { REPO } from "../lib/constants.js";

// Client-side call to the public GitHub REST API (CORS-enabled, no backend
// needed). Fails silently on rate limits / offline — callers show a "—".
export function useGithubStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`https://api.github.com/repos/${REPO}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setStats({ stars: data.stargazers_count, forks: data.forks_count });
      })
      .catch(() => { /* offline or rate-limited — leave placeholder */ });
    return () => { cancelled = true; };
  }, []);

  return stats;
}
