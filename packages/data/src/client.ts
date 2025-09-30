import { createClient } from "@supabase/supabase-js";
const url = (typeof process !== "undefined" && process.env.EXPO_PUBLIC_SUPABASE_URL) || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = (typeof process !== "undefined" && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) { console.warn("Supabase URL/key not set."); }
export const supabase = createClient(url as string, key as string);
