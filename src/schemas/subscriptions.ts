import { z } from 'zod';

const paymentMethodSchema = z.enum(['card', 'cash', 'ua_card']).nullable().optional();

export const createSubscriptionSchema = z.object({
    clientId: z.uuid(),
    groupId: z.uuid(),
    periodStart: z.iso.date(),
    amountPaid: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Expected decimal number'),
    paymentMethod: paymentMethodSchema,
});

export const updateSubscriptionSchema = z.object({
    clientId: z.uuid().optional(),
    groupId: z.uuid().optional(),
    periodStart: z.iso.date().optional(),
    amountPaid: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Expected decimal number').optional(),
    status: z.enum(['active', 'expired', 'frozen']).optional(),
    classesUsed: z.number().int().min(0).optional(),
    periodEnd: z.iso.date().optional(),
    paymentMethod: paymentMethodSchema,
});

export const listSubscriptionsQuerySchema = z.object({
    client_id: z.uuid().optional(),
    status: z.enum(['active', 'expired', 'frozen']).optional(),
});

export type CreateSubscription = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscription = z.infer<typeof updateSubscriptionSchema>;
