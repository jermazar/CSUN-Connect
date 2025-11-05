"use client";
import { useState } from "react";
import {
  useClub, useClubEvents, useJoinClub, useCreateEvent, useRsvp
} from "@campus/data/clubs";
import ClientDate from "@/components/ClientDate";

export default function ClubDetail({ params }: { params: { code: string }}) {
  const { data: club, isLoading, error } = useClub(params.code);
  const { data: events } = useClubEvents(params.code);
  const join = useJoinClub();
  const createEvent = useCreateEvent();
  const rsvp = useRsvp();

  const [evt, setEvt] = useState({
    title: "", location: "", start_time: "", end_time: "", is_published: true,
  });

  if (isLoading) return <p className="p-6">Loading…</p>;
  if (error || !club) return <p className="p-6 text-red-600">Not found</p>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <header className="border rounded p-4">
        <h1 className="text-2xl font-semibold">{club.name}</h1>
        <div className="mt-2 text-sm">{club.v_club_member_counts?.member_count ?? 0} members</div>
        <button
          className="mt-3 px-3 py-2 rounded bg-black text-white disabled:opacity-50"
          disabled={join.isPending}
          onClick={()=> join.mutate({ club_code: club.code })}
        >
          {join.isPending ? "Joining…" : "Join club"}
        </button>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Upcoming events</h2>
        <ul className="space-y-3">
          {events?.map(e=>(
            <li key={e.id} className="border rounded p-4">
              <div className="font-medium">{e.title}</div>
              <div className="text-sm text-gray-700"><ClientDate iso={e.start_time} /></div>
              <div className="text-sm">{e.location}</div>
              <div className="text-xs mt-1">
                {e.v_event_attendee_counts?.going_count ?? 0} going · {e.v_event_attendee_counts?.interested_count ?? 0} interested
              </div>
              <div className="flex gap-2 mt-3">
                <button className="px-2 py-1 border rounded" onClick={()=> rsvp.mutate({ event_id: e.id, rsvp_status: "going" })}>Going</button>
                <button className="px-2 py-1 border rounded" onClick={()=> rsvp.mutate({ event_id: e.id, rsvp_status: "interested" })}>Interested</button>
                <button className="px-2 py-1 border rounded" onClick={()=> rsvp.mutate({ event_id: e.id, rsvp_status: "not_going" })}>Not going</button>
              </div>
            </li>
          ))}
          {!events?.length && <p className="text-gray-600">No upcoming events yet</p>}
        </ul>
      </section>

      <section className="border rounded p-4">
        <h3 className="font-medium mb-2">Create event</h3>
        <div className="grid sm:grid-cols-2 gap-2">
          <input className="border rounded px-3 py-2" placeholder="Title"
            value={evt.title} onChange={(e)=> setEvt(v=>({ ...v, title: e.target.value }))} />
          <input className="border rounded px-3 py-2" placeholder="Location"
            value={evt.location} onChange={(e)=> setEvt(v=>({ ...v, location: e.target.value }))} />
          <input className="border rounded px-3 py-2" type="datetime-local"
            value={evt.start_time} onChange={(e)=> setEvt(v=>({ ...v, start_time: e.target.value }))} />
          <input className="border rounded px-3 py-2" type="datetime-local"
            value={evt.end_time} onChange={(e)=> setEvt(v=>({ ...v, end_time: e.target.value }))} />
          <label className="flex items-center gap-2 text-sm mt-1">
            <input type="checkbox" checked={evt.is_published}
              onChange={(e)=> setEvt(v=>({ ...v, is_published: e.target.checked }))} />
            Published
          </label>
        </div>
        <button
          className="mt-3 px-3 py-2 rounded bg-black text-white disabled:opacity-50"
          disabled={!evt.title || !evt.start_time || !evt.end_time || createEvent.isPending}
          onClick={()=>{
            const startISO = new Date(evt.start_time).toISOString();
            const endISO = new Date(evt.end_time).toISOString();
            createEvent.mutate({
              club_code: club.code,
              title: evt.title,
              description: "",
              location: evt.location,
              start_time: startISO,
              end_time: endISO,
              is_published: evt.is_published,
            }, { onSuccess: ()=> setEvt({ title:"", location:"", start_time:"", end_time:"", is_published: true }) });
          }}
        >
          {createEvent.isPending ? "Creating…" : "Create event"}
        </button>
      </section>
    </div>
  );
}
