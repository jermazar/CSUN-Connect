import { supabase } from './client';
export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error; return data;
}
export async function signUpWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error; return data;
}
export async function signOut() {
  const { error } = await supabase.auth.signOut(); if (error) throw error;
}
export function onAuthStateChange(callback: (event: string)=>void) {
  return supabase.auth.onAuthStateChange((event) => callback(event));
}
