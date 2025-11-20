"use client";

import * as React from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Club = { code: string; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: (newEventId: string) => void;
};

function toIsoFromLocal(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0);
  return dt.toISOString();
}

export default function CreateEventModal({ open, onClose, onCreated }: Props) {
  const [title, setTitle] = React.useState("");
  const [date, setDate] = React.useState("");
  const [startTime, setStartTime] = React.useState("");
  const [endTime, setEndTime] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [description, setDescription] = React.useState("");

  // NEW audience controls
  const [postCampus, setPostCampus] = React.useState(true);
  const [clubSearch, setClubSearch] = React.useState("");
  const [eligibleClubs, setEligibleClubs] = React.useState<Club[]>([]);
  const [selectedClubs, setSelectedClubs] = React.useState<string[]>([]);
  const [isSiteAdmin, setIsSiteAdmin] = React.useState(false);

  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  // load who can target which clubs
  React.useEffect(() => {
    if (!open) return;

    (async () => {
      setErr(null);
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return;

      // is site admin?
      const { data: prof } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", uid)
        .single();

      const admin = (prof?.role === "admin");
      setIsSiteAdmin(admin);

      if (admin) {
        // site admins can target any active club
        const { data, error } = await supabase
          .from("clubs")
          .select("code,name")
          .eq("is_active", true)
          .order("name");
        if (!error && data) setEligibleClubs(data as Club[]);
      } else {
        // otherwise only clubs where the user is an admin/officer
        const { data, error } = await supabase
          .from("club_members")
          .select("club_code, clubs(name, code)")
          .eq("user_id", uid)
          .in("role", ["admin","officer","club_admin"])
          .order("club_code");
        if (!error && data) {
          const list: Club[] = (data as any[])
            .map(r => r.clubs)
            .filter(Boolean);
          setEligibleClubs(list);
        }
      }
    })();
  }, [open]);

  function toggleClub(code: string, checked: boolean) {
    setSelectedClubs(prev =>
      checked ? [...prev, code] : prev.filter(c => c !== code)
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setErr(null);

    if (!title.trim()) return setErr("Title is required.");
    if (!date || !startTime) return setErr("Pick a date and start time.");
    if (!postCampus && selectedClubs.length === 0) {
      return setErr("Choose at least one audience: campus feed or one/more clubs.");
    }

    try {
      setBusy(true);
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("You must be signed in.");

      const start_iso = toIsoFromLocal(date, startTime);
      const end_iso = endTime ? toIsoFromLocal(date, endTime) : null;

      // insert event
      const { data: ev, error: evErr } = await supabase
        .from("events")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          start_time: start_iso,
          end_time: end_iso,
          location: location.trim() || null,
          is_published: true,
          publish_at: null,              // keep if using scheduled publishing elsewhere
          is_campus_wide: postCampus,
          created_by: uid
        })
        .select("id")
        .single();

      if (evErr) throw evErr;

      // attach club audiences (if any)
      if (selectedClubs.length > 0) {
        const rows = selectedClubs.map(code => ({
          event_id: ev!.id as string,
          club_code: code
        }));
        const { error: audErr } = await supabase
          .from("event_audience_clubs")
          .insert(rows);
        if (audErr) throw audErr;
      }

      // reset
      setTitle(""); setDate(""); setStartTime(""); setEndTime("");
      setLocation(""); setDescription("");
      setPostCampus(true); setSelectedClubs([]);

      onCreated?.(ev!.id as string);
      onClose();
    } catch (e: any) {
      setErr(e.message || "Failed to create event.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  // --- styles (uses your theme vars) ---
  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,.35)",
    display: "grid", placeItems: "center", zIndex: 100
  };
  const card: React.CSSProperties = {
    width: "min(680px, 92vw)", background: "var(--card)", color: "var(--text)",
    border: "1px solid var(--card-border)", borderRadius: 16, boxShadow: "var(--shadow)" as any, padding: 16
  };
  const row: React.CSSProperties = { display: "grid", gap: 8 };
  const twoCol: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
  const input: React.CSSProperties = {
    border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)",
    padding: "8px 10px", borderRadius: 8, boxSizing: "border-box"
  };
  const actions: React.CSSProperties = { display: "flex", gap: 12, justifyContent: "flex-end" };
  const btn: React.CSSProperties = {
    border: "1px solid var(--btn-border)", background: "var(--btn-bg)", color: "var(--btn-text)",
    borderRadius: 8, padding: "8px 12px", cursor: "pointer"
  };

  // filter eligible clubs by search
  const filtered = eligibleClubs.filter(c => {
    const q = clubSearch.trim().toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
  });

  return (
    <div style={overlay} onClick={onClose}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>Create New Event</h3>

        <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
          <div style={row}>
            <label>Title</label>
            <input style={input} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div style={twoCol}>
            <div style={row}>
              <label>Date</label>
              <input type="date" style={input} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div style={row}>
              <label>Location</label>
              <input style={input} value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>

          <div style={twoCol}>
            <div style={row}>
              <label>Start time</label>
              <input type="time" style={input} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div style={row}>
              <label>End time (optional)</label>
              <input type="time" style={input} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div style={row}>
            <label>Description (optional)</label>
            <textarea rows={4} style={input} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          {/* Audience */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, display: "grid", gap: 12 }}>
            <label style={{ fontWeight: 600 }}>Audience</label>

            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={postCampus}
                onChange={(e) => setPostCampus(e.target.checked)}
              />
              <span>Post to <strong>campus feed</strong></span>
            </label>

            <div style={row}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label>Also post to club(s)</label>
                {!isSiteAdmin && eligibleClubs.length === 0 && (
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    (You’re not a club admin/officer of any clubs.)
                  </span>
                )}
              </div>

              {/* search + list of checkboxes */}
              <input
                style={input}
                placeholder="Search clubs…"
                value={clubSearch}
                onChange={(e) => setClubSearch(e.target.value)}
                disabled={eligibleClubs.length === 0}
              />
              <div
                style={{
                  border: "1px solid var(--border)", borderRadius: 8, padding: 8,
                  maxHeight: 180, overflowY: "auto", background: "var(--bg)",
                  opacity: eligibleClubs.length === 0 ? 0.5 : 1
                }}
              >
                {filtered.length === 0 ? (
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>No clubs match.</div>
                ) : filtered.map(c => {
                  const checked = selectedClubs.includes(c.code);
                  return (
                    <label key={c.code} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => toggleClub(c.code, e.target.checked)}
                      />
                      <span>{c.name} <span style={{ opacity: .6 }}>({c.code})</span></span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {err && (
            <p style={{ color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", padding: 8, borderRadius: 8 }}>
              {err}
            </p>
          )}

          <div style={actions}>
            <button type="button" onClick={onClose} style={{ ...btn, background: "transparent", color: "var(--text)" }}>
              Cancel
            </button>
            <button type="submit" style={{ ...btn, opacity: busy ? 0.6 : 1 }} disabled={busy}>
              {busy ? "Creating…" : "Create Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
