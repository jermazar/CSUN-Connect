"use client";

import * as React from "react";
import { createClient } from "@supabase/supabase-js";

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
    return () => sub?.subscription.unsubscribe();
  }, []);

  async function doSignOut() {
    await supabase.auth.signOut();
    setShowConfirm(false);
    // Hard refresh to clear any client state
    window.location.assign("/");
  }

  // Inline styles so nothing overrides layout
  const wrap: React.CSSProperties = {
    padding: "12px 24px 0 24px",
    boxSizing: "border-box",
  };
  const bar: React.CSSProperties = {
    maxWidth: 960,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  };
  const nav: React.CSSProperties = { display: "flex", alignItems: "center", gap: 16 };
  const link: React.CSSProperties = { textDecoration: "underline", color: "rebeccapurple" };
  const btn: React.CSSProperties = {
    border: "1px solid #111827",
    borderRadius: 8,
    padding: "6px 10px",
    background: "#fff",
    cursor: "pointer",
  };

  return (
    <>
      <div style={wrap}>
        <div style={bar}>
          {/* Left */}
          <nav style={nav}>
            <a href="/" style={link}>Home</a>
            <a href="/feed" style={link}>Feed</a>
          </nav>

          {/* Right */}
          <div style={nav}>
            {userId ? (
              <>
                <a href="/account" style={link}>My Account</a>
                <button style={btn} onClick={() => setShowConfirm(true)}>Sign Out</button>
              </>
            ) : (
              <a href="/sign-in" style={link}>My Account</a>
            )}
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,.35)",
            display: "grid", placeItems: "center", zIndex: 50
          }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", padding: 20, borderRadius: 12, width: 340, boxShadow: "0 10px 30px rgba(0,0,0,.2)" }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Sign out?</h3>
            <p style={{ opacity: .8, marginTop: 0 }}>You can sign back in anytime.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={() => setShowConfirm(false)} style={btn}>Cancel</button>
              <button onClick={doSignOut} style={{ ...btn, borderColor: "#b91c1c", color: "#b91c1c" }}>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
