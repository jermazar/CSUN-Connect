"use client";

import * as React from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type EventEdit = {
  id: string;
  title: string;
  description: string | null;
  start_time: string; // ISO
  end_time: string | null;
  location: string | null;
  is_published: boolean | null;
};

type Props = {
  open: boolean;
  event: EventEdit | null;
  onClose: () => void;
  onSaved?: () => void;
};

function isoToLocalDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function isoToLocalTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
function localToIso(dateStr: string, timeStr?: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = (timeStr || "00:00").split(":").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0);
  return dt.toISOString();
}

export default function EditEventModal({ open, event, onClose, onSaved }: Props) {
  const [title, setTitle] = React.useState("");
  const [date, setDate] = React.useState("");
  const [startTime, setStartTime] = React.useState("");
  const [endTime, setEndTime] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [published, setPublished] = React.useState(false);

  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  // hydrate form whenever event changes/opens
  React.useEffect(() => {
    if (!open || !event) return;
    setTitle(event.title || "");
    setDate(isoToLocalDate(event.start_time));
    setStartTime(isoToLocalTime(event.start_time));
    setEndTime(isoToLocalTime(event.end_time));
    setLocation(event.location || "");
    setDescription(event.description || "");
    setPublished(!!event.is_published);
    setErr(null);
  }, [open, event]);

  if (!open || !event) return null;

  // styles (match your theme)
  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,.35)",
    display: "grid", placeItems: "center", zIndex: 100
  };
  const card: React.CSSProperties = {
    width: "min(560px, 92vw)", background: "var(--card)", color: "var(--text)",
    border: "1px solid var(--card-border)", borderRadius: 16,
    boxShadow: "var(--shadow)" as any, padding: 16
  };
  const input: React.CSSProperties = {
    border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)",
    padding: "8px 10px", borderRadius: 8, width: "100%", boxSizing: "border-box"
  };
  const row: React.CSSProperties = { display: "grid", gap: 8 };
  const two: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
  const btn: React.CSSProperties = {
    border: "1px solid var(--btn-border)", background: "var(--btn-bg)", color: "var(--btn-text)",
    borderRadius: 8, padding: "8px 12px", cursor: "pointer"
  };
  const ghost: React.CSSProperties = {
    border: "1px solid var(--border)", background: "transparent", color: "var(--text)",
    borderRadius: 8, padding: "8px 12px", cursor: "pointer"
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setErr(null);

    if (!title.trim()) return setErr("Title is required.");
    if (!date || !startTime) return setErr("Pick a date and start time.");

    try {
      setBusy(true);

      const start_iso = localToIso(date, startTime);
      const end_iso = endTime ? localToIso(date, endTime) : null;

      const { error } = await supabase
        .from("events")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          start_time: start_iso,
          end_time: end_iso,
          location: location.trim() || null,
          is_published: published
        })
        .eq("id", event.id);

      if (error) throw error;

      onSaved?.();
      onClose();
    } catch (e: any) {
      setErr(e.message || "Failed to save changes.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>Edit Event</h3>

        <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
          <div style={row}>
            <label>Title</label>
            <input style={input} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div style={two}>
            <div style={row}>
              <label>Date</label>
              <input type="date" style={input} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div style={row}>
              <label>Location</label>
              <input style={input} value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>

          <div style={two}>
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

          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            Publish
          </label>

          {err && (
            <p style={{ color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", padding: 8, borderRadius: 8 }}>
              {err}
            </p>
          )}

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={ghost} disabled={busy}>Cancel</button>
            <button type="submit" style={{ ...btn, opacity: busy ? 0.6 : 1 }} disabled={busy}>
              {busy ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
