"use client";

import React from "react";
import { useTheme, Theme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const btn: React.CSSProperties = {
    padding: "6px 10px",
    borderRadius: 8,
    background: "var(--btn-bg)",
    color: "var(--btn-text)",
    border: "1px solid var(--btn-border)",
    cursor: "pointer",
  };

  const wrap: React.CSSProperties = { display: "flex", gap: 8 };

  function Button({ value, label }: { value: Theme; label: string }) {
    const active = theme === value;
    return (
      <button
        type="button"
        onClick={() => setTheme(value)}
        aria-pressed={active}
        title={`Use ${label.toLowerCase()} theme`}
        style={{
          ...btn,
          background: active ? "var(--btn-bg-hover)" : "var(--btn-bg)",
          border: active ? "2px solid var(--btn-border)" : "1px solid var(--btn-border)",
        }}
      >
        {label}
      </button>
    );
  }

  return (
    <div style={wrap}>
      <Button value="light" label="Light" />
      <Button value="dark" label="Dark" />
      <Button value="system" label="System" />
    </div>
  );
}
