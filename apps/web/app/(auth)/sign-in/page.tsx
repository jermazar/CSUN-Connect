"use client";

import * as React from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SignInPage() {
  const [email, setEmail] = React.useState("");
  const [pw, setPw] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!email.trim()) return setErr("Email is required.");
    if (!pw) return setErr("Password is required.");
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pw,
      });
      if (error) throw error;
      window.location.assign("/feed");
    } catch (e: any) {
      setErr(e.message || "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  // styles (consistent with your theme)
  const page: React.CSSProperties = { maxWidth: 560, margin: "24px auto", padding: "0 24px" };
  const card: React.CSSProperties = {
    border: "1px solid var(--elev-border)",
    background: "var(--card)",
    color: "var(--text)",
    borderRadius: 16,
    boxShadow: "var(--shadow)" as any,
    padding: 20,
  };
  const row: React.CSSProperties = { display: "grid", gap: 6 };
  const input: React.CSSProperties = {
    border: "1px solid var(--border)",
    background: "var(--bg)",
    color: "var(--text)",
    borderRadius: 8,
    padding: "10px 12px",
  };
  const button: React.CSSProperties = {
    border: "1px solid var(--btn-border)",
    background: "var(--btn-bg)",
    color: "var(--btn-text)",
    borderRadius: 10,
    padding: "10px 14px",
    cursor: "pointer",
  };
  const link: React.CSSProperties = { color: "var(--link)", textDecoration: "underline" };

  return (
    <main style={page}>
      <h1 style={{ margin: "0 0 12px 0" }}>Welcome back</h1>
      <p style={{ margin: "0 0 16px 0", color: "var(--muted)" }}>
        Sign in to continue to <strong>CSUN Connect</strong>.
      </p>

      <form onSubmit={onSubmit} style={{ ...card, display: "grid", gap: 14 }}>
        <div style={row}>
          <label>Email</label>
          <input
            type="email"
            style={input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@my.csun.edu"
          />
        </div>

        <div style={row}>
          <label>Password</label>
          <input
            type="password"
            style={input}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {err && (
          <p
            style={{
              margin: 0,
              color: "#b91c1c",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              padding: 10,
              borderRadius: 8,
            }}
          >
            {err}
          </p>
        )}

        <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
          <button type="submit" disabled={busy} style={{ ...button, opacity: busy ? 0.6 : 1 }}>
            {busy ? "Signing in…" : "Sign In"}
          </button>

          <a href="/sign-up" style={link}>
            Create an account
          </a>
        </div>
      </form>
    </main>
  );
}
