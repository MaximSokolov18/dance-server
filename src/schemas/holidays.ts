import { z } from 'zod';

export const createHolidaySchema = z.object({
  date: z.iso.date(),
  name: z.string().min(1),
  affectsAllGroups: z.boolean().default(true),
});

export type CreateHoliday = z.infer<typeof createHolidaySchema>;
