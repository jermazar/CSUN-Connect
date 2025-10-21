import { supabase } from "./client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PostSchema, Post } from "@campus/shared";

/** Create a new post (campus if groupId is null) */
export async function createPost(body: string, groupId: string | null = null) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("posts")
    .insert({ author_id: user.id, body, group_id: groupId })
    .select("id, author_id, body, created_at, is_hidden, group_id")
    .single();
  if (error) throw error;
  return PostSchema.parse(data);
}

/** Fetch latest campus posts (group_id IS NULL) */
async function fetchCampusPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("id, author_id, body, created_at, is_hidden, group_id")
    .is("group_id", null)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((p) => PostSchema.parse(p));
}

/** Fetch latest posts for a group */
async function fetchGroupPosts(groupId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("id, author_id, body, created_at, is_hidden, group_id")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((p) => PostSchema.parse(p));
}

/** React Query hook: campus feed */
export function useCampusFeed() {
  return useQuery({
    queryKey: ["posts", "campus"],
    queryFn: fetchCampusPosts,
  });
}

/** React Query hook: group feed */
export function useGroupFeed(groupId: string) {
  return useQuery({
    queryKey: ["posts", "group", groupId],
    queryFn: () => fetchGroupPosts(groupId),
    enabled: !!groupId,
  });
}

/** Attach realtime inserts to a given cache key (campus or group) */
export function subscribePostsInserts(
  { groupId, onInsert }:
  { groupId?: string | null; onInsert?: (p: Post) => void }
): () => void {                                  //  ← add explicit return type
  const channel = supabase
    .channel(`realtime:posts:${groupId ?? "campus"}`) // (optional) unique channel name
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, (payload) => {
      const p = PostSchema.parse(payload.new);
      const isCampus = p.group_id == null;
      if ((groupId == null && isCampus) || (groupId && p.group_id === groupId)) {
        onInsert?.(p);
      }
    })
    .subscribe();                                  // do NOT await

  return () => supabase.removeChannel(channel);    // sync cleanup
}

/** Helper to push inserts into React Query cache */
export function wireRealtimeToQueryCache(
  qc: ReturnType<typeof useQueryClient>,
  key: any[],
  groupId?: string | null
): () => void {                                     //  ← add explicit return type
  return subscribePostsInserts({
    groupId,
    onInsert: (p) => {
      qc.setQueryData<Post[]>(key, (prev) => (prev ? [p, ...prev] : [p]));
    },
  });
}
