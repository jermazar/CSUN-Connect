"use client";

import * as React from "react";

type Option = { value: string; label: string };

type Props = {
  options: Option[];
  value: string[];                 // selected values
  onChange: (next: string[]) => void;
  placeholder?: string;
  ariaLabel?: string;
};

export default function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  ariaLabel = "Multi select",
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const selectedCount = value.length;
  const display =
    selectedCount === 0
      ? ""
      : selectedCount === 1
      ? options.find(o => o.value === value[0])?.label ?? "1 selected"
      : `${selectedCount} selected`;

  const filtered = options.filter(o => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return o.label.toLowerCase().includes(s) || o.value.toLowerCase().includes(s);
  });

  function toggle(val: string, checked: boolean) {
    if (checked) onChange([...new Set([...value, val])]);
    else onChange(value.filter(v => v !== val));
  }

  const ctrl: React.CSSProperties = {
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "8px 10px",
    background: "var(--bg)",
    color: "var(--text)",
    width: "100%",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer",
  };

  const menu: React.CSSProperties = {
    position: "absolute",
    zIndex: 40,
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 6,
    background: "var(--card)",
    color: "var(--text)",
    border: "1px solid var(--card-border)",
    borderRadius: 10,
    boxShadow: "var(--shadow)" as any,
  };

  const searchBox: React.CSSProperties = {
    borderBottom: "1px solid var(--border)",
    padding: 8,
  };

  const list: React.CSSProperties = {
    maxHeight: 220,
    overflowY: "auto",
    padding: 8,
  };

  const row: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 4px",
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        aria-label={ariaLabel}
        style={ctrl}
        onClick={() => setOpen(v => !v)}
      >
        <span style={{ opacity: display ? 1 : 0.6 }}>
          {display || placeholder}
        </span>
        <span aria-hidden>▾</span>
      </button>

      {open && (
        <div style={menu} role="listbox" aria-multiselectable="true">
          <div style={searchBox}>
            <input
              autoFocus
              placeholder="Search…"
              value={q}
              onChange={e => setQ(e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "8px 10px",
                background: "var(--bg)",
                color: "var(--text)",
              }}
            />
          </div>
          <div style={list}>
            {filtered.length === 0 && (
              <div style={{ fontSize: 13, color: "var(--muted)", padding: 6 }}>
                No matches.
              </div>
            )}
            {filtered.map(opt => {
              const checked = value.includes(opt.value);
              return (
                <label key={opt.value} style={row}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={e => toggle(opt.value, e.target.checked)}
                  />
                  <span>{opt.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
