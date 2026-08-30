import { useMemo } from "react";
import { useGithubStats } from "../hooks/useGithubStats.js";
import { typeCounts, tagCloud, growthPolyline } from "../lib/catalog.js";
import { en } from "../i18n/en.js";

export default function StatsView({ entries, changelog, contributors }) {
  const gh = useGithubStats();
  const counts = useMemo(() => typeCounts(entries), [entries]);
  const growth = useMemo(() => growthPolyline(changelog), [changelog]);
  const clouds = useMemo(() => tagCloud(entries), [entries]);

  return (
    <div>
      <div className="eyebrow">{en.stats.eyebrow}</div>
      <h1 className="h1" style={{ marginBottom: 32 }}>{en.stats.title}</h1>

      <div className="stat-grid">
        <div className="stat-tile"><div className="stat-value">{counts.plugin}</div><div className="stat-caption">{en.stats.counts.plugin}</div></div>
        <div className="stat-tile"><div className="stat-value">{counts.skill}</div><div className="stat-caption">{en.stats.counts.skill}</div></div>
        <div className="stat-tile"><div className="stat-value">{counts.command}</div><div className="stat-caption">{en.stats.counts.command}</div></div>
        <div className="stat-tile"><div className="stat-value">{counts.agent}</div><div className="stat-caption">{en.stats.counts.agent}</div></div>
      </div>

      <div className="stats-row">
        <div className="stats-panel">
          <div className="eyebrow">{en.stats.growthTitle}</div>
          {growth ? (
            <>
              <svg width="100%" height="140" viewBox="0 0 460 140" preserveAspectRatio="none">
                <polyline points={growth.line} fill="none" stroke="var(--rust-500)" strokeWidth="2"></polyline>
                <polygon points={growth.fill} fill="var(--rust-100)" opacity="0.5"></polygon>
              </svg>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--fg-subtle)", marginTop: 6 }}>
                <span>{growth.from}</span><span>{growth.to}</span>
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ padding: "16px 0" }}>{en.stats.growthEmpty}</div>
          )}
        </div>
        <div className="stats-panel">
          <div className="eyebrow">{en.stats.githubTitle}</div>
          <div className="gh-numbers">
            <div><div className="gh-number-value">{gh ? gh.stars : en.common.unknownDash}</div><div className="gh-number-label">{en.stats.stars}</div></div>
            <div><div className="gh-number-value">{gh ? gh.forks : en.common.unknownDash}</div><div className="gh-number-label">{en.stats.forks}</div></div>
          </div>
          <div className="footnote">{en.stats.githubFootnote}</div>
        </div>
      </div>

      <div className="stats-row-2">
        <div className="stats-panel">
          <div className="eyebrow">{en.stats.tagCloudTitle}</div>
          <div className="tag-cloud">
            {clouds.length ? clouds.map((t) => (
              <span key={t.word} style={{ fontSize: t.size, color: t.color }}>{t.word}</span>
            )) : <span className="footnote">{en.stats.tagCloudEmpty}</span>}
          </div>
        </div>
        <div className="stats-panel">
          <div className="eyebrow">{en.stats.contributorsTitle}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {contributors.map((c) => (
              <div className="contrib-row" key={c.name}>
                <div className="contrib-avatar">{c.initials}</div>
                <div className="contrib-name">{c.name}</div>
                <div className="contrib-commits">{c.commits}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
