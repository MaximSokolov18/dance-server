import { z } from 'zod';

export const generateSessionsSchema = z.object({
  groupId: z.uuid(),
  weeks: z.number().int().min(1).max(52).default(4),
});

export const updateSessionSchema = z.object({
  cancelled: z.boolean(),
});

export const listSessionsQuerySchema = z.object({
  group_id: z.uuid().optional(),
});

export type GenerateSessions = z.infer<typeof generateSessionsSchema>;
export type UpdateSession = z.infer<typeof updateSessionSchema>;
