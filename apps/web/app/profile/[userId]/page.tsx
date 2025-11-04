// apps/web/app/profile/[userId]/page.tsx
import { createClient } from "@supabase/supabase-js";

type Params = { params: { userId: string } };

export const dynamic = "force-dynamic"; // make sure it always fetches fresh

export default async function ProfilePage({ params }: Params) {
  const { userId } = params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1) Load the profile
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("user_id, full_name, major, class_year, interests, avatar_url")
    .eq("user_id", userId)
    .single();

  if (profileErr || !profile) {
    return (
      <section style={{ maxWidth: 960, margin: "24px auto", padding: "0 24px" }}>
        <h1>Profile</h1>
        <p style={{ color: "var(--muted)" }}>Profile not found.</p>
      </section>
    );
  }

  // 2) Load this user’s recent posts (public only)
  const { data: posts = [] } = await supabase
    .from("posts")
    .select("id, body, created_at")
    .eq("author_id", userId)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(20);

  const wrap: React.CSSProperties = {
    maxWidth: 960,
    margin: "24px auto",
    padding: "0 24px",
  };

  const headerCard: React.CSSProperties = {
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: 16,
    background: "var(--card)",
    boxShadow: "0 1px 3px rgba(0,0,0,.05)",
    marginBottom: 16,
  };

  const avatarStyle: React.CSSProperties = {
    width: 72,
    height: 72,
    borderRadius: 9999,
    border: "1px solid var(--border)",
    background: "#e5e7eb",
    backgroundImage: profile.avatar_url ? `url(${profile.avatar_url})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
    flex: "0 0 auto",
  };

  const row: React.CSSProperties = {
    display: "flex",
    gap: 16,
    alignItems: "center",
  };

  const grid: React.CSSProperties = {
    display: "grid",
    gap: 12,
  };

  return (
    <section style={wrap}>
      <div style={headerCard}>
        <div style={row}>
          <div style={avatarStyle} />
          <div>
            <h1 style={{ margin: "0 0 4px 0" }}>
              {profile.full_name || "Student"}
            </h1>
            <div style={{ color: "var(--muted)", fontSize: 14 }}>
              {profile.major ? profile.major : "—"}
              {profile.class_year ? ` • Class of ${profile.class_year}` : ""}
            </div>
            {Array.isArray(profile.interests) && profile.interests.length > 0 && (
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {profile.interests.map((tag: string) => (
                  <span
                    key={tag}
                    style={{
                      background: "var(--brand-50)",
                      border: "1px solid var(--brand-200)",
                      borderRadius: 9999,
                      padding: "2px 10px",
                      fontSize: 12,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <h2 style={{ margin: "16px 0 8px 0" }}>Recent posts</h2>
      {posts.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>No posts yet.</p>
      ) : (
        <ul style={grid}>
          {posts.map((p) => (
            <li
              key={p.id}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: 16,
                background: "var(--card)",
                boxShadow: "0 1px 3px rgba(0,0,0,.05)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "var(--muted)",
                  marginBottom: 6,
                  textAlign: "right",
                }}
              >
                {new Date(p.created_at).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </div>
              <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{p.body}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
