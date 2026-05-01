import { z } from 'zod';

export const createEnrollmentSchema = z.object({
  clientId: z.uuid(),
  groupId: z.uuid(),
  enrolledAt: z.iso.date(),
});

export const updateEnrollmentSchema = z.object({
  leftAt: z.iso.date(),
});

export type CreateEnrollment = z.infer<typeof createEnrollmentSchema>;
export type UpdateEnrollment = z.infer<typeof updateEnrollmentSchema>;
