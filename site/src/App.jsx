import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import TopBar from "./components/TopBar.jsx";
import CatalogView from "./components/CatalogView.jsx";
import DetailView from "./components/DetailView.jsx";
import WhatsnewView from "./components/WhatsnewView.jsx";
import StatsView from "./components/StatsView.jsx";
import OnboardingView from "./components/OnboardingView.jsx";
import { useCatalogData } from "./hooks/useCatalogData.js";
import { LS } from "./lib/constants.js";
import { setFlag } from "./lib/storage.js";
import { en } from "./i18n/en.js";

export default function App() {
  const { entries, changelog, contributors, loading, error } = useCatalogData();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === "/catalog" || location.pathname === "/") {
      setFlag(LS.browsedCatalog, true);
    }
  }, [location.pathname]);

  // Cmd/Ctrl+K — jump to catalog search, from anywhere in the app.
  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (location.pathname !== "/catalog") navigate("/catalog");
        requestAnimationFrame(() => document.getElementById("search-input")?.focus());
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [location.pathname, navigate]);

  return (
    <div id="app">
      <TopBar changelog={changelog} />
      <main>
        {error ? (
          <div className="empty-state">{en.common.loadError(error)}</div>
        ) : loading ? (
          <div className="empty-state">{en.common.loading}</div>
        ) : (
          <Routes>
            <Route path="/" element={<Navigate to="/catalog" replace />} />
            <Route path="/catalog" element={<CatalogView entries={entries} />} />
            <Route path="/item/:id" element={<DetailView entries={entries} />} />
            <Route path="/whatsnew" element={<WhatsnewView changelog={changelog} />} />
            <Route
              path="/stats"
              element={<StatsView entries={entries} changelog={changelog} contributors={contributors} />}
            />
            <Route path="/onboarding" element={<OnboardingView />} />
            <Route path="*" element={<Navigate to="/catalog" replace />} />
          </Routes>
        )}
      </main>
    </div>
  );
}
