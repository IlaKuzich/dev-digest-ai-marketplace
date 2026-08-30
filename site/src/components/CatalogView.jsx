import { useMemo, useState } from "react";
import Card from "./Card.jsx";
import { TYPE_BADGE, LS } from "../lib/constants.js";
import { filterAndSort, keywordsOf, parentOf, typeCounts } from "../lib/catalog.js";
import { flag, setFlag } from "../lib/storage.js";
import { en } from "../i18n/en.js";

export default function CatalogView({ entries }) {
  const [query, setQuery] = useState("");
  const [activeTypes, setActiveTypes] = useState(() => new Set());
  const [sortOrder, setSortOrder] = useState("relevance");
  const [tourSeen, setTourSeen] = useState(() => flag(LS.tourSeen));

  const counts = useMemo(() => typeCounts(entries), [entries]);
  const recommended = useMemo(
    () => entries.filter((e) => e.type === "plugin" && (e.keywords || []).includes("starter")).slice(0, 3),
    [entries]
  );
  const list = useMemo(
    () => filterAndSort(entries, { query, activeTypes, sortOrder }),
    [entries, query, activeTypes, sortOrder]
  );

  function toggleType(t) {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  }

  return (
    <div>
      <div className="view-narrow">
        <div className="eyebrow">{en.catalog.eyebrow}</div>
        <h1 className="h1">{en.catalog.title}</h1>
        <p className="lede">{en.catalog.lede}</p>
      </div>

      {!tourSeen && (
        <div className="tour-banner">
          <p>{en.catalog.tourHint}</p>
          <button onClick={() => { setFlag(LS.tourSeen, true); setTourSeen(true); }}>
            {en.catalog.tourDismiss}
          </button>
        </div>
      )}

      <div className="search-box">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--fg-subtle)" strokeWidth="1.5">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          id="search-input"
          type="text"
          className="search-input"
          placeholder={en.catalog.searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="facets">
        <span className="facets-label">{en.catalog.facetsLabel}</span>
        {Object.keys(TYPE_BADGE).map((key) => (
          <button
            key={key}
            className={`facet-chip ${activeTypes.has(key) ? "active" : ""}`}
            onClick={() => toggleType(key)}
          >
            {en.typeLabels[key]} <span className="count">{counts[key] || 0}</span>
          </button>
        ))}
      </div>

      {recommended.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <div className="eyebrow">{en.catalog.recommended}</div>
          <div className="grid-3">
            {recommended.map((item) => (
              <Card key={item.id} item={item} parent={parentOf(entries, item)} keywords={keywordsOf(entries, item)} />
            ))}
          </div>
        </div>
      )}

      <div className="section-label">
        <div className="eyebrow">{en.catalog.allResults} · <span className="result-count">{list.length}</span></div>
        <select className="sort-select" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
          <option value="relevance">{en.catalog.sort.relevance}</option>
          <option value="updated">{en.catalog.sort.updated}</option>
          <option value="name">{en.catalog.sort.name}</option>
        </select>
      </div>

      {list.length ? (
        <div className="grid-3">
          {list.map((item) => (
            <Card key={item.id} item={item} parent={parentOf(entries, item)} keywords={keywordsOf(entries, item)} />
          ))}
        </div>
      ) : (
        <div className="empty-state">{en.catalog.empty}</div>
      )}
    </div>
  );
}
