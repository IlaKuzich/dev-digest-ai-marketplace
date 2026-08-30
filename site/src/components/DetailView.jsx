import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Card from "./Card.jsx";
import { REPO, MARKETPLACE_SLUG, TYPE_BADGE } from "../lib/constants.js";
import { findEntry, parentOf, keywordsOf, installNameOf, formatDate } from "../lib/catalog.js";
import { copyToClipboard } from "../lib/clipboard.js";
import { en } from "../i18n/en.js";

export default function DetailView({ entries }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [copyLabel, setCopyLabel] = useState(en.common.copy);

  const selected = findEntry(entries, id) || entries.find((e) => e.type === "plugin") || null;
  if (!selected) return <div className="empty-state">{en.detail.notFound}</div>;

  const parent = parentOf(entries, selected);
  const kws = keywordsOf(entries, selected);
  const children = (selected.childIds || []).map((cid) => findEntry(entries, cid)).filter(Boolean);
  const baseId = selected.type === "plugin" ? selected.id : selected.parentPluginId;
  const related = entries
    .filter((e) => e.type === "plugin" && e.id !== baseId && (e.keywords || []).some((k) => kws.includes(k)))
    .slice(0, 3);
  const installName = installNameOf(entries, selected);
  const installText = `/plugin marketplace add ${REPO}\n/plugin install ${installName}@${MARKETPLACE_SLUG}`;

  function onCopy() {
    copyToClipboard(installText).then(() => {
      setCopyLabel(en.common.copied);
      setTimeout(() => setCopyLabel(en.common.copy), 1800);
    });
  }

  return (
    <div className="view-wide">
      <button className="back-link" onClick={() => navigate("/catalog")}>{en.detail.back}</button>

      <div>
        <span className={`badge ${TYPE_BADGE[selected.type]}`}>{en.typeLabels[selected.type]}</span>
        {parent && (
          <Link
            to={`/item/${encodeURIComponent(parent.id)}`}
            className="back-link"
            style={{ marginLeft: 10, display: "inline" }}
          >
            {en.detail.fromParent(parent.displayName)}
          </Link>
        )}
      </div>

      <h1 className="h1" style={{ marginTop: 14 }}>{selected.displayName || selected.name}</h1>
      <div className="detail-meta">
        v{selected.version || parent?.version || "0.0.0"} ·{" "}
        {selected.author?.name || parent?.author?.name || en.common.unknownDash} · {en.common.updatedPrefix}{" "}
        {formatDate(selected.lastUpdatedAt)}
      </div>
      <p className="detail-readme">{selected.readmeText || selected.bodyText || selected.description || ""}</p>

      <div className="chip-row" style={{ marginBottom: 28 }}>
        {kws.map((k) => (
          <span className="chip" key={k}>{k}</span>
        ))}
      </div>

      <div className="panel">
        <div className="eyebrow">{en.detail.install}</div>
        <div className="install-code">{installText}</div>
        <button className="btn" onClick={onCopy}>{copyLabel}</button>
      </div>

      {children.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div className="eyebrow">{en.detail.children}</div>
          <div className="child-list">
            {children.map((c) => (
              <Link key={c.id} to={`/item/${encodeURIComponent(c.id)}`} className="child-row">
                <span className={`badge ${TYPE_BADGE[c.type]}`}>{en.typeLabels[c.type]}</span>
                <span className="child-title">{c.displayName || c.name}</span>
                <span className="child-desc">{c.description}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {related.length > 0 && (
        <div>
          <div className="eyebrow">{en.detail.related}</div>
          <div className="grid-3">
            {related.map((r) => (
              <Card key={r.id} item={r} parent={null} keywords={r.keywords || []} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
