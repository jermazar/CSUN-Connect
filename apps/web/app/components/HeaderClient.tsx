"use client";

import * as React from "react";
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
    width: "100%",                               // 🔥 make the bar span full width
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",             // push left vs right apart
  };
  const group: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 16,                                     // consistent spacing between items
  };
  const link: React.CSSProperties = {
    textDecoration: "underline",
    color: "var(--link)",
  };
  const button: React.CSSProperties = {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid var(--brand-700)",
    background: "var(--brand-600)",
    color: "#fff",
    cursor: "pointer",
  };

  return (
    <>
      <div style={row}>
        {/* LEFT: main nav */}
        <nav style={group}>
          <a href="/" style={link}>Home</a>
          <a href="/feed" style={link}>Feed</a>
          <a href="/events" style={link}>Events</a>
        </nav>

        {/* RIGHT: account actions + theme */}
        <div style={group}>
          {userId ? (
            <>
              <a href="/account" style={link}>My Account</a>
              <button onClick={() => setShowConfirm(true)} style={button}>Sign Out</button>
            </>
          ) : (
            <a href="/sign-in" style={link}>My Account</a>
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
              background: "#fff",
              padding: 20,
              borderRadius: 12,
              width: 340,
              boxShadow: "0 10px 30px rgba(0,0,0,.2)",
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
