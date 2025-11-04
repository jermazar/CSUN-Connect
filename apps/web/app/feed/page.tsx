"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { createPost, useCampusPosts, useMyMajorPosts } from "@campus/data";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function PostCard({ p }: any) {
  const name = p.author?.full_name || "Student";
  const avatar = p.author?.avatar_url || undefined;
  return (
    <article style={{ border:"1px solid #eee", borderRadius:16, padding:12 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{
          width:36, height:36, borderRadius:9999, background:"#e5e7eb",
          backgroundImage: avatar ? `url(${avatar})` : undefined,
          backgroundSize:"cover", backgroundPosition:"center",
          border:"1px solid #ddd"
        }}/>
        <div style={{ fontWeight:600 }}>{name}</div>
        <div style={{ marginLeft:"auto", fontSize:12, color:"#777" }}>
          {new Date(p.created_at).toLocaleString()}
        </div>
      </div>
      <p style={{ marginTop:8 }}>{p.body}</p>
      {p.major && <span style={{ fontSize:12, color:"#555" }}>#{p.major}</span>}
    </article>
  );
}

export default function Page() {
  const [tab, setTab] = useState<"campus" | "major">("campus");
  const [text, setText] = useState("");
  const [majorCode, setMajorCode] = useState<string | null>(null);
  const [majorName, setMajorName] = useState<string | null>(null);
  const campus = useCampusPosts();
  const major = useMyMajorPosts();

  // Load my major code + friendly name once
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return;

      const { data: prof } = await supabase
        .from("profiles")
        .select("major")
        .eq("id", uid)
        .maybeSingle();

      const code = (prof?.major as string) ?? null;
      setMajorCode(code);

      if (code) {
        const { data: m } = await supabase
          .from("majors")
          .select("name")
          .eq("code", code)
          .maybeSingle();
        setMajorName(m?.name ?? code);
      }
    })();
  }, []);

  async function submit() {
    const body = text.trim();
    if (!body) return;
    await createPost(body, tab);
    setText("");
    if (tab === "campus") {
      campus.refetch();
    } else {
      major.refetch();
    }
  }

  const list = tab === "campus" ? (campus.data ?? []) : (major.data ?? []);
  const majorTabDisabled = !majorCode; // no major set yet
  const majorTabLabel = majorName ? `${majorName}` : "My Major";
  const feedTitle = tab === "campus" ? "Campus Feed" : `${majorTabLabel} Feed`;

  return (
    <main style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24, padding:24 }}>
      <section style={{ border:"1px solid #eee", borderRadius:16, padding:16 }}>
        <h2>Share an update</h2>
        <div style={{ display:"flex", gap:8, marginTop:12 }}>
          <button
            onClick={() => setTab("campus")}
            style={{ padding:"6px 10px", borderRadius:8, border: tab==="campus" ? "2px solid #111" : "1px solid #ccc", background:"#fff" }}
          >
            Campus
          </button>
          <button
            onClick={() => !majorTabDisabled && setTab("major")}
            disabled={majorTabDisabled}
            title={majorTabDisabled ? "Add your major on the Account page" : ""}
            style={{
              padding:"6px 10px",
              borderRadius:8,
              border: tab==="major" ? "2px solid #111" : "1px solid #ccc",
              background:"#fff",
              opacity: majorTabDisabled ? 0.5 : 1,
              cursor: majorTabDisabled ? "not-allowed" : "pointer",
            }}
          >
            {majorTabLabel}
          </button>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={tab==="campus" ? "What's happening on campus?" : `What's happening in ${majorTabLabel.toLowerCase()}?`}
          style={{ marginTop:12, width:"100%", minHeight:120, borderRadius:12, border:"1px solid #ddd", padding:10 }}
        />
        <div style={{ display:"flex", justifyContent:"flex-end" }}>
          <button onClick={submit} style={{ padding:"8px 12px", border:"1px solid #111", borderRadius:8, background:"#fff" }}>
            Post
          </button>
        </div>

        {majorTabDisabled && (
          <p style={{ marginTop:8, fontSize:12, color:"#555" }}>
            To post in your major feed, set your major on the <a href="/account" style={{ textDecoration:"underline" }}>Account</a> page.
          </p>
        )}
      </section>

      <section>
        <h2 style={{ marginBottom:12 }}>{feedTitle}</h2>
        <div style={{ display:"grid", gap:12 }}>
          {list.map((p: any) => <PostCard key={p.id} p={p} />)}
          {list.length===0 && <p style={{ color:"#777" }}>No posts yet.</p>}
        </div>
      </section>
    </main>
  );
}
