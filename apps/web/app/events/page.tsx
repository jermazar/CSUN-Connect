"use client";

import * as React from "react";
import { createClient } from "@supabase/supabase-js";
import CreateEventModal from "../components/events/CreateEventModal";
import EditEventModal from "../components/EditEventModal";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  location: string | null;
  is_published: boolean | null;
};

export default function EventsPage() {
  const [events, setEvents] = React.useState<EventRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  const [userId, setUserId] = React.useState<string | null>(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [isOfficer, setIsOfficer] = React.useState(false);

  const [openCreate, setOpenCreate] = React.useState(false);
  const [editEvent, setEditEvent] = React.useState<EventRow | null>(null);

  React.useEffect(() => {
    let cancel = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      if (cancel) return;
      setUserId(uid);

      if (!uid) return;

      const { data: prof } = await supabase
        .from("profiles")
        .select("role, clubs")
        .eq("id", uid)
        .single();

      const role = (prof?.role ?? "student") as string;
      const clubs: string[] = Array.isArray(prof?.clubs) ? prof!.clubs : [];
      setIsAdmin(role === "admin");
      setIsOfficer(clubs.length > 0);
    })();
    return () => { cancel = true; };
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const base = supabase
        .from("events")
        .select("id,title,description,start_time,end_time,location,is_published")
        .order("start_time", { ascending: true });
      const { data, error } =
        isAdmin || isOfficer ? await base : await base.eq("is_published", true);
      if (error) throw error;
      setEvents((data ?? []) as EventRow[]);
    } catch (e: any) {
      setErr(e.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isOfficer]);

  React.useEffect(() => { load(); }, [load]);

  async function togglePublish(id: string, next: boolean) {
    const { error } = await supabase
      .from("events")
      .update({ is_published: next })
      .eq("id", id);
    if (!error) load();
  }

  const canCreate = !!userId && (isAdmin || isOfficer);

  // styles
  const page: React.CSSProperties = { display: "grid", gap: 16 };
  const toolbar: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
  };
  const btn: React.CSSProperties = {
    border: "1px solid var(--btn-border)", background: "var(--btn-bg)", color: "var(--btn-text)",
    borderRadius: 8, padding: "8px 12px", cursor: "pointer"
  };
  const ghost: React.CSSProperties = {
    border: "1px solid var(--border)", background: "transparent", color: "var(--text)",
    borderRadius: 8, padding: "8px 12px", cursor: "pointer"
  };
  const card: React.CSSProperties = {
    border: "1px solid var(--card-border)", background: "var(--card)", color: "var(--text)",
    borderRadius: 16, padding: 16, boxShadow: "var(--shadow)" as any
  };
  const pill: React.CSSProperties = {
    fontSize: 12, border: "1px solid var(--border)", borderRadius: 999,
    padding: "2px 8px", background: "var(--bg)", color: "var(--muted)", marginLeft: 8
  };

  return (
    <section style={page}>
      <div style={toolbar}>
        <h1 style={{ margin: 0 }}>Events</h1>
        {canCreate && (
          <button style={btn} onClick={() => setOpenCreate(true)}>＋ Create Event</button>
        )}
      </div>

      {loading && <p style={{ color: "var(--muted)" }}>Loading…</p>}
      {err && <p style={{ color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", padding: 8, borderRadius: 8 }}>{err}</p>}

      <div style={{ display: "grid", gap: 12 }}>
        {events.map((ev) => {
          const start = new Date(ev.start_time);
          const end = ev.end_time ? new Date(ev.end_time) : null;
          const when =
            start.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) +
            (end ? ` – ${end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "");
          return (
            <article key={ev.id} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
                <div>
                  <a href={`/events/${ev.id}`} style={{ color: "var(--link)", textDecoration: "underline" }}>
                    <h3 style={{ margin: "0 0 4px 0" }}>{ev.title}</h3>
                  </a>
                  <div style={{ fontSize: 14, opacity: 0.8 }}>{when}</div>
                  {ev.location && <div style={{ fontSize: 14, opacity: 0.8 }}>📍 {ev.location}</div>}
                  {ev.description && <p style={{ marginTop: 8 }}>{ev.description}</p>}
                </div>

                {(isAdmin || isOfficer) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={pill}>{ev.is_published ? "Published" : "Unpublished"}</span>
                    <button style={ghost} onClick={() => setEditEvent(ev)}>Edit</button>
                    <button style={btn} onClick={() => togglePublish(ev.id, !ev.is_published)}>
                      {ev.is_published ? "Unpublish" : "Publish"}
                    </button>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {canCreate && (
        <CreateEventModal
          open={openCreate}
          onClose={() => setOpenCreate(false)}
          onCreated={() => { setOpenCreate(false); load(); }}
        />
      )}

      {(isAdmin || isOfficer) && (
        <EditEventModal
          open={!!editEvent}
          event={editEvent}
          onClose={() => setEditEvent(null)}
          onSaved={() => { setEditEvent(null); load(); }}
        />
      )}
    </section>
  );
}
