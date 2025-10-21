"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Post = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  is_hidden: boolean | null;
  group_id: string | null;
};

type Profile = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
};

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}


export default function Page() {
  const [items, setItems] = useState<Post[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---------- data helpers ----------
  async function fetchProfiles(authorIds: string[]) {
    const unique = Array.from(new Set(authorIds.filter(Boolean)));
    if (!unique.length) return;

    const { data } = await supabase
  .from("profiles")
  .select("user_id, full_name, avatar_url")   // ⬅ add avatar_url
  .in("user_id", unique);

    if (data) {
      const map: Record<string, Profile> = {};
      for (const p of data as Profile[]) map[p.user_id] = p;
      setProfiles((prev) => ({ ...prev, ...map }));
    }
  }

  async function fetchLatest() {
    const { data, error } = await supabase
      .from("posts")
      .select("id, author_id, body, created_at, is_hidden, group_id")
      .is("group_id", null) // campus-only
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) setErr(error.message);
    else {
      setErr(null);
      const posts = (data ?? []) as Post[];
      setItems(posts);
      fetchProfiles(posts.map((p) => p.author_id));
    }
    setLoading(false);
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      setUserId(auth?.user?.id ?? null);

      await fetchLatest();
      if (!mounted) return;

      pollingRef.current = setInterval(fetchLatest, 5000);
      const onFocus = () => fetchLatest();
      window.addEventListener("focus", onFocus);

      return () => {
        mounted = false;
        if (pollingRef.current) clearInterval(pollingRef.current);
        window.removeEventListener("focus", onFocus);
      };
    })();
  }, []);

  async function submit() {
    if (!val.trim()) return;
    if (!userId) {
      setErr("Please sign in to post.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const { data, error } = await supabase
        .from("posts")
        .insert({ author_id: userId, body: val, group_id: null })
        .select("id, author_id, body, created_at, is_hidden, group_id")
        .single();

      if (error) throw error;

      if (data) {
        const p = data as Post;
        setItems((prev) => [p, ...prev]); // optimistic prepend
        fetchProfiles([p.author_id]);
      }
      setVal("");
    } catch (e: any) {
      setErr(e.message || "Failed to post");
    } finally {
      setBusy(false);
    }
  }

  const canPost = !!userId;

  // ---------- Inline styles (no Tailwind) ----------
  const pageWrap: React.CSSProperties = {
    maxWidth: 1280,            // whole page content width cap
    margin: "0 auto",
    padding: "24px",
    boxSizing: "border-box",
  };

  const grid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "420px minmax(0, 1fr)", // LEFT WIDTH | RIGHT FLEX
    columnGap: 32,
    alignItems: "start",
  };

  const leftCol: React.CSSProperties = {
    position: "sticky",
    top: 96,                   // distance from top when sticky (adjust)
    alignSelf: "start",
  };

  const composerCard: React.CSSProperties = {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,.04)",
    background: "#fff",
    width: 380,                // center the small card in the left column
    margin: "0 auto",          // <-- centers the composer INSIDE the left column
  };

  const smallText: React.CSSProperties = { fontSize: 12, opacity: 0.6 };
  const btn: React.CSSProperties = {
    border: "1px solid #111827",
    borderRadius: 12,
    padding: "6px 10px",
    cursor: "pointer",
    background: "#fff",
  };

  const feedCard: React.CSSProperties = {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 16,
    background: "#fff",
    boxShadow: "0 1px 3px rgba(0,0,0,.04)",
  };

  // ✦ Add these style objects inside your component (before the return):

const postCard: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 16,
  background: "#fff",
  boxShadow: "0 1px 3px rgba(0,0,0,.05)",
};

const postHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 8,
};

const authorRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const avatarStyle = (url?: string | null): React.CSSProperties => ({
  width: 36,
  height: 36,
  borderRadius: 9999,
  background: "#e5e7eb",
  border: "1px solid #d1d5db",
  backgroundImage: url ? `url(${url})` : undefined,
  backgroundSize: "cover",
  backgroundPosition: "center",
});

const nameStyle: React.CSSProperties = { fontWeight: 600 };
const timeStyle: React.CSSProperties = { fontSize: 12, opacity: 0.6, whiteSpace: "nowrap" };
const bodyStyle: React.CSSProperties = { whiteSpace: "pre-wrap", lineHeight: 1.6 };

  return (
    <main style={pageWrap}>
      <div style={grid}>
        {/* LEFT: composer */}
        <aside style={leftCol}>
          <section style={composerCard}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Share an update</h2>
              {!canPost && (
                <a href="/sign-in" style={{ ...smallText, textDecoration: "underline" }}>
                  Sign in to post
                </a>
              )}
            </div>

            <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
              <textarea
                placeholder="What's happening on campus?"
                value={val}
                onChange={(e) => setVal(e.target.value)}
                maxLength={5000}
                disabled={!canPost}
                style={{
                  width: "100%",
                  height: 112,
                  resize: "none",
                  border: 0,
                  outline: "none",
                  padding: 12,
                  boxSizing: "border-box",
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTop: "1px solid #e5e7eb",
                  padding: 8,
                }}
              >
                <span style={smallText}>{val.length}/5000</span>
                <button
                  onClick={submit}
                  disabled={busy || !val.trim() || !canPost}
                  style={{
                    ...btn,
                    opacity: busy || !val.trim() || !canPost ? 0.5 : 1,
                    pointerEvents: busy || !val.trim() || !canPost ? "none" : "auto",
                  }}
                >
                  {busy ? "Posting…" : "Post"}
                </button>
              </div>
            </div>

            {err && (
              <p
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: "#b91c1c",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 8,
                  padding: 8,
                }}
              >
                {err}
              </p>
            )}
            {!canPost && (
              <p style={{ ...smallText, marginTop: 8 }}>You must be signed in to post.</p>
            )}
          </section>
        </aside>

        {/* RIGHT: feed */}
        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: "4px 0 12px" }}>Campus Feed</h2>

          {loading ? (
            <div style={{ ...feedCard, opacity: 0.6 }}>Loading feed…</div>
          ) : items.length === 0 ? (
            <div style={{ ...feedCard, opacity: 0.6 }}>No posts yet. Be the first!</div>
          ) : (
            <ul style={{ display: "grid", gap: 12, listStyle: "none", padding: 0, margin: 0 }}>
  {items.map((p) => {
    const prof = profiles[p.author_id];
    const displayName = prof?.full_name || "Student";
    const avatar = prof?.avatar_url || null;

  return (
      <li key={p.id} style={postCard}>
        <div style={postHeader}>
          <div style={authorRow}>
            <div style={avatarStyle(avatar)} />
            <span style={nameStyle}>{displayName}</span>
          </div>
          <time style={timeStyle}>{formatTimestamp(p.created_at)}</time>
        </div>
        <div style={bodyStyle}>{p.body}</div>
      </li>
    );
  })}
</ul>
          )}
        </section>
      </div>
    </main>
  );
}
