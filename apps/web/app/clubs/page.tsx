"use client";
import { useState } from "react";
import Link from "next/link";
import { useClubs, useCreateClub } from "@campus/data/clubs";

export default function ClubsPage() {
  const [q, setQ] = useState("");
  const { data, isLoading, error } = useClubs(q);
  const createClub = useCreateClub();
  const [form, setForm] = useState({ code: "", name: "" });

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Clubs</h1>
        <input
          value={q}
          onChange={(e)=>setQ(e.target.value)}
          placeholder="Search clubs"
          className="border rounded px-3 py-2"
        />
      </header>

      <section className="border rounded p-4 space-y-3">
        <h2 className="font-medium">Create a club</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            className="border rounded px-3 py-2"
            placeholder="Name"
            value={form.name}
            onChange={(e)=> {
              const name = e.target.value;
              const code = name.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");
              setForm({ name, code });
            }}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="code"
            value={form.code}
            onChange={(e)=> setForm(f=>({ ...f, code: e.target.value }))}
          />
        </div>
        <button
          className="mt-2 px-3 py-2 rounded bg-black text-white disabled:opacity-50"
          disabled={!form.code || !form.name || createClub.isPending}
          onClick={()=> createClub.mutate(
            { code: form.code, name: form.name, is_active: true },
            { onSuccess: ()=> setForm({ code: "", name: "" }) }
          )}
        >
          {createClub.isPending ? "Creating…" : "Create club"}
        </button>
        {createClub.isError && <p className="text-red-600">{String(createClub.error)}</p>}
      </section>

      <section>
        {isLoading && <p>Loading…</p>}
        {error && <p className="text-red-600">{String(error)}</p>}
        <ul className="grid gap-3 sm:grid-cols-2">
          {data?.map((c)=>(
            <li key={c.code} className="border rounded p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{c.name}</h3>
                  <p className="text-xs mt-1">{c.v_club_member_counts?.member_count ?? 0} members</p>
                </div>
                <Link href={`/clubs/${c.code}`} className="text-blue-600 underline">Open</Link>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
