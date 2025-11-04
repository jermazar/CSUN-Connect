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
  major: string | null;             // majors.code
  graduation_year: number | null;   // renamed
  clubs: string[] | null;           // NEW: array of codes
};

type Major = { code: string; name: string };

/* ---------- Clubs options (codes stored, labels displayed) ---------- */
type Option = { value: string; label: string };
const CLUB_OPTIONS: Option[] = [
  { value: "ACM",   label: "Association for Computing Machinery (ACM)" },
  { value: "IEEE",  label: "IEEE Student Branch" },
  { value: "HKN",   label: "IEEE–Eta Kappa Nu (HKN) Honor Society" },
  { value: "LECS",  label: "Leaders in Engineering & Computer Science (LECS)" },
  { value: "SWE",   label: "Society of Women Engineers (SWE)" },
  { value: "NSBE",  label: "National Society of Black Engineers (NSBE)" },
  { value: "SHPE",  label: "Society of Hispanic Professional Engineers (SHPE)" },
  { value: "ROBOT", label: "Matador Robotics" },
  { value: "WICS",  label: "Women in Computer Science" },
  { value: "ASCE",  label: "American Society of Civil Engineers (ASCE)" },
  { value: "ASME",  label: "American Society of Mechanical Engineers (ASME)" },
  { value: "AMA",   label: "American Marketing Association (AMA)" },
];

/* ---------- Searchable Multi-Select (no deps) ---------- */
function SearchableMultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
}: {
  options: Option[];
  value: string[];                 // selected codes
  onChange: (v: string[]) => void; // setter
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const selSet = React.useMemo(() => new Set(value), [value]);
  const filtered = React.useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    );
  }, [query, options]);

  function toggle(code: string) {
    const next = new Set(selSet);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    onChange(Array.from(next));
  }

  // close when clicking outside
  const boxRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const display =
    value.length === 0
      ? placeholder
      : options
          .filter((o) => selSet.has(o.value))
          .map((o) => o.label)
          .join(", ");

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          textAlign: "left",
          border: "1px solid #d1d5db",
          borderRadius: 8,
          padding: "8px 10px",
          background: "#fff",
        }}
        aria-expanded={open}
      >
        <span style={{ color: value.length ? "#111827" : "#9ca3af" }}>
          {display || placeholder}
        </span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            zIndex: 20,
            left: 0,
            right: 0,
            marginTop: 6,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,.08)",
            padding: 8,
          }}
        >
          <input
            placeholder="Search clubs…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: "100%",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              padding: "8px 10px",
              marginBottom: 8,
              boxSizing: "border-box",
            }}
          />
          <div
            style={{
              maxHeight: 220,
              overflow: "auto",
              display: "grid",
              gap: 4,
              paddingRight: 4,
            }}
          >
            {filtered.length === 0 && (
              <div style={{ fontSize: 13, color: "#6b7280", padding: 6 }}>
                No matches
              </div>
            )}
            {filtered.map((opt) => {
              const checked = selSet.has(opt.value);
              return (
                <label
                  key={opt.value}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 8px",
                    borderRadius: 8,
                    background: checked ? "#f3f4f6" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(opt.value)}
                  />
                  <span>{opt.label}</span>
                </label>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                border: "1px solid #111827",
                borderRadius: 8,
                padding: "6px 10px",
                background: "#fff",
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AccountPage() {
  const [userId, setUserId] = React.useState<string | null>(null);

  // name
  const [first, setFirst] = React.useState("");
  const [last, setLast] = React.useState("");

  // profile fields
  const [major, setMajor] = React.useState<string>(""); // majors.code
  const [graduationYear, setGraduationYear] = React.useState<number | "">(""); // current year+
  const [clubs, setClubs] = React.useState<string[]>([]); // codes

  // majors dropdown
  const [majors, setMajors] = React.useState<Major[]>([]);

  // avatar
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);

  // statuses
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [ok, setOk] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  // Load majors (active only) for the dropdown
  React.useEffect(() => {
    supabase
      .from("majors")
      .select("code,name")
      .eq("is_active", true)
      .order("name")
      .then(({ data, error }) => {
        if (!error && data) setMajors(data);
      });
  }, []);

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
        .select("full_name, avatar_url, major, graduation_year, clubs")
        .eq("id", uid)
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
      setGraduationYear(row.graduation_year ?? "");
      setClubs(row.clubs ?? []);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Save clicked
  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return setErr("Not signed in.");
    setErr(null);
    setOk(null);
    setSaving(true);
    try {
      const full = `${first.trim()} ${last.trim()}`.trim();

      // enforce current year+
      const currentYear = new Date().getFullYear();
      if (graduationYear !== "" && Number(graduationYear) < currentYear) {
        throw new Error(`Graduation Year must be ${currentYear} or later.`);
      }

      const payload = {
        full_name: full || null,
        avatar_url: avatarUrl || null,
        major: major || null, // majors.code
        graduation_year: graduationYear === "" ? null : Number(graduationYear),
        clubs: clubs.length ? clubs : null,
        user_id: userId, // keep mirror column in sync
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

  // Choose avatar file
  async function onPickFile(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file || !userId) return;

    // Immediately show preview
    const localPreview = URL.createObjectURL(file);
    setAvatarPreview(localPreview);

    setErr(null);
    setOk(null);
    setUploading(true);
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
      setAvatarPreview(null);
    } finally {
      setUploading(false);
      (ev.target as HTMLInputElement).value = ""; // reset file input
    }
  }

  // ---------- Inline styles ----------
  const wrap: React.CSSProperties = { maxWidth: 720, margin: "0 auto", padding: "16px 0" };
  const card: React.CSSProperties = { border: "1px solid #e5e7eb", borderRadius: 16, padding: 16 };
  const row: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, alignItems: "center" };
  const btn: React.CSSProperties = { border: "1px solid #111827", borderRadius: 8, padding: "8px 12px", background: "#fff", cursor: "pointer" };
  const input: React.CSSProperties = { border: "1px solid #d1d5db", borderRadius: 8, padding: "8px 10px", width: "100%", boxSizing: "border-box" };
  const label: React.CSSProperties = { fontSize: 13, opacity: 0.8 };

  if (!userId) {
    return (
      <main style={wrap}>
        <h1>My Account</h1>
        <p>
          Please{" "}
          <a href="/sign-in" style={{ textDecoration: "underline", color: "rebeccapurple" }}>
            sign in
          </a>{" "}
          to edit your profile.
        </p>
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
          <select
            style={input}
            value={major}
            onChange={(e) => setMajor(e.target.value)}
          >
            <option value="">Select major…</option>
            {majors.map((m) => (
              <option key={m.code} value={m.code}>
                {m.name}
              </option>
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
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div style={row}>
          <span style={label}>Clubs</span>
          <SearchableMultiSelect
            options={CLUB_OPTIONS}
            value={clubs}
            onChange={setClubs}
            placeholder="Select clubs…"
          />
        </div>

        <div style={row}>
          <span style={label}>Profile picture</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 9999,
                background: "#e5e7eb",
                backgroundImage: finalAvatar ? `url(${finalAvatar})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
                border: "1px solid #d1d5db",
              }}
              aria-label="Avatar preview"
            />
            <label style={{ ...btn, display: "inline-block", opacity: uploading ? 0.6 : 1, pointerEvents: uploading ? "none" : "auto" }}>
              {uploading ? "Uploading…" : "Choose file"}
              <input type="file" accept="image/*" onChange={onPickFile} style={{ display: "none" }} />
            </label>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button type="submit" disabled={saving} style={{ ...btn, opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>

        {ok && (
          <p style={{ color: "#065f46", background: "#ecfdf5", border: "1px solid #a7f3d0", padding: 8, borderRadius: 8 }}>
            {ok}
          </p>
        )}
        {err && (
          <p style={{ color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", padding: 8, borderRadius: 8 }}>
            {err}
          </p>
        )}
      </form>
    </main>
  );
}
