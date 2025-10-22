import { z } from "zod";
export const EventSchema = z.object({ id: z.string(), title: z.string(), start_time: z.string() });
export type Event = z.infer<typeof EventSchema>;
export interface Notifier { registerToken(): Promise<void>; sendTest?(): Promise<void>; }
export const PostSchema = z.object({
  id: z.string(),
  author_id: z.string(),
  body: z.string(),
  created_at: z.string(),
  is_hidden: z.boolean().nullable().optional(),
  group_id: z.string().nullable().optional(),
});
export type Post = z.infer<typeof PostSchema>;