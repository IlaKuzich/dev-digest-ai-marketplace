import { useNavigate } from "react-router-dom";
import { TYPE_BADGE } from "../lib/constants.js";
import { formatDate } from "../lib/catalog.js";
import { en } from "../i18n/en.js";

export default function Card({ item, parent, keywords = [] }) {
  const navigate = useNavigate();
  return (
    <button className="card" onClick={() => navigate(`/item/${encodeURIComponent(item.id)}`)}>
      <div className="card-top">
        <span className={`badge ${TYPE_BADGE[item.type]}`}>{en.typeLabels[item.type]}</span>
        <span className="card-updated">{formatDate(item.lastUpdatedAt)}</span>
      </div>
      <div className="card-title">{item.displayName || item.name}</div>
      {parent && <div className="card-parent">{en.catalog.fromParent(parent.displayName)}</div>}
      <div className="card-desc">{item.description}</div>
      <div className="chip-row">
        {keywords.slice(0, 4).map((k) => (
          <span className="chip" key={k}>{k}</span>
        ))}
      </div>
    </button>
  );
}
