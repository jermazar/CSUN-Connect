"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const EditEventModal = dynamic(() => import("../../components/events/EditEventModal"), { ssr: false });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;     // timestamptz
  end_time: string | null;
  location: string | null;
  is_published: boolean;
  publish_at: string | null;
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

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const eventId = params?.id;

  const [me, setMe] = React.useState<string | null>(null);
  const [role, setRole] = React.useState<"admin" | "student" | null>(null);
  const [officerClubs, setOfficerClubs] = React.useState<string[]>([]);
  const [row, setRow] = React.useState<EventRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  const [editOpen, setEditOpen] = React.useState(false);

  // auth + role + officer clubs
  React.useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setMe(uid);

      if (uid) {
        const p = await supabase.from("profiles").select("role").eq("id", uid).single();
        if (!p.error) setRole((p.data as ProfileRow)?.role ?? null);

        const clubs = await supabase.from("club_officers").select("club_code").eq("user_id", uid);
        if (!clubs.error && clubs.data) {
          setOfficerClubs((clubs.data as OfficerRow[]).map(c => c.club_code).sort());
        }
      }
    })();
  }, []);

  async function load() {
    if (!eventId) return;
    setLoading(true); setErr(null);
    try {
      const { data, error } = await supabase
        .from("events")
        .select("id,title,description,start_time,end_time,location,is_published,publish_at,club_code,created_by")
        .eq("id", eventId)
        .single();
      if (error) throw error;
      setRow(data as EventRow);
    } catch (e: any) {
      setErr(e.message || "Failed to load event");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, [eventId]);

  const meIsAdmin = role === "admin";
  const meIsCreator = !!(me && row?.created_by && me === row.created_by);
  const meIsOfficer = !!(row?.club_code && officerClubs.includes(row.club_code));
  const canEdit = meIsAdmin || meIsCreator || meIsOfficer;
  const canDelete = canEdit;

  const visibleForStudents = row ? (row.is_published || isNowPast(row.publish_at)) : false;

  // styles
  const wrap: React.CSSProperties = { maxWidth: 800, margin: "16px auto", padding: "0 24px 24px" };
  const card: React.CSSProperties = { border: "1px solid var(--card-border)", background: "var(--card)", color: "var(--text)", borderRadius: 16, boxShadow: "var(--shadow)" as any, padding: 16 };
  const rowCss: React.CSSProperties = { display: "grid", gap: 4 };
  const badge: React.CSSProperties = { display: "inline-block", fontSize: 12, padding: "2px 6px", borderRadius: 999, border: "1px solid var(--border)", background: "var(--bg)", marginLeft: 8 };
  const btn: React.CSSProperties = { border: "1px solid var(--btn-border)", background: "var(--btn-bg)", color: "var(--btn-text)", borderRadius: 8, padding: "8px 12px", cursor: "pointer" };
  const btnGhost: React.CSSProperties = { border: "1px solid var(--border)", background: "transparent", color: "var(--text)", borderRadius: 8, padding: "8px 12px", cursor: "pointer" };
  const btnWarn: React.CSSProperties = { border: "1px solid var(--brand-700)", background: "var(--brand-700)", color: "#fff", borderRadius: 8, padding: "8px 12px", cursor: "pointer" };

  return (
    <main style={wrap}>
      <button onClick={() => router.back()} style={btnGhost}>← Back</button>

      {loading && <p style={{ color: "var(--muted)" }}>Loading…</p>}
      {err && <p style={{ color: "#b91c1c" }}>{err}</p>}
      {!loading && row && (
        <article style={card}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
            <div>
              <h1 style={{ margin: "0 0 4px 0" }}>
                {row.title}
                {!visibleForStudents && <span style={badge}>Draft</span>}
                {row.club_code && <span style={badge}>{row.club_code}</span>}
              </h1>
              <div style={{ color: "var(--muted)", fontSize: 14 }}>
                {fmtDT(row.start_time)}
                {row.end_time && <> — {fmtDT(row.end_time)}</>}
                {row.publish_at && (
                  <> • Publishes: {fmtDT(row.publish_at)}</>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              {meIsAdmin && (
                visibleForStudents ? (
                  <button
                    style={btnGhost}
                    title="Unpublish"
                    onClick={async () => {
                      const { error } = await supabase.from("events").update({ is_published: false }).eq("id", row.id);
                      if (error) alert(error.message); else load();
                    }}
                  >
                    Unpublish
                  </button>
                ) : (
                  <button
                    style={btn}
                    title="Publish now"
                    onClick={async () => {
                      const { error } = await supabase.from("events").update({ is_published: true }).eq("id", row.id);
                      if (error) alert(error.message); else load();
                    }}
                  >
                    Publish
                  </button>
                )
              )}
              {canEdit && (
                <button style={btnGhost} onClick={() => setEditOpen(true)}>Edit</button>
              )}
              {canDelete && (
                <button
                  style={btnWarn}
                  onClick={async () => {
                    if (!confirm(`Delete event: "${row.title}"?`)) return;
                    const { error } = await supabase.from("events").delete().eq("id", row.id);
                    if (error) alert("Delete failed: " + error.message);
                    else router.push("/events");
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          </header>

          {row.location && (
            <p style={{ marginTop: 10, fontWeight: 500 }}>📍 {row.location}</p>
          )}

          {row.description && (
            <div style={{ marginTop: 12, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
              {row.description}
            </div>
          )}
        </article>
      )}

      <EditEventModal
        open={editOpen}
        eventId={row?.id ?? null}
        onClose={() => setEditOpen(false)}
        onUpdated={() => load()}
      />
    </main>
  );
}
