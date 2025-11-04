import { supabase } from "./client";
import { useQuery } from "@tanstack/react-query";

export type PostRow = {
  id: string;
  body: string;
  created_at: string;
  major: string | null;
  author: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

async function fetchMyMajor(): Promise<string | null> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("major")
    .eq("id", user.id)
    .maybeSingle();
  return (data?.major as string) ?? null;
}

async function fetchPostsCampus(): Promise<PostRow[]> {
  const { data, error } = await supabase
    .from("posts")
    .select(`
      id, body, created_at, major,
      author:profiles!posts_author_fk ( id, full_name, avatar_url )
    `)
    .is("major", null)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as unknown as PostRow[];
}

async function fetchPostsMyMajor(): Promise<PostRow[]> {
  const myMajor = await fetchMyMajor();
  if (!myMajor) return [];
  const { data, error } = await supabase
    .from("posts")
    .select(`
      id, body, created_at, major,
      author:profiles!posts_author_fk ( id, full_name, avatar_url )
    `)
    .eq("major", myMajor)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as unknown as PostRow[];
}

export function useCampusPosts() {
  return useQuery({ queryKey: ["posts", "campus"], queryFn: fetchPostsCampus });
}

export function useMyMajorPosts() {
  return useQuery({ queryKey: ["posts", "my-major"], queryFn: fetchPostsMyMajor });
}

export async function createPost(body: string, scope: "campus" | "major") {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("Not signed in");
  let major: string | null = null;
  if (scope === "major") {
    const m = await fetchMyMajor();
    if (!m) throw new Error("Set your major on the Account page first.");
    major = m;
  }
  const { error } = await supabase
    .from("posts")
    .insert({ author_id: user.id, body, major });
  if (error) throw error;
}
