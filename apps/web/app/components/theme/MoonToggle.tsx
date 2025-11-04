"use client";

import React from "react";

function getCurrentTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(t: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", t);
  try { localStorage.setItem("theme", t); } catch {}
}

export default function MoonToggle() {
  const [actual, setActual] = React.useState<"light" | "dark">(() => getCurrentTheme());

  React.useEffect(() => {
    const obs = new MutationObserver(() => setActual(getCurrentTheme()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const next = actual === "dark" ? "light" : "dark";

  const btn: React.CSSProperties = {
    width: 36, height: 36, display: "inline-flex", alignItems: "center", justifyContent: "center",
    borderRadius: 9999, background: "var(--card)", border: "1px solid var(--card-border)",
    color: "var(--text)", cursor: "pointer", boxShadow: "var(--shadow)",
  };

  return (
    <button
      type="button"
      onClick={() => { applyTheme(next); setActual(next); }}
      aria-label={actual === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={actual === "dark" ? "Light mode" : "Dark mode"}
      style={btn}
    >
      {actual === "dark" ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z" stroke="currentColor" strokeWidth="1.6"/>
          <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 1 0 9.79 9.79Z"
            stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  );
}
