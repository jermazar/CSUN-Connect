"use client";

import * as React from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Props = {
  open: boolean;
  eventId: string | null;
  onClose: () => void;
  onUpdated?: () => void;
};

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  location: string | null;
  is_published: boolean;
  publish_at: string | null;     // <— NEW
  club_code: string | null;
  created_by: string | null;
};

type ProfileRow = { role: "admin" | "student" | null };
type OfficerRow = { club_code: string };

function toLocalDateTimeParts(iso: string) {
  const dt = new Date(iso);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  const HH = String(dt.getHours()).padStart(2, "0");
  const MM = String(dt.getMinutes()).padStart(2, "0");
  return { date: `${yyyy}-${mm}-${dd}`, time: `${HH}:${MM}` };
}

function toIsoFromLocal(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0);
  return dt.toISOString();
}

export default function EditEventModal({ open, eventId, onClose, onUpdated }: Props) {
  const [me, setMe] = React.useState<string | null>(null);
  const [meRole, setMeRole] = React.useState<"admin" | "student" | null>(null);
  const [officerClubs, setOfficerClubs] = React.useState<string[]>([]);

  const [row, setRow] = React.useState<EventRow | null>(null);

  // form state
  const [title, setTitle] = React.useState("");
  const [date, setDate] = React.useState("");
  const [startTime, setStartTime] = React.useState("");
  const [endTime, setEndTime] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [clubCode, setClubCode] = React.useState<string>("");

  // schedule/publish controls
  const [isPublished, setIsPublished] = React.useState<boolean>(false); // admin-only
  const [publishDate, setPublishDate] = React.useState("");
  const [publishTime, setPublishTime] = React.useState("");

  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      setMe(uid);
      if (!uid) return;
      const prof = await supabase.from("profiles").select("role").eq("id", uid).single();
      if (!prof.error) setMeRole((prof.data as ProfileRow)?.role ?? null);
      const clubs = await supabase.from("club_officers").select("club_code").eq("user_id", uid);
      if (!clubs.error && clubs.data) setOfficerClubs((clubs.data as OfficerRow[]).map(c => c.club_code).sort());
    })();
  }, [open]);

  React.useEffect(() => {
    if (!open || !eventId) return;
    (async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id,title,description,start_time,end_time,location,is_published,publish_at,club_code,created_by")
        .eq("id", eventId)
        .single();
      if (error) { setErr(error.message); return; }
      const ev = data as EventRow;
      setRow(ev);

      setTitle(ev.title ?? "");
      setDescription(ev.description ?? "");
      setLocation(ev.location ?? "");
      setClubCode(ev.club_code ?? "");
      setIsPublished(!!ev.is_published);

      const s = toLocalDateTimeParts(ev.start_time);
      setDate(s.date);
      setStartTime(s.time);
      setEndTime(ev.end_time ? toLocalDateTimeParts(ev.end_time).time : "");

      if (ev.publish_at) {
        const p = toLocalDateTimeParts(ev.publish_at);
        setPublishDate(p.date);
        setPublishTime(p.time);
      } else {
        setPublishDate("");
        setPublishTime("");
      }
    })();
  }, [open, eventId]);

  if (!open || !eventId) return null;

  const meIsAdmin = meRole === "admin";
  const meIsCreator = !!(me && row?.created_by && me === row.created_by);
  const meIsOfficerOfEvent = !!row?.club_code && officerClubs.includes(row.club_code);
  const canEdit = meIsAdmin || meIsCreator || meIsOfficerOfEvent;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !row) return;
    setErr(null);

    if (!canEdit) return setErr("You don't have permission to edit this event.");
    if (!title.trim()) return setErr("Title is required.");
    if (!date || !startTime) return setErr("Pick a date and start time.");

    try {
      setBusy(true);

      const start_iso = toIsoFromLocal(date, startTime);
      const end_iso = endTime ? toIsoFromLocal(date, endTime) : null;

      const nextClubCode = meIsAdmin ? (clubCode.trim() || null) : row.club_code;

      const nextPublishAt =
        publishDate && publishTime ? toIsoFromLocal(publishDate, publishTime) : null;

      const nextIsPublished = meIsAdmin ? isPublished : row.is_published;

      const { error } = await supabase
        .from("events")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          start_time: start_iso,
          end_time: end_iso,
          location: location.trim() || null,
          club_code: nextClubCode,
          publish_at: nextPublishAt,   // schedule
          is_published: nextIsPublished // admin-only; trigger still enforces
        })
        .eq("id", row.id);

      if (error) throw error;

      onUpdated?.();
      onClose();
    } catch (e: any) {
      const msg: string = e?.message || "Failed to update event.";
      if (/Only admins can publish events/i.test(msg)) setErr("Only admins can publish events.");
      else if (/violates row-level security|RLS/i.test(msg)) setErr("You don't have permission to update this event.");
      else setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  // styles
  const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "grid", placeItems: "center", zIndex: 100 };
  const card: React.CSSProperties = { width: "min(560px, 92vw)", background: "var(--card)", color: "var(--text)", border: "1px solid var(--card-border)", borderRadius: 16, boxShadow: "var(--shadow)" as any, padding: 16 };
  const rowCss: React.CSSProperties = { display: "grid", gap: 8 };
  const twoCol: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
  const input: React.CSSProperties = { border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", padding: "8px 10px", borderRadius: 8, boxSizing: "border-box" };
  const actions: React.CSSProperties = { display: "flex", gap: 12, justifyContent: "space-between", alignItems: "center" };
  const btn: React.CSSProperties = { border: "1px solid var(--btn-border)", background: "var(--btn-bg)", color: "var(--btn-text)", borderRadius: 8, padding: "8px 12px", cursor: "pointer" };
  const btnGhost: React.CSSProperties = { border: "1px solid var(--border)", background: "transparent", color: "var(--text)", borderRadius: 8, padding: "8px 12px", cursor: "pointer" };
  const labelSmall: React.CSSProperties = { fontSize: 12, opacity: 0.8 };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>Edit Event</h3>

        {/* Admin-only publish & club code */}
        {meIsAdmin && (
          <div style={{ ...rowCss, marginBottom: 8 }}>
            <span style={labelSmall}>Publishing</span>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} />
              Published
            </label>

            <span style={labelSmall}>Audience</span>
            <div style={twoCol}>
              <div style={rowCss}>
                <label>Club code (leave empty for school-wide)</label>
                <input style={input} placeholder="e.g., ACM, SWE" value={clubCode} onChange={(e) => setClubCode(e.target.value.toUpperCase())} />
              </div>
              <div />
            </div>
          </div>
        )}

        {/* Schedule visible time (admin & officers) */}
        <div style={{ ...rowCss, marginBottom: 8 }}>
          <span style={labelSmall}>Publish at (optional)</span>
          <div style={twoCol}>
            <input type="date" style={input} value={publishDate} onChange={e => setPublishDate(e.target.value)} />
            <input type="time" style={input} value={publishTime} onChange={e => setPublishTime(e.target.value)} />
          </div>
        </div>

        {/* Officer view (club code locked) */}
        {!meIsAdmin && row?.club_code && (
          <div style={{ ...rowCss, marginBottom: 8 }}>
            <span style={labelSmall}>Club</span>
            <input style={{ ...input, opacity: .7 }} value={row.club_code} readOnly />
          </div>
        )}

        <form onSubmit={submit} className="grid" style={{ display: "grid", gap: 12 }}>
          <div style={rowCss}>
            <label>Title</label>
            <input style={input} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div style={twoCol}>
            <div style={rowCss}>
              <label>Date</label>
              <input type="date" style={input} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div style={rowCss}>
              <label>Location</label>
              <input style={input} value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>

          <div style={twoCol}>
            <div style={rowCss}>
              <label>Start time</label>
              <input type="time" style={input} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div style={rowCss}>
              <label>End time (optional)</label>
              <input type="time" style={input} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div style={rowCss}>
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
              {busy ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
