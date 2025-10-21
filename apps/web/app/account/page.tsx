"use client";

import * as React from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type ProfileRow = {
  full_name: string | null;
  avatar_url: string | null;
  major: string | null;
  class_year: number | null;
  interests: string[] | null;
};

export default function AccountPage() {
  const [userId, setUserId] = React.useState<string | null>(null);

  // name
  const [first, setFirst] = React.useState("");
  const [last, setLast] = React.useState("");

  // profile fields
  const [major, setMajor] = React.useState("");
  const [classYear, setClassYear] = React.useState<number | "">("");
  const [interestsStr, setInterestsStr] = React.useState("");

  // avatar
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);

  // statuses
  const [saving, setSaving] = React.useState(false);     // saving the profile
  const [uploading, setUploading] = React.useState(false); // uploading image
  const [ok, setOk] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  // Load auth + profile
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, major, class_year, interests")
        .eq("user_id", uid)
        .single();

      if (error) {
        setErr(error.message);
        return;
      }
      if (!mounted || !data) return;

      const row = data as ProfileRow;

      // split full name into first / last for UI
      const full = (row.full_name ?? "").trim();
      const [f, ...rest] = full.split(" ");
      setFirst(f ?? "");
      setLast(rest.join(" ") ?? "");

      setAvatarUrl(row.avatar_url ?? null);
      setMajor(row.major ?? "");
      setClassYear(row.class_year ?? "");
      setInterestsStr((row.interests ?? []).join(", "));
    })();
    return () => { mounted = false; };
  }, []);

  // Save clicked
  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return setErr("Not signed in.");
    setErr(null); setOk(null); setSaving(true);
    try {
      const full = `${first.trim()} ${last.trim()}`.trim();

      // parse interests from comma-separated string
      const parsedInterests = interestsStr
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);

      const payload = {
        full_name: full || null,
        avatar_url: avatarUrl || null,
        major: major || null,
        class_year: classYear === "" ? null : Number(classYear),
        interests: parsedInterests.length ? parsedInterests : null,
      };

      const { error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("user_id", userId);

      if (error) throw error;
      setOk("Profile updated!");
    } catch (e: any) {
      setErr(e.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  // Choose avatar file
  async function onPickFile(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file || !userId) return;

    // Immediately show preview
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

      // set the final avatar URL (persist on Save)
      setAvatarUrl(publicUrl);
      setOk("Image uploaded. Click Save Changes to update your profile.");
    } catch (e: any) {
      setErr(e.message || "Upload failed");
      // if the upload failed, drop preview
      setAvatarPreview(null);
    } finally {
      setUploading(false);
      (ev.target as HTMLInputElement).value = ""; // reset file input for same-file reselect
    }
  }

  // ---------- Inline styles ----------
  const wrap: React.CSSProperties = { maxWidth: 720, margin: "0 auto", padding: "16px 0" };
  const card: React.CSSProperties = { border: "1px solid #e5e7eb", borderRadius: 16, padding: 16 };
  const row: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, alignItems: "center" };
  const btn: React.CSSProperties = { border: "1px solid #111827", borderRadius: 8, padding: "8px 12px", background: "#fff", cursor: "pointer" };
  const input: React.CSSProperties = { border: "1px solid #d1d5db", borderRadius: 8, padding: "8px 10px", width: "100%", boxSizing: "border-box" };
  const label: React.CSSProperties = { fontSize: 13, opacity: .8 };

  if (!userId) {
    return (
      <main style={wrap}>
        <h1>My Account</h1>
        <p>Please <a href="/sign-in" style={{ textDecoration: "underline", color: "rebeccapurple" }}>sign in</a> to edit your profile.</p>
      </main>
    );
  }

  const finalAvatar = avatarPreview ?? avatarUrl ?? null;

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
          <input style={input} value={major} onChange={(e) => setMajor(e.target.value)} placeholder="Computer Science" />
        </div>

        <div style={row}>
          <span style={label}>Class year</span>
          <input
            type="number"
            style={input}
            value={classYear}
            onChange={(e) => setClassYear(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="2026"
          />
        </div>

        <div style={row}>
          <span style={label}>Interests</span>
          <input
            style={input}
            value={interestsStr}
            onChange={(e) => setInterestsStr(e.target.value)}
            placeholder="AI, Basketball, Robotics"
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
                border: "1px solid #d1d5db",
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

        {ok && <p style={{ color: "#065f46", background: "#ecfdf5", border: "1px solid #a7f3d0", padding: 8, borderRadius: 8 }}>{ok}</p>}
        {err && <p style={{ color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", padding: 8, borderRadius: 8 }}>{err}</p>}
      </form>
    </main>
  );
}
