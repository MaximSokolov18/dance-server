import { z } from 'zod';

const WEEK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export const createGroupSchema = z.object({
  name: z.string().min(1),
  weekDays: z.array(z.enum(WEEK_DAYS)).min(1),
  classTime: z.string().regex(/^\d{2}:\d{2}$/, 'Expected HH:MM'),
  durationMin: z.number().int().positive(),
  maxCapacity: z.number().int().positive(),
});

export const updateGroupSchema = createGroupSchema.partial();

export type CreateGroup = z.infer<typeof createGroupSchema>;
export type UpdateGroup = z.infer<typeof updateGroupSchema>;
