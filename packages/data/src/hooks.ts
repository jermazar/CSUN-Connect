import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";
import { EventSchema } from "@campus/shared";

export function useUpcomingEvents() {
  return useQuery({
    queryKey: ["events", "upcoming"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, start_time")
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((e) => EventSchema.parse(e));
    },
  });
}
