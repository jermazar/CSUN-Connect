"use client";

import * as React from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Club = {
  code: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
};

type Membership = {
  club_code: string;
};

export default function Page() {  // <-- default export is a React component
  const [userId, setUserId] = React.useState<string | null>(null);
  const [clubs, setClubs] = React.useState<Club[]>([]);
  const [joined, setJoined] = React.useState<Set<string>>(new Set());
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [openCode, setOpenCode] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);

      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      if (!cancelled) setUserId(uid);

      try {
        const { data: clubRows, error: clubErr } = await supabase
          .from("clubs")
          .select("code,name,description,cover_image_url")
          .eq("is_active", true)
          .order("name");
        if (clubErr) throw clubErr;
        if (!cancelled && clubRows) setClubs(clubRows as Club[]);

        if (uid) {
          const { data: memRows, error: memErr } = await supabase
            .from("club_members")
            .select("club_code")
            .eq("user_id", uid);
          if (memErr) throw memErr;
          if (!cancelled) {
            const s = new Set<string>((memRows || []).map((m: Membership) => m.club_code));
            setJoined(s);
          }
        } else {
          if (!cancelled) setJoined(new Set());
        }
      } catch (e: any) {
        if (!cancelled) setErr(e.message || "Failed to load clubs");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function joinClub(code: string) {
    if (!userId) { setErr("Please sign in to join clubs."); return; }
    setErr(null);
    const { error } = await supabase
      .from("club_members")
      .insert({ club_code: code, user_id: userId, role: "member" });
    if (error) { setErr(error.message); return; }
    setJoined(prev => new Set(prev).add(code));
  }

  async function leaveClub(code: string) {
    if (!userId) return;
    setErr(null);
    const { error } = await supabase
      .from("club_members")
      .delete()
      .eq("club_code", code)
      .eq("user_id", userId);
    if (error) { setErr(error.message); return; }
    setJoined(prev => {
      const s = new Set(prev);
      s.delete(code);
      return s;
    });
  }

  const q = search.trim().toLowerCase();
  const filtered = q
    ? clubs.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
    : clubs;

  // styles
  const page: React.CSSProperties = { maxWidth: 960, margin: "0 auto", padding: "16px 24px" };
  const bar: React.CSSProperties  = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 };
  const searchBox: React.CSSProperties = { border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", borderRadius: 8, padding: "8px 10px", width: 320 };
  const panel: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--elev-border)", borderRadius: 16, boxShadow: "var(--shadow)" as any, padding: 12 };
  const scroller: React.CSSProperties = { maxHeight: "70vh", overflow: "auto", padding: 6 };
  const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 };
  const card: React.CSSProperties = { border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--bg)", cursor: "pointer" };
  const img: React.CSSProperties  = { width: "100%", height: 120, objectFit: "cover", background: "#eee" };
  const title: React.CSSProperties= { fontWeight: 600, padding: "8px 10px 0 10px" };
  const subtitle: React.CSSProperties = { opacity: .8, fontSize: 13, padding: "4px 10px 10px 10px" };
  const tagJoined: React.CSSProperties = { marginLeft: "auto", background: "var(--brand-600)", color: "#fff", fontSize: 12, padding: "2px 6px", borderRadius: 8 };

  return (
    <main style={page}>
      <h1 style={{ marginBottom: 8 }}>Clubs</h1>

      <div style={bar}>
        <input
          style={searchBox}
          placeholder="Search clubs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {err && <span style={{ color: "#b91c1c" }}>{err}</span>}
      </div>

      <section style={panel}>
        <div style={scroller}>
          {loading ? (
            <p style={{ color: "var(--muted)", padding: 8 }}>Loading clubs…</p>
          ) : filtered.length === 0 ? (
            <p style={{ color: "var(--muted)", padding: 8 }}>No clubs found.</p>
          ) : (
            <div style={grid}>
              {filtered.map((c) => {
                const isJoined = joined.has(c.code);
                return (
                  <article
                    key={c.code}
                    style={card}
                    onClick={() => setOpenCode(c.code)}
                    aria-label={`Open ${c.name}`}
                  >
                    {c.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.cover_image_url} alt="" style={img} />
                    ) : (
                      <div style={{ ...img, display:"grid", placeItems:"center", color:"#888" as any }}>No image</div>
                    )}
                    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 10px 10px 10px" }}>
                      <div>
                        <div style={title}>{c.name}</div>
                        <div style={subtitle}>({c.code})</div>
                      </div>
                      {isJoined && <span style={tagJoined}>Joined</span>}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {openCode && (() => {
        const club = clubs.find(x => x.code === openCode)!;
        const isJoined = joined.has(openCode);
        const overlay: React.CSSProperties = { position:"fixed", inset:0, background:"rgba(0,0,0,.35)", display:"grid", placeItems:"center", zIndex:100 };
        const box: React.CSSProperties = { width:"min(560px, 92vw)", background:"var(--card)", color:"var(--text)", border:"1px solid var(--elev-border)", borderRadius:16, boxShadow:"var(--shadow)" as any, overflow:"hidden" };
        const body: React.CSSProperties = { padding:16 };
        const btnRow: React.CSSProperties = { display:"flex", justifyContent:"flex-end", gap:12, padding:"0 16px 16px 16px" };
        const ghost: React.CSSProperties = { border:"1px solid var(--border)", background:"transparent", color:"var(--text)", borderRadius:8, padding:"8px 12px", cursor:"pointer" };
        const primary: React.CSSProperties = { border:"1px solid var(--btn-border)", background:"var(--btn-bg)", color:"var(--btn-text)", borderRadius:8, padding:"8px 12px", cursor:"pointer" };

        return (
          <div style={overlay} onClick={() => setOpenCode(null)}>
            <div style={box} onClick={(e)=>e.stopPropagation()}>
              {club.cover_image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={club.cover_image_url} alt="" style={{ width:"100%", height:180, objectFit:"cover" }} />
              )}
              <div style={body}>
                <h3 style={{ marginTop:0 }}>{club.name}</h3>
                <p style={{ opacity:.85, whiteSpace:"pre-wrap" }}>{club.description || "No description yet."}</p>
              </div>
              <div style={btnRow}>
                <button style={ghost} onClick={() => setOpenCode(null)}>Close</button>
                {isJoined ? (
                  <button style={primary} onClick={() => { leaveClub(club.code); setOpenCode(null); }}>
                    Leave club
                  </button>
                ) : (
                  <button style={primary} onClick={() => { joinClub(club.code); setOpenCode(null); }}>
                    Join club
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </main>
  );
}
