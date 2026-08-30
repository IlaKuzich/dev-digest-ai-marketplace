import { Link, useLocation } from "react-router-dom";
import { REPO, LS } from "../lib/constants.js";
import { flag } from "../lib/storage.js";
import { en } from "../i18n/en.js";

const TABS = [
  { path: "/catalog", label: en.nav.catalog },
  { path: "/whatsnew", label: en.nav.whatsnew },
  { path: "/stats", label: en.nav.stats },
  { path: "/onboarding", label: en.nav.onboarding },
];

function isActive(pathname, tabPath) {
  if (tabPath === "/catalog") return pathname === "/catalog" || pathname === "/" || pathname.startsWith("/item/");
  return pathname === tabPath;
}

export default function TopBar({ changelog }) {
  const { pathname } = useLocation();
  const hasUnseen = (() => {
    if (!changelog.length) return false;
    const lastSeen = (() => { try { return localStorage.getItem(LS.whatsnewLastSeen); } catch { return null; } })();
    return !lastSeen || changelog[0].date > lastSeen;
  })();

  return (
    <div className="topbar">
      <div className="topbar-left">
        <div className="brand">
          <div className="brand-mark"></div>
          <span className="brand-name">{en.brand.name}</span>
          <span className="brand-sub">{en.brand.sub}</span>
        </div>
        <div className="tabs">
          {TABS.map((tab) => (
            <Link
              key={tab.path}
              to={tab.path}
              className={`tab ${isActive(pathname, tab.path) ? "active" : ""}`}
            >
              {tab.label}
              {tab.path === "/whatsnew" && hasUnseen ? " •" : ""}
            </Link>
          ))}
        </div>
      </div>
      <div className="topbar-right">
        <div className="kbd">⌘K</div>
        <a href={`https://github.com/${REPO}`} target="_blank" rel="noopener noreferrer">{en.nav.github}</a>
      </div>
    </div>
  );
}
