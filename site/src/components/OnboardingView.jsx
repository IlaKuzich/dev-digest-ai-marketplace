import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { REPO, MARKETPLACE_SLUG, LS } from "../lib/constants.js";
import { flag, setFlag } from "../lib/storage.js";
import { copyToClipboard } from "../lib/clipboard.js";
import { en } from "../i18n/en.js";

export default function OnboardingView() {
  const navigate = useNavigate();
  const [, forceRender] = useState(0);
  const [copyLabel, setCopyLabel] = useState(en.common.copy);

  const steps = [
    { key: LS.addedMarketplace, label: en.onboarding.checklist.added },
    { key: LS.browsedCatalog, label: en.onboarding.checklist.browsed },
    { key: LS.installedPlugin, label: en.onboarding.checklist.installed },
  ];

  function toggleStep(key) {
    setFlag(key, !flag(key));
    forceRender((n) => n + 1);
  }

  function onCopyAdd() {
    copyToClipboard(`/plugin marketplace add ${REPO}`).then(() => {
      setFlag(LS.addedMarketplace, true);
      setCopyLabel(en.common.copied);
      forceRender((n) => n + 1);
      setTimeout(() => setCopyLabel(en.common.copy), 1800);
    });
  }

  return (
    <div className="view-narrow">
      <div className="eyebrow">{en.onboarding.eyebrow}</div>
      <h1 className="h1">{en.onboarding.title}</h1>
      <p className="lede">{en.onboarding.lede}</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 36 }}>
        <div className="step-card">
          <div className="step-index">{en.onboarding.step1.index}</div>
          <div className="step-title">{en.onboarding.step1.title}</div>
          <div className="step-code">/plugin marketplace add {REPO}</div>
          <button className="btn" onClick={onCopyAdd}>{copyLabel}</button>
        </div>
        <div className="step-card">
          <div className="step-index">{en.onboarding.step2.index}</div>
          <div className="step-title">{en.onboarding.step2.title}</div>
          <div className="step-code">/plugin install &lt;{en.onboarding.step2.placeholder}&gt;@{MARKETPLACE_SLUG}</div>
        </div>
        <div className="step-card">
          <div className="step-index">{en.onboarding.step3.index}</div>
          <div className="step-title">{en.onboarding.step3.title}</div>
          <button className="btn" onClick={() => navigate("/catalog")}>{en.onboarding.step3.cta}</button>
        </div>
      </div>

      <div className="eyebrow">{en.onboarding.progress}</div>
      <div className="checklist" style={{ marginBottom: 32 }}>
        {steps.map((s) => {
          const done = flag(s.key);
          return (
            <div className="checklist-row" key={s.key} onClick={() => toggleStep(s.key)}>
              <div className={`checklist-box ${done ? "done" : ""}`}></div>
              <div className={`checklist-label ${done ? "done" : ""}`}>{s.label}</div>
            </div>
          );
        })}
      </div>

      <div className="info-box">
        <p>{en.onboarding.tourInfo}</p>
        <button
          className="btn-secondary"
          style={{ marginTop: 12 }}
          onClick={() => { setFlag(LS.tourSeen, false); navigate("/catalog"); }}
        >
          {en.onboarding.tourReset}
        </button>
      </div>
    </div>
  );
}
