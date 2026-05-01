import { z } from 'zod';

export const createClientSchema = z.object({
  name: z.string().min(1),
  telegram: z.string().optional(),
  illnesses: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

export const updateClientSchema = createClientSchema.partial();

export type CreateClient = z.infer<typeof createClientSchema>;
export type UpdateClient = z.infer<typeof updateClientSchema>;
