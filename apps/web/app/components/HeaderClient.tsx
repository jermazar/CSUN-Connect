"use client";

import * as React from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import MoonToggle from "./theme/MoonToggle";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function HeaderClient() {
  const [userId, setUserId] = React.useState<string | null>(null);
  const [showConfirm, setShowConfirm] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (mounted) setUserId(data.user?.id ?? null);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      mounted = false;
      sub?.subscription.unsubscribe();
    };
  }, []);

  async function doSignOut() {
    await supabase.auth.signOut();
    setShowConfirm(false);
    window.location.assign("/");
  }

  // ---- styles
  const row: React.CSSProperties = {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  };
  const group: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 16,
  };
  const linkStyle: React.CSSProperties = {
    textDecoration: "underline",
    color: "var(--link)",
  };
  const button: React.CSSProperties = {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid var(--btn-border)",
    background: "var(--btn-bg)",
    color: "var(--btn-text)",
    cursor: "pointer",
  };

  return (
    <>
      <div style={row}>
        {/* LEFT: main nav (client-side links) */}
        <nav style={group}>
          <Link href="/" style={linkStyle}>Home</Link>
          <Link href="/feed" style={linkStyle}>Feed</Link>
          <Link href="/events" style={linkStyle}>Events</Link>
          <Link href="/calendar" style={linkStyle}>Calendar</Link>
          <Link href="/clubs" style={linkStyle}>Clubs</Link>

        </nav>

        {/* RIGHT: account actions + theme */}
        <div style={group}>
          {userId ? (
            <>
              <Link href="/account" style={linkStyle}>My Account</Link>
              <button onClick={() => setShowConfirm(true)} style={button}>Sign Out</button>
            </>
          ) : (
            <Link href="/sign-in" style={linkStyle}>My Account</Link>
          )}
          <MoonToggle />
        </div>
      </div>

      {/* Confirm sign-out modal */}
      {showConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.35)",
            display: "grid",
            placeItems: "center",
            zIndex: 50,
          }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--card)",
              color: "var(--text)",
              padding: 20,
              borderRadius: 12,
              width: 340,
              border: "1px solid var(--card-border)",
              boxShadow: "var(--shadow)" as any,
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Sign out?</h3>
            <p style={{ opacity: 0.8, marginTop: 0 }}>You can sign back in anytime.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={() => setShowConfirm(false)} style={button}>Cancel</button>
              <button
                onClick={doSignOut}
                style={{ ...button, background: "var(--brand-700)", borderColor: "var(--brand-800)" }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
