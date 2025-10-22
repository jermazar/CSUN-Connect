import React from "react";
import { Providers } from "./providers";
import HeaderClient from "./components/HeaderClient";
import "./theme.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const shell: React.CSSProperties = {
    fontFamily:
      "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    color: "var(--text)",
    background: "var(--bg)",
    margin: 0,
    minHeight: "100vh",
  };

  // sticky header container so it stays at the top
  const stickyHeader: React.CSSProperties = {
    position: "sticky",
    top: 0,
    zIndex: 50,
    background: "var(--bg)",
    borderBottom: "1px solid var(--border)",
     paddingBottom: 10,
    boxShadow: "0 2px 3px rgba(0,0,0,0.05)",
  };

  const main: React.CSSProperties = {
    maxWidth: 960,
    margin: "16px auto 0 auto",
    padding: "0 24px 24px 24px",
    boxSizing: "border-box",
  };

  return (
    <html lang="en">
      <body style={shell}>
        <div style={stickyHeader}>
          <HeaderClient />
        </div>
        <main style={main}>
          <Providers>{children}</Providers>
        </main>
      </body>
    </html>
  );
}
