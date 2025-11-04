// apps/web/app/page.tsx
import React from "react";

export default function LandingPage() {
  const wrap: React.CSSProperties = {
    maxWidth: 960,
    margin: "32px auto",
    padding: "0 24px",
  };

  const hero: React.CSSProperties = {
    textAlign: "center",
    marginBottom: 24,
  };

  const grid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  };

  const card: React.CSSProperties = {
    padding: 20,
    border: "1px solid var(--border)",
    borderRadius: 16,
    background: "var(--card)",
    boxShadow: "0 1px 3px rgba(0,0,0,.06)",
  };

  const title: React.CSSProperties = { margin: "0 0 8px 0" };
  const desc: React.CSSProperties = { margin: 0, color: "var(--muted)" };

  const link: React.CSSProperties = {
    display: "block",
    textDecoration: "none",
    color: "inherit",
  };

  return (
    <section style={wrap}>
      <header style={hero}>
        <h1 style={{ margin: 0 }}>Welcome Matadors to <span style={{ color: "var(--brand-700)" }}>CSUN Connect</span>!</h1>
        <p style={{ marginTop: 8, color: "var(--muted)" }}>
          Your hub for campus updates, events, and student life.
        </p>
      </header>

      <div style={grid}>
        <a href="/feed" style={link}>
          <div style={card}>
            <h3 style={title}>Campus Feed</h3>
            <p style={desc}>See what students are posting in real time.</p>
          </div>
        </a>

        <a href="/events" style={link}>
          <div style={card}>
            <h3 style={title}>Events</h3>
            <p style={desc}>Browse upcoming club meetings and campus events.</p>
          </div>
        </a>

        <a href="/account" style={link}>
          <div style={card}>
            <h3 style={title}>My Account</h3>
            <p style={desc}>Edit your name and profile picture.</p>
          </div>
        </a>
      </div>
    </section>
  );
}
