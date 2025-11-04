import React from "react";
import dynamic from "next/dynamic";

// Dynamically import calendar widget (client component)
const CalendarMonth = dynamic(
  () => import("../components/events/CalendarMonth"),
  { ssr: false }
);

export default function CalendarPage() {
  const wrap: React.CSSProperties = { 
    maxWidth: 960, 
    margin: "16px auto", 
    padding: "0 24px 24px" 
  };
  const h1: React.CSSProperties = { margin: "0 0 12px 0" };

  return (
    <main style={wrap}>
      <h1 style={h1}>Campus Calendar</h1>
      <CalendarMonth />
    </main>
  );
}
