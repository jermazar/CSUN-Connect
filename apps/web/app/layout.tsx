import React from "react";
import { Providers } from "./providers";
import HeaderClient from "./components/HeaderClient";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const shell: React.CSSProperties = {
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    color: "#111",
    background: "#fff",
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
        <HeaderClient />
        <main style={main}>
          <Providers>{children}</Providers>
        </main>
      </body>
    </html>
  );
}
