"use client";

import * as React from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SignUpPage() {
  const [first, setFirst] = React.useState("");
  const [last, setLast] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [pw, setPw] = React.useState("");

  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);

    if (!first.trim() || !last.trim()) return setErr("Please enter your first and last name.");
    if (!email.trim()) return setErr("Email is required.");
    if (pw.length < 8) return setErr("Password must be at least 8 characters.");

    setBusy(true);
    try {
      const full = `${first.trim()} ${last.trim()}`.trim();

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: pw,
        options: {
          data: {
            first_name: first.trim(),
            last_name: last.trim(),
            full_name: full,
          },
        },
      });
      if (error) throw error;

      // If email confirmations are disabled, a session will exist and we can
      // ensure a profiles row immediately (harmless if trigger already inserts).
      if (data.user && data.session) {
        await supabase
          .from("profiles")
          .insert({ id: data.user.id, user_id: data.user.id, full_name: full })
          .select("id")
          .single()
          .catch(() => null); // ignore if already exists
        window.location.assign("/feed");
        return;
      }

      // Otherwise, they must confirm via email first.
      setOk("Account created! Check your email to confirm your account.");
    } catch (e: any) {
      setErr(e.message || "Sign up failed");
    } finally {
      setBusy(false);
    }
  }

  // styles
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
  const two: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
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
      <h1 style={{ margin: "0 0 12px 0" }}>Create your account</h1>
      <p style={{ margin: "0 0 16px 0", color: "var(--muted)" }}>
        Join <strong>CSUN Connect</strong> to post, join events, and more.
      </p>

      <form onSubmit={onSubmit} style={{ ...card, display: "grid", gap: 14 }}>
        <div style={two}>
          <div style={row}>
            <label>First name</label>
            <input style={input} value={first} onChange={(e) => setFirst(e.target.value)} />
          </div>
          <div style={row}>
            <label>Last name</label>
            <input style={input} value={last} onChange={(e) => setLast(e.target.value)} />
          </div>
        </div>

        <div style={row}>
          <label>Email</label>
          <input type="email" style={input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@my.csun.edu" />
        </div>

        <div style={row}>
          <label>Password</label>
          <input type="password" style={input} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 8 characters" />
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
        {ok && (
          <p
            style={{
              margin: 0,
              color: "#065f46",
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              padding: 10,
              borderRadius: 8,
            }}
          >
            {ok}
          </p>
        )}

        <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
          <button type="submit" disabled={busy} style={{ ...button, opacity: busy ? 0.6 : 1 }}>
            {busy ? "Creating…" : "Create account"}
          </button>

          <a href="/sign-in" style={link}>
            Already have an account? Sign in
          </a>
        </div>
      </form>
    </main>
  );
}
