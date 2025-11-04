import React from "react";
import Script from "next/script";
import dynamic from "next/dynamic";
import Providers from "./providers"; // default import
import HeaderClient from "./components/HeaderClient";
import "./theme.css";

/** Client-only moon/sun toggle (no SSR) */
const MoonToggle = dynamic(() => import("./components/theme/MoonToggle"), { ssr: false });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const shell: React.CSSProperties = {
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    color: "var(--text)",
    background: "var(--bg)",
    margin: 0,
    minHeight: "100vh",
  };

  const stickyHeader: React.CSSProperties = {
    position: "sticky",
    top: 0,
    zIndex: 50,
    background: "var(--bg)",
    borderBottom: "1px solid var(--border)",
    paddingBottom: 10,
    boxShadow: "0 2px 3px rgba(0,0,0,0.05)",
  };

  const headerInner: React.CSSProperties = {
    maxWidth: 960,
    margin: "0 auto",
    padding: "10px 24px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    justifyContent: "space-between",
    boxSizing: "border-box",
  };

  const main: React.CSSProperties = {
    maxWidth: 960,
    margin: "16px auto 0 auto",
    padding: "0 24px 24px 24px",
    boxSizing: "border-box",
  };

  // Pre-hydration theme set (prevents flash)
  const initCode = `
    try {
      var saved = localStorage.getItem('theme') || 'system';
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var actual = (saved === 'system') ? (prefersDark ? 'dark' : 'light') : saved;
      document.documentElement.setAttribute('data-theme', actual);
    } catch (e) {}
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">{initCode}</Script>
      </head>
      <body style={shell}>
        <div style={stickyHeader}>
          <div style={headerInner}>
            <HeaderClient />
          </div>
        </div>

        <main style={main}>
          <Providers>{children}</Providers>
        </main>
      </body>
    </html>
  );
}
