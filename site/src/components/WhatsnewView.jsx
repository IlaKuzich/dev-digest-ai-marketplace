import { useEffect } from "react";
import { LS } from "../lib/constants.js";
import { en } from "../i18n/en.js";

export default function WhatsnewView({ changelog }) {
  useEffect(() => {
    if (!changelog.length) return;
    try { localStorage.setItem(LS.whatsnewLastSeen, changelog[0].date); } catch { /* ignore */ }
  }, [changelog]);

  return (
    <div className="view-medium">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <div className="eyebrow">{en.whatsnew.eyebrow}</div>
          <h1 className="h1" style={{ margin: 0 }}>{en.whatsnew.title}</h1>
        </div>
        <a href="./feed.xml" className="btn-secondary" style={{ display: "inline-flex", alignItems: "center" }}>
          {en.whatsnew.subscribe}
        </a>
      </div>

      {changelog.length ? (
        <div className="timeline">
          {changelog.map((entry, i) => (
            <div className="timeline-item" key={`${entry.commitSha}-${i}`}>
              <div className="timeline-dot" style={{ background: entry.dot }}></div>
              <div className="timeline-date">{entry.date}</div>
              <div className="timeline-summary">{entry.summary}</div>
              <div className="timeline-kind">{entry.kindLabel} · <span style={{ fontFamily: "var(--font-mono)" }}>{entry.commitSha}</span></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">{en.whatsnew.empty}</div>
      )}
    </div>
  );
}
