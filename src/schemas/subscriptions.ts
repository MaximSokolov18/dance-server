import { z } from 'zod';

export const createSubscriptionSchema = z.object({
  clientId: z.uuid(),
  groupId: z.uuid(),
  periodStart: z.iso.date(),
  periodEnd: z.iso.date(),
  classesTotal: z.number().int().positive(),
  amountPaid: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Expected decimal number'),
});

export const updateSubscriptionSchema = z.object({
  status: z.enum(['active', 'expired', 'frozen']).optional(),
  classesUsed: z.number().int().min(0).optional(),
  periodEnd: z.iso.date().optional(),
});

export const listSubscriptionsQuerySchema = z.object({
  client_id: z.uuid().optional(),
  status: z.enum(['active', 'expired', 'frozen']).optional(),
});

export type CreateSubscription = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscription = z.infer<typeof updateSubscriptionSchema>;
