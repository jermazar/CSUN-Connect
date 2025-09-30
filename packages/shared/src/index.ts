import { z } from "zod";
export const EventSchema = z.object({ id: z.string(), title: z.string(), start_time: z.string() });
export type Event = z.infer<typeof EventSchema>;
export interface Notifier { registerToken(): Promise<void>; sendTest?(): Promise<void>; }
