"use client";

import * as React from "react";
import { createClient } from "@supabase/supabase-js";
import dynamic from "next/dynamic";

const EditEventModal = dynamic(() => import("../components/events/EditEventModal"), { ssr: false });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Row = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  location: string | null;
  is_published: boolean;
  publish_at: string | null;   // <— NEW
  club_code: string | null;
  created_by: string | null;
};

type ProfileRow = { role: "admin" | "student" | null };
type OfficerRow = { club_code: string };

function fmtDT(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${date} • ${time}`;
}

function isNowPast(iso: string | null) {
  if (!iso) return false;
  return new Date(iso).getTime() <= Date.now();
}

export default function EventsPage() {
  const [me, setMe] = React.useState<string | null>(null);
  const [meRole, setMeRole] = React.useState<"admin" | "student" | null>(null);
  const [officerClubs, setOfficerClubs] = React.useState<string[]>([]);

  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  // filters
  const [showPublished, setShowPublished] = React.useState(true);
  const [showMyDrafts, setShowMyDrafts] = React.useState(true);
  const [audienceFilter, setAudienceFilter] = React.useState<"all" | "school" | "myclubs" | "club">("all");
  const [specificClub, setSpecificClub] = React.useState<string>("");
  const [search, setSearch] = React.useState("");

  // edit modal
  const [editOpen, setEditOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setMe(uid);

      if (uid) {
        const p = await supabase.from("profiles").select("role").eq("id", uid).single();
        if (!p.error) setMeRole((p.data as ProfileRow)?.role ?? null);

        const clubs = await supabase.from("club_officers").select("club_code").eq("user_id", uid);
        if (!clubs.error && clubs.data) {
          setOfficerClubs((clubs.data as OfficerRow[]).map(c => c.club_code).sort());
        }
      }
    })();
  }, []);

  async function load() {
    setLoading(true); setErr(null);
    try {
      const { data, error } = await supabase
        .from("events")
        .select("id,title,description,start_time,end_time,location,is_published,publish_at,club_code,created_by")
        .order("start_time", { ascending: true });

      if (error) throw error;
      setRows((data || []) as Row[]);
    } catch (e: any) {
      setErr(e.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  const meIsAdmin = meRole === "admin";
  const meIsOfficerOf = (club: string | null) => !!club && officerClubs.includes(club);

  // Visible means:
  // - published OR publish_at reached (these are "Published" for students)
  // - my drafts (unpublished & not reached) if I'm admin/creator/officer (debugging/admin view)
  const filtered = rows.filter(r => {
    const reachedSchedule = isNowPast(r.publish_at);
    const visibleForStudents = r.is_published || reachedSchedule;

    const isMine = !!(me && r.created_by === me);
    const canSeeDraft = meIsAdmin || isMine || meIsOfficerOf(r.club_code);

    const pubPass = showPublished && visibleForStudents;
    const draftPass = showMyDrafts && !visibleForStudents && canSeeDraft;
    const vis = pubPass || draftPass;
    if (!vis) return false;

    // audience filter
    if (audienceFilter === "school" && r.club_code !== null) return false;
    if (audienceFilter === "myclubs" && !meIsOfficerOf(r.club_code)) return false;
    if (audienceFilter === "club") {
      if (!specificClub) return false;
      if (r.club_code !== specificClub) return false;
    }

    // search filter
    const q = search.trim().toLowerCase();
    if (q) {
      const blob = `${r.title ?? ""} ${r.description ?? ""} ${r.location ?? ""} ${r.club_code ?? ""}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }

    return true;
  });

  // styles
  const wrap: React.CSSProperties = { maxWidth: 960, margin: "16px auto", padding: "0 24px 24px" };
  const bar: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 12, marginBottom: 12 };
  const filtersCss: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "flex-end" };
  const list: React.CSSProperties = { display: "grid", gap: 12 };
  const card: React.CSSProperties = {
    border: "1px solid var(--card-border)", background: "var(--card)", color: "var(--text)",
    borderRadius: 12, padding: 12, boxShadow: "var(--shadow)" as any
  };
  const badge: React.CSSProperties = {
    display: "inline-block", fontSize: 12, padding: "2px 6px", borderRadius: 999,
    border: "1px solid var(--border)", background: "var(--bg)", marginLeft: 8
  };
  const btn: React.CSSProperties = {
    border: "1px solid var(--btn-border)", background: "var(--btn-bg)", color: "var(--btn-text)",
    borderRadius: 8, padding: "8px 12px", cursor: "pointer"
  };
  const btnGhost: React.CSSProperties = {
    border: "1px solid var(--border)", background: "transparent", color: "var(--text)",
    borderRadius: 8, padding: "6px 10px", cursor: "pointer"
  };
  const btnWarn: React.CSSProperties = {
    border: "1px solid var(--brand-700)", background: "var(--brand-700)", color: "#fff",
    borderRadius: 8, padding: "6px 10px", cursor: "pointer"
  };

  return (
    <main style={wrap}>
      <div style={bar}>
        <h1 style={{ margin: 0 }}>Events</h1>

        <div style={filtersCss}>
          <input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", background: "var(--bg)", color: "var(--text)" }} />

          <select
            value={audienceFilter}
            onChange={e => setAudienceFilter(e.target.value as any)}
            title="Audience filter"
            style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", background: "var(--bg)", color: "var(--text)" }}
          >
            <option value="all">All</option>
            <option value="school">School-wide</option>
            <option value="myclubs">My clubs</option>
            <option value="club">Specific club…</option>
          </select>

          {audienceFilter === "club" && (
            <input
              placeholder="Club code (e.g., ACM)"
              value={specificClub}
              onChange={e => setSpecificClub(e.target.value.toUpperCase())}
              style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", background: "var(--bg)", color: "var(--text)" }}
            />
          )}

          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={showPublished} onChange={e => setShowPublished(e.target.checked)} />
            Published
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={showMyDrafts} onChange={e => setShowMyDrafts(e.target.checked)} />
            My drafts
          </label>
          <button style={btn} onClick={load}>Refresh</button>
        </div>
      </div>

      {loading && <p style={{ color: "var(--muted)" }}>Loading…</p>}
      {err && <p style={{ color: "#b91c1c" }}>{err}</p>}
      {!loading && filtered.length === 0 && <p style={{ color: "var(--muted)" }}>No events match the current filters.</p>}

      <div style={list}>
        {filtered.map(ev => {
          const reachedSchedule = isNowPast(ev.publish_at);
          const visibleForStudents = ev.is_published || reachedSchedule;

          const isMine = !!(me && ev.created_by === me);
          const canEdit = meIsAdmin || isMine || meIsOfficerOf(ev.club_code);
          const canDelete = canEdit;

          return (
            <div key={ev.id} style={card as React.CSSProperties}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <a href={`/events/${ev.id}`} style={{ textDecoration: "none", color: "var(--text)", flex: 1 }}>
                  <h3 style={{ margin: 0 }}>
                    {ev.title}
                    {!visibleForStudents && <span style={badge}>Draft</span>}
                    {ev.club_code && <span style={badge}>{ev.club_code}</span>}
                  </h3>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>
                    {fmtDT(ev.start_time)}
                    {ev.publish_at && (
                      <>
                        {" "}<span title="Publish at">•</span>{" "}
                        <span style={{ opacity: .9 }}>{fmtDT(ev.publish_at)}</span>
                      </>
                    )}
                  </div>
                </a>

                <div style={{ display: "flex", gap: 8 }}>
                  {meIsAdmin && (
                    visibleForStudents ? (
                      <button
                        style={btnGhost}
                        title="Unpublish (make hidden unless schedule reached)"
                        onClick={async () => {
                          const { error } = await supabase.from("events").update({ is_published: false }).eq("id", ev.id);
                          if (error) alert("Unpublish failed: " + error.message); else load();
                        }}
                      >
                        Unpublish
                      </button>
                    ) : (
                      <button
                        style={btn}
                        title="Publish now (ignores schedule)"
                        onClick={async () => {
                          const { error } = await supabase.from("events").update({ is_published: true }).eq("id", ev.id);
                          if (error) alert("Publish failed: " + error.message); else load();
                        }}
                      >
                        Publish
                      </button>
                    )
                  )}

                  {canEdit && (
                    <button style={btnGhost} onClick={() => { setEditId(ev.id); setEditOpen(true); }}>
                      Edit
                    </button>
                  )}

                  {canDelete && (
                    <button
                      style={btnWarn}
                      onClick={async () => {
                        if (!confirm(`Delete event: "${ev.title}"?`)) return;
                        const { error } = await supabase.from("events").delete().eq("id", ev.id);
                        if (error) alert("Delete failed: " + error.message); else load();
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {ev.location && <p style={{ margin: "6px 0 0 0", fontSize: 14 }}>📍 {ev.location}</p>}
              {ev.description && <p style={{ margin: "6px 0 0 0", opacity: .9 }}>{ev.description}</p>}
            </div>
          );
        })}
      </div>

      <EditEventModal
        open={editOpen}
        eventId={editId}
        onClose={() => setEditOpen(false)}
        onUpdated={() => load()}
      />
    </main>
  );
}
