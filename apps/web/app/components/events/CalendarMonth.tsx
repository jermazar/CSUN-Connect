"use client";

import * as React from "react";
import { createClient } from "@supabase/supabase-js";

type EventRow = {
  id: string;
  title: string;
  description?: string | null;
  start_time: string;           // timestamptz
  end_time?: string | null;
  location?: string | null;
  // NEW (for scheduling / visibility)
  is_published: boolean;
  publish_at: string | null;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date)   { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }

function startOfCalendarGrid(d: Date) {
  const first = startOfMonth(d);
  const day = first.getDay(); // 0 Sun - 6 Sat
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - day);
  return gridStart;
}
function endOfCalendarGrid(d: Date) {
  const last = endOfMonth(d);
  const day = last.getDay();
  const gridEnd = new Date(last);
  gridEnd.setDate(last.getDate() + (6 - day));
  return gridEnd;
}

function formatTimeLocalISO(iso: string) {
  const dt = new Date(iso);
  return dt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function isNowPast(iso: string | null) {
  if (!iso) return false;
  return new Date(iso).getTime() <= Date.now();
}

export default function CalendarMonth() {
  const [monthAnchor, setMonthAnchor] = React.useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [events, setEvents] = React.useState<EventRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const gridStart = startOfCalendarGrid(monthAnchor);
  const gridEnd   = endOfCalendarGrid(monthAnchor);
  const endPlusOne = new Date(gridEnd.getFullYear(), gridEnd.getMonth(), gridEnd.getDate() + 1);

  // Fetch events that START within the visible grid window.
  // RLS already controls WHO can see drafts.
  React.useEffect(() => {
    let canceled = false;
    (async () => {
      setLoading(true); setErr(null);
      try {
        const { data, error } = await supabase
          .from("events")
          .select("id,title,description,start_time,end_time,location,is_published,publish_at")
          .gte("start_time", gridStart.toISOString())
          .lt("start_time", endPlusOne.toISOString())
          .order("start_time", { ascending: true });

        if (error) throw error;
        if (!canceled) setEvents((data || []) as EventRow[]);
      } catch (e: any) {
        if (!canceled) setErr(e.message || "Failed to load events");
      } finally {
        if (!canceled) setLoading(false);
      }
    })();
    // re-run when the visible month changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthAnchor.getFullYear(), monthAnchor.getMonth()]);

  function prevMonth() { setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1)); }
  function nextMonth() { setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1)); }
  function thisMonth() { const now = new Date(); setMonthAnchor(new Date(now.getFullYear(), now.getMonth(), 1)); }

  // Build day cells
  const days: Date[] = [];
  for (let d = new Date(gridStart); d <= gridEnd; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    days.push(d);
  }

  // Group events by LOCAL YYYY-MM-DD from start_time
  const byDay = new Map<string, EventRow[]>();
  for (const ev of events) {
    const local = new Date(ev.start_time);
    const key = [
      local.getFullYear(),
      String(local.getMonth() + 1).padStart(2, "0"),
      String(local.getDate()).padStart(2, "0"),
    ].join("-");
    const arr = byDay.get(key) || [];
    arr.push(ev);
    byDay.set(key, arr);
  }

  // ---- styles ----
  const wrap: React.CSSProperties   = { border: "1px solid var(--card-border)", borderRadius: 16, background: "var(--card)", boxShadow: "var(--shadow)" as any };
  const header: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, borderBottom: "1px solid var(--border)" };
  const btn: React.CSSProperties    = { border: "1px solid var(--btn-border)", background: "var(--btn-bg)", color: "var(--btn-text)", borderRadius: 8, padding: "6px 10px", cursor: "pointer" };
  const grid: React.CSSProperties   = { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0, borderTop: "1px solid var(--border)" };
  const dow: React.CSSProperties    = { padding: 8, textAlign: "center", fontSize: 12, color: "var(--muted)", borderRight: "1px solid var(--border)" };
  const cell: React.CSSProperties   = { minHeight: 110, borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: 8, boxSizing: "border-box" };
  const daynum: React.CSSProperties = { fontSize: 12, opacity: .8, marginBottom: 6 };
  const tagVisible: React.CSSProperties = { display: "block", padding: "2px 6px", borderRadius: 8, border: "1px solid var(--brand-700)", background: "var(--brand-600)", color: "#fff", fontSize: 12, marginBottom: 6, wordBreak: "break-word" };
  const tagDraft: React.CSSProperties   = { display: "block", padding: "2px 6px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--muted)", fontSize: 12, marginBottom: 6, wordBreak: "break-word" };

  const monthLabel = monthAnchor.toLocaleString(undefined, { month: "long", year: "numeric" });
  const weekdays = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  return (
    <section style={wrap} aria-label="Calendar">
      <div style={header}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button style={btn} onClick={prevMonth} aria-label="Previous month">◀</button>
          <button style={btn} onClick={thisMonth} aria-label="Jump to this month">Today</button>
          <button style={btn} onClick={nextMonth} aria-label="Next month">▶</button>
        </div>
        <h2 style={{ margin: 0 }}>{monthLabel}</h2>
        <div style={{ width: 135 }} />
      </div>

      {/* Day-of-week header */}
      <div style={{ ...grid, background: "var(--bg)" }}>
        {weekdays.map((w, i) => (
          <div key={i} style={dow}>{w}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={grid}>
        {days.map((d, idx) => {
          const isOtherMonth = d.getMonth() !== monthAnchor.getMonth();
          const key = [d.getFullYear(), String(d.getMonth()+1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("-");
          const dayEvents = byDay.get(key) || [];
          return (
            <div key={idx} style={{ ...cell, opacity: isOtherMonth ? 0.5 : 1 }}>
              <div style={daynum}>{d.getDate()}</div>
              {dayEvents.map(ev => {
                const visibleForStudents = ev.is_published || isNowPast(ev.publish_at);
                const style = visibleForStudents ? tagVisible : tagDraft;
                return (
                  <a
                    key={ev.id}
                    href={`/events/${ev.id}`}
                    style={style as React.CSSProperties}
                    title={
                      visibleForStudents
                        ? ev.title
                        : ev.publish_at
                          ? `${ev.title} • Draft (publishes ${new Date(ev.publish_at).toLocaleString()})`
                          : `${ev.title} • Draft`
                    }
                  >
                    {formatTimeLocalISO(ev.start_time)} · {ev.title}
                    {!visibleForStudents && " (Draft)"}
                  </a>
                );
              })}
            </div>
          );
        })}
      </div>

      {loading && <p style={{ padding: 12, color: "var(--muted)" }}>Loading events…</p>}
      {err && <p style={{ padding: 12, color: "#b91c1c" }}>{err}</p>}
    </section>
  );
}
