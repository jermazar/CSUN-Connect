import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./client";

/* ---------- Types aligned to your DB ---------- */
export type Club = {
  code: string;
  name: string;
  is_active: boolean | null;
  created_at: string;
};

export type Event = {
  id: string;               // uuid
  club_code: string;        // text
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;       // ISO
  end_time: string;         // ISO
  is_published: boolean;
  capacity: number | null;
  cover_image_url: string | null;
  created_by: string | null; // uuid
  created_at: string;
  updated_at: string | null;
  publish_at: string | null;
  group_id: string | null;
};

type RSVPCounts = { going_count: number; interested_count: number } | null;

/* ---------- Clubs ---------- */
export function useClubs(search?: string) {
  return useQuery({
    queryKey: ["clubs", { search }],
    queryFn: async () => {
      let q = supabase
        .from("clubs")
        .select("code,name,is_active,created_at, v_club_member_counts(member_count)");
      if (search?.trim()) q = q.ilike("name", `%${search}%`);
      const { data, error } = await q.order("name");
      if (error) throw error;
      return data as (Club & { v_club_member_counts: { member_count: number } | null })[];
    },
  });
}

export function useClub(code: string) {
  return useQuery({
    queryKey: ["club", code],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select("code,name,is_active,created_at, v_club_member_counts(member_count)")
        .eq("code", code)
        .single();
      if (error) throw error;
      return data as Club & { v_club_member_counts: { member_count: number } | null };
    },
  });
}

export function useCreateClub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { code: string; name: string; is_active?: boolean }) => {
      // If you gate creation by auth, ensure RLS policy allows it
      const { error } = await supabase.from("clubs").insert({
        code: payload.code,
        name: payload.name,
        is_active: payload.is_active ?? true,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clubs"] }),
  });
}

export function useJoinClub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ club_code }: { club_code: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("club_members")
        .insert({ club_code, user_id: user.id, role: "member" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["club"] }),
  });
}

/* ---------- Events ---------- */
export function useClubEvents(club_code: string) {
  return useQuery({
    queryKey: ["events", { club_code }],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, v_event_attendee_counts(going_count,interested_count)")
        .eq("club_code", club_code)
        .eq("is_published", true)
        .gte("end_time", new Date().toISOString())
        .order("start_time");
      if (error) throw error;
      return data as (Event & { v_event_attendee_counts: RSVPCounts })[];
    },
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      club_code: string;
      title: string;
      description?: string;
      location?: string;
      start_time: string;  // ISO
      end_time: string;    // ISO
      is_published?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const insert = {
        ...payload,
        is_published: payload.is_published ?? true,
        created_by: user.id,
      };
      const { error } = await supabase.from("events").insert(insert);
      if (error) throw error;
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["events", { club_code: (vars as any).club_code }] }),
  });
}

export function useRsvp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ event_id, rsvp_status }: { event_id: string; rsvp_status: "going" | "interested" | "not_going" }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const upsert = { event_id, user_id: user.id, rsvp_status };
      const { error } = await supabase
        .from("event_rsvps")
        .upsert(upsert, { onConflict: "event_id,user_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}
