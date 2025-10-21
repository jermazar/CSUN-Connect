"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Page() {
  const router = useRouter();
  const params = useSearchParams();
  const prefill = params.get("email") ?? "";

  const [email, setEmail] = useState(prefill);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) throw error;
      router.replace("/feed");
    } catch (e:any) {
      // Supabase commonly returns "Invalid login credentials"
      setErr(e.message || "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto grid max-w-md gap-6 p-6">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <form onSubmit={onSubmit} className="grid gap-3 rounded-2xl border p-4">
        <div className="grid gap-1">
          <label className="text-sm opacity-80">Email</label>
          <input type="email" className="rounded border px-3 py-2" value={email} onChange={e=>setEmail(e.target.value)} />
        </div>
        <div className="grid gap-1">
          <label className="text-sm opacity-80">Password</label>
          <input type="password" className="rounded border px-3 py-2" value={pw} onChange={e=>setPw(e.target.value)} />
        </div>
        <button disabled={busy} className="rounded border px-4 py-2 font-medium disabled:opacity-50">
          {busy ? "Signing in…" : "Sign in"}
        </button>

        {err && (
          <div className="grid gap-2">
            <p className="rounded border border-amber-300 bg-amber-50 p-2 text-sm text-amber-800">
              {err}
            </p>
            <div className="text-sm">
              Don’t have an account?{" "}
              <Link
                href={`/sign-up?email=${encodeURIComponent(email)}`}
                className="underline"
              >
                Create an account
              </Link>
            </div>
          </div>
        )}
      </form>
    </main>
  );
}
