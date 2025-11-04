"use client";

import * as React from "react";
import { createClient } from "@supabase/supabase-js";
import MultiSelect from "../components/MultiSelect"; // keep this path

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ---- Types ----
type ProfileRow = {
  full_name: string | null;
  avatar_url: string | null;
  major: string | null;             // majors.code
  graduation_year: number | null;   // renamed earlier
  clubs: string[] | null;           // array of club codes
};

type Major = { code: string; name: string };
type Club  = { code: string; name: string };

export default function AccountPage() {
  const [userId, setUserId] = React.useState<string | null>(null);

  // name
  const [first, setFirst] = React.useState("");
  const [last, setLast]   = React.useState("");

  // profile fields
  const [major, setMajor] = React.useState<string>(""); // majors.code
  const [graduationYear, setGraduationYear] = React.useState<number | "">("");
  const [clubs, setClubs] = React.useState<string[]>([]); // selected club codes

  // reference data
  const [majors, setMajors] = React.useState<Major[]>([]);
  const [clubOptions, setClubOptions] = React.useState<Club[]>([]);

  // avatar
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);

  // statuses
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [ok, setOk] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  // ---- Load reference data ----
  React.useEffect(() => {
    // majors
    supabase
      .from("majors")
      .select("code,name")
      .eq("is_active", true)
      .order("name")
      .then(({ data, error }) => {
        if (!error && data) setMajors(data as Major[]);
      });

    // clubs
    supabase
      .from("clubs")
      .select("code,name")
      .eq("is_active", true)
      .order("name")
      .then(({ data, error }) => {
        if (!error && data) setClubOptions(data as Club[]);
      });
  }, []);

  // ---- Load auth + profile ----
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, major, graduation_year, clubs")
        .eq("id", uid)
        .single();

      if (error) {
        setErr(error.message);
        return;
      }
      if (!mounted || !data) return;

      const row = data as ProfileRow;

      // split full name into first / last
      const full = (row.full_name ?? "").trim();
      const [f, ...rest] = full.split(" ");
      setFirst(f ?? "");
      setLast(rest.join(" ") ?? "");

      setAvatarUrl(row.avatar_url ?? null);
      setMajor(row.major ?? "");
      setGraduationYear(row.graduation_year ?? "");
      setClubs(row.clubs ?? []);
    })();
    return () => { mounted = false; };
  }, []);

  // ---- Save ----
  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return setErr("Not signed in.");
    setErr(null); setOk(null); setSaving(true);

    try {
      const full = `${first.trim()} ${last.trim()}`.trim();

      const currentYear = new Date().getFullYear();
      if (graduationYear !== "" && Number(graduationYear) < currentYear) {
        throw new Error(`Graduation Year must be ${currentYear} or later.`);
      }

      const payload = {
        full_name: full || null,
        avatar_url: avatarUrl || null,
        major: major || null,
        graduation_year: graduationYear === "" ? null : Number(graduationYear),
        clubs: clubs.length ? clubs : null,
        user_id: userId,
      };

      const { error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", userId);

      if (error) throw error;
      setOk("Profile updated!");
    } catch (e: any) {
      setErr(e.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  // ---- Upload avatar ----
  async function onPickFile(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file || !userId) return;

    const localPreview = URL.createObjectURL(file);
    setAvatarPreview(localPreview);

    setErr(null); setOk(null); setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase
        .storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });

      if (upErr) throw upErr;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = data.publicUrl;

      setAvatarUrl(publicUrl);
      setOk("Image uploaded. Click Save Changes to update your profile.");
    } catch (e: any) {
      setErr(e.message || "Upload failed");
      setAvatarPreview(null);
    } finally {
      setUploading(false);
      (ev.target as HTMLInputElement).value = "";
    }
  }

  // ---- UI styles ----
  const wrap: React.CSSProperties = { maxWidth: 720, margin: "0 auto", padding: "16px 0" };
  const card: React.CSSProperties = { border: "1px solid var(--elev-border)", borderRadius: 16, padding: 16, background: "var(--card)", color: "var(--text)", boxShadow: "var(--shadow)" as any };
  const row: React.CSSProperties  = { display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, alignItems: "center" };
  const btn: React.CSSProperties  = { border: "1px solid var(--btn-border)", borderRadius: 8, padding: "8px 12px", background: "var(--btn-bg)", color: "var(--btn-text)", cursor: "pointer" };
  const input: React.CSSProperties = { border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", width: "100%", boxSizing: "border-box", background: "var(--bg)", color: "var(--text)" };
  const label: React.CSSProperties = { fontSize: 13, opacity: .8 };

  if (!userId) {
    return (
      <main style={wrap}>
        <h1>My Account</h1>
        <p>Please <a href="/sign-in" style={{ textDecoration: "underline", color: "var(--link)" }}>sign in</a> to edit your profile.</p>
      </main>
    );
  }

  const finalAvatar = avatarPreview ?? avatarUrl ?? null;

  // year options: current year .. current year + 10
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear + i);

  return (
    <main style={wrap}>
      <h1 style={{ marginBottom: 12 }}>My Account</h1>
      <form onSubmit={saveProfile} style={{ ...card, display: "grid", gap: 16 }}>
        <div style={row}>
          <span style={label}>First name</span>
          <input style={input} value={first} onChange={(e) => setFirst(e.target.value)} />
        </div>

        <div style={row}>
          <span style={label}>Last name</span>
          <input style={input} value={last} onChange={(e) => setLast(e.target.value)} />
        </div>

        <div style={row}>
          <span style={label}>Major</span>
          <select style={input} value={major} onChange={(e) => setMajor(e.target.value)}>
            <option value="">Select major…</option>
            {majors.map((m) => (
              <option key={m.code} value={m.code}>{m.name}</option>
            ))}
          </select>
        </div>

        <div style={row}>
          <span style={label}>Graduation Year</span>
          <select
            style={input}
            value={graduationYear === "" ? "" : String(graduationYear)}
            onChange={(e) => setGraduationYear(e.target.value === "" ? "" : Number(e.target.value))}
          >
            <option value="">Select year…</option>
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Clubs (compact searchable multi-select dropdown) */}
        <div style={row}>
          <span style={label}>Clubs</span>
          <MultiSelect
            options={clubOptions.map(c => ({ value: c.code, label: `${c.name} (${c.code})` }))}
            value={clubs}
            onChange={setClubs}
            placeholder="Select clubs…"
            ariaLabel="Select one or more clubs"
          />
        </div>

        <div style={row}>
          <span style={label}>Profile picture</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 64, height: 64, borderRadius: 9999, background: "#e5e7eb",
                backgroundImage: finalAvatar ? `url(${finalAvatar})` : undefined,
                backgroundSize: "cover", backgroundPosition: "center",
                border: "1px solid var(--border)",
              }}
              aria-label="Avatar preview"
            />
            <label style={{ ...btn, display: "inline-block", opacity: uploading ? .6 : 1, pointerEvents: uploading ? "none" : "auto" }}>
              {uploading ? "Uploading…" : "Choose file"}
              <input type="file" accept="image/*" onChange={onPickFile} style={{ display: "none" }} />
            </label>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button type="submit" disabled={saving} style={{ ...btn, opacity: saving ? .6 : 1 }}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>

        {ok  && <p style={{ color: "#065f46", background: "#ecfdf5", border: "1px solid #a7f3d0", padding: 8, borderRadius: 8 }}>{ok}</p>}
        {err && <p style={{ color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", padding: 8, borderRadius: 8 }}>{err}</p>}
      </form>
    </main>
  );
}
