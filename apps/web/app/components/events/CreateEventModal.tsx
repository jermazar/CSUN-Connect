"use client";

import * as React from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: (newEventId: string) => void;
};

type ProfileRow = { role: "admin" | "student" | null };
type OfficerRow = { club_code: string };

function toIsoFromLocal(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0);
  return dt.toISOString();
}

export default function CreateEventModal({ open, onClose, onCreated }: Props) {
  // core fields
  const [title, setTitle] = React.useState("");
  const [date, setDate] = React.useState("");
  const [startTime, setStartTime] = React.useState("");
  const [endTime, setEndTime] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [description, setDescription] = React.useState("");

  // scheduling
  const [publishDate, setPublishDate] = React.useState(""); // YYYY-MM-DD
  const [publishTime, setPublishTime] = React.useState(""); // HH:MM
  const [publishNow, setPublishNow] = React.useState(false); // admin-only “publish immediately”

  // permissions / role
  const [role, setRole] = React.useState<"admin" | "student" | null>(null);
  const [officerClubs, setOfficerClubs] = React.useState<string[]>([]);
  const [audience, setAudience] = React.useState<"school" | "club">("club");
  const [selectedClub, setSelectedClub] = React.useState<string>("");
  const [adminClubCode, setAdminClubCode] = React.useState<string>("");

  // status
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  // close on ESC
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Load role + officer clubs when opened
  React.useEffect(() => {
    if (!open) return;
    let canceled = false;

    (async () => {
      setErr(null);

      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      if (!uid) { setRole(null); setOfficerClubs([]); setErr("You must be signed in."); return; }
      if (canceled) return;

      const { data: prof } = await supabase.from("profiles").select("role").eq("id", uid).single();
      const r = (prof as ProfileRow | null)?.role ?? null;
      setRole(r);

      const clubs = await supabase.from("club_officers").select("club_code").eq("user_id", uid);
      if (clubs.data) setOfficerClubs((clubs.data as OfficerRow[]).map(c => c.club_code).sort());

      if (r === "admin") {
        setAudience("school");
      } else {
        setAudience("club");
        setSelectedClub(prev => prev || (clubs.data?.[0]?.club_code ?? ""));
      }
    })();

    return () => { canceled = true; };
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    setErr(null);

    // validation
    if (!title.trim()) return setErr("Title is required.");
    if (!date || !startTime) return setErr("Pick a date and start time.");

    // derive club_code
    let club_code: string | null = null;
    if (role === "admin") {
      club_code = audience === "school" ? null : (adminClubCode.trim() || null);
    } else {
      if (!officerClubs.length) return setErr("You are not a club officer; you cannot create events.");
      if (!selectedClub) return setErr("Choose your club.");
      club_code = selectedClub;
    }

    // derive publish_at (admins and officers can set schedule)
    let publish_at: string | null = null;
    if (publishDate && publishTime) {
      publish_at = toIsoFromLocal(publishDate, publishTime);
    }

    // derive is_published (admin can publish now if no future schedule)
    const adminWantsImmediate = role === "admin" && publishNow && !publish_at;
    const is_published = adminWantsImmediate ? true : false;

    try {
      setBusy(true);

      const start_iso = toIsoFromLocal(date, startTime);
      const end_iso = endTime ? toIsoFromLocal(date, endTime) : null;

      const { data, error } = await supabase
        .from("events")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          start_time: start_iso,
          end_time: end_iso,
          location: location.trim() || null,
          club_code,
          is_published,
          publish_at, // <— schedule visibility
        })
        .select("id")
        .single();

      if (error) throw error;

      // reset & close
      setTitle(""); setDate(""); setStartTime(""); setEndTime("");
      setLocation(""); setDescription("");
      setPublishDate(""); setPublishTime(""); setPublishNow(false);
      setAdminClubCode("");

      onCreated?.(data!.id as string);
      onClose();
    } catch (e: any) {
      const msg: string = e?.message || "Failed to create event.";
      if (/violates row-level security|RLS/i.test(msg)) {
        setErr("You don’t have permission to create this event.");
      } else if (/Only admins can publish events/i.test(msg)) {
        setErr("Only admins can publish immediately. You can schedule with a future time.");
      } else {
        setErr(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  // styles
  const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "grid", placeItems: "center", zIndex: 100 };
  const card: React.CSSProperties = { width: "min(560px, 92vw)", background: "var(--card)", color: "var(--text)", border: "1px solid var(--card-border)", borderRadius: 16, boxShadow: "var(--shadow)" as any, padding: 16 };
  const row: React.CSSProperties = { display: "grid", gap: 8 };
  const twoCol: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
  const input: React.CSSProperties = { border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", padding: "8px 10px", borderRadius: 8, boxSizing: "border-box" };
  const actions: React.CSSProperties = { display: "flex", gap: 12, justifyContent: "flex-end" };
  const btn: React.CSSProperties = { border: "1px solid var(--btn-border)", background: "var(--btn-bg)", color: "var(--btn-text)", borderRadius: 8, padding: "8px 12px", cursor: "pointer" };
  const btnGhost: React.CSSProperties = { border: "1px solid var(--border)", background: "transparent", color: "var(--text)", borderRadius: 8, padding: "8px 12px", cursor: "pointer" };
  const labelSmall: React.CSSProperties = { fontSize: 12, opacity: 0.8 };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>Create New Event</h3>

        {/* Audience & scheduling */}
        {role === "admin" ? (
          <div style={{ ...row, marginBottom: 8 }}>
            <span style={labelSmall}>Audience</span>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input type="radio" name="audience" checked={audience === "school"} onChange={() => setAudience("school")} />
                School-wide
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input type="radio" name="audience" checked={audience === "club"} onChange={() => setAudience("club")} />
                Club event
              </label>
            </div>
            {audience === "club" && (
              <div style={row}>
                <label>Club code</label>
                <input style={input} placeholder="e.g., ACM, SWE" value={adminClubCode} onChange={(e) => setAdminClubCode(e.target.value.toUpperCase())} />
              </div>
            )}

            <div style={twoCol}>
              <div style={row}>
                <label>Publish at (optional)</label>
                <input type="date" style={input} value={publishDate} onChange={(e) => setPublishDate(e.target.value)} />
                <input type="time" style={input} value={publishTime} onChange={(e) => setPublishTime(e.target.value)} />
              </div>
              <div style={row}>
                <label>Publish now (if no schedule)</label>
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="checkbox" checked={publishNow} onChange={e => setPublishNow(e.target.checked)} />
                  Publish immediately
                </label>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ ...row, marginBottom: 8 }}>
            <span style={labelSmall}>Posting as club officer</span>
            {officerClubs.length ? (
              <>
                <select style={input} value={selectedClub} onChange={(e) => setSelectedClub(e.target.value)}>
                  {officerClubs.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <div style={twoCol}>
                  <div style={row}>
                    <label>Publish at (optional)</label>
                    <input type="date" style={input} value={publishDate} onChange={(e) => setPublishDate(e.target.value)} />
                    <input type="time" style={input} value={publishTime} onChange={(e) => setPublishTime(e.target.value)} />
                  </div>
                  <div />
                </div>
              </>
            ) : (
              <p style={{ color: "#b91c1c", margin: 0 }}>You’re not listed as a club officer, so you can’t create events.</p>
            )}
          </div>
        )}

        <form onSubmit={submit} className="grid" style={{ display: "grid", gap: 12 }}>
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

          {err && (
            <p style={{ color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", padding: 8, borderRadius: 8 }}>
              {err}
            </p>
          )}

          <div style={actions}>
            <button type="button" onClick={onClose} style={btnGhost} disabled={busy}>Cancel</button>
            <button type="submit" style={{ ...btn, opacity: busy ? 0.6 : 1 }} disabled={busy}>
              {busy ? "Creating…" : "Create Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
