"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Page() {
  const [first, setFirst] = useState("");
  const [last, setLast]   = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw]       = useState("");
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState<string|null>(null);
  const [ok, setOk]       = useState<string|null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setOk(null);

    if (!first.trim() || !last.trim()) return setErr("Please enter your first and last name.");
    if (!email.trim()) return setErr("Email is required.");
    if (pw.length < 8) return setErr("Password must be at least 8 characters.");

    setBusy(true);
    try {
      // 1) SIGN UP with metadata (your variables are correct)
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pw,
        options: {
          data: {
            first_name: first.trim(),
            last_name:  last.trim(),
            full_name:  `${first.trim()} ${last.trim()}`,
          },
        },
      });
      if (error) throw error;

      // 2) If email confirmation is OFF, you'll get a session immediately.
      //    The DB trigger already created public.profiles(id = user.id).
      //    We DO NOT insert a new row; we just update the one created by the trigger.
      if (data.user && data.session) {
        const uid = data.user.id;
        const full = `${first.trim()} ${last.trim()}`.trim();

        // Mirror the compat column user_id and set full_name (safe under your RLS: update own row)
        await supabase
          .from("profiles")
          .update({ user_id: uid, full_name: full })
          .eq("id", uid);

        setOk("Account created! Redirecting to Feed…");
        window.location.assign("/feed");
        return;
      }

      // 3) If email confirmation is ON, there is no session yet.
      setOk("Check your email to confirm your account.");
    } catch (e: any) {
      setErr(e.message || "Sign up failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto grid max-w-md gap-6 p-6">
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <form onSubmit={onSubmit} className="grid gap-3 rounded-2xl border p-4">
        <div className="grid gap-1">
          <label className="text-sm opacity-80">First name</label>
          <input className="rounded border px-3 py-2" value={first} onChange={e=>setFirst(e.target.value)} />
        </div>
        <div className="grid gap-1">
          <label className="text-sm opacity-80">Last name</label>
          <input className="rounded border px-3 py-2" value={last} onChange={e=>setLast(e.target.value)} />
        </div>
        <div className="grid gap-1">
          <label className="text-sm opacity-80">Email</label>
          <input type="email" className="rounded border px-3 py-2" value={email} onChange={e=>setEmail(e.target.value)} />
        </div>
        <div className="grid gap-1">
          <label className="text-sm opacity-80">Password</label>
          <input type="password" className="rounded border px-3 py-2" value={pw} onChange={e=>setPw(e.target.value)} />
        </div>
        <button disabled={busy} className="rounded border px-4 py-2 font-medium disabled:opacity-50">
          {busy ? "Creating…" : "Create account"}
        </button>
        {err && <p className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">{err}</p>}
        {ok  && <p className="rounded border border-green-300 bg-green-50 p-2 text-sm text-green-700">{ok}</p>}
      </form>
    </main>
  );
}
