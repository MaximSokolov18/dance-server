import { z } from 'zod';

export const markAttendanceItemSchema = z.object({
  clientId: z.uuid(),
  present: z.boolean(),
  subscriptionId: z.uuid(),
  note: z.string().optional(),
});

export const markAttendanceBodySchema = z.array(markAttendanceItemSchema).min(1);

export type MarkAttendanceItem = z.infer<typeof markAttendanceItemSchema>;
