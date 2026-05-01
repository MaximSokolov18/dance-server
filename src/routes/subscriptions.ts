import type {FastifyInstance} from 'fastify';
import {
    createSubscriptionSchema,
    updateSubscriptionSchema,
    listSubscriptionsQuerySchema,
} from '../schemas/subscriptions.js';
import * as subscriptionsService from '../services/subscriptions.js';

const STATUS_ENUM = ['active', 'expired', 'frozen'] as const;

const subscriptionSchema = {
    type: 'object',
    properties: {
        id: {type: 'string', format: 'uuid'},
        clientId: {type: 'string', format: 'uuid'},
        groupId: {type: 'string', format: 'uuid'},
        periodStart: {type: 'string', format: 'date'},
        periodEnd: {type: 'string', format: 'date'},
        classesTotal: {type: 'integer'},
        classesUsed: {type: 'integer'},
        amountPaid: {type: 'string'},
        status: {type: 'string', enum: STATUS_ENUM},
    },
} as const;

const idParam = {
    type: 'object',
    properties: {id: {type: 'string', format: 'uuid'}},
} as const;

const errorSchema = {
    type: 'object',
    properties: {error: {type: 'string'}, code: {type: 'string'}},
} as const;

export async function subscriptionsRoutes(app: FastifyInstance) {
    // GET /subscriptions?client_id=&status=
    app.get('/', {
        schema: {
            tags: ['subscriptions'],
            summary: 'List subscriptions',
            querystring: {
                type: 'object',
                properties: {
                    client_id: {type: 'string', format: 'uuid'},
                    status: {type: 'string', enum: STATUS_ENUM},
                },
            },
            response: {200: {type: 'array', items: subscriptionSchema}, 400: errorSchema},
        },
    }, async (req, reply) => {
        const parsed = listSubscriptionsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return reply.code(400).send({error: parsed.error.message, code: 'VALIDATION_ERROR'});
        }
        const data = await subscriptionsService.listSubscriptions({
            clientId: parsed.data.client_id,
            status: parsed.data.status,
        });
        return reply.send(data);
    });

    // POST /subscriptions
    app.post('/', {
        schema: {
            tags: ['subscriptions'],
            summary: 'Create a subscription',
            body: {
                type: 'object',
                required: ['clientId', 'groupId', 'periodStart', 'periodEnd', 'classesTotal', 'amountPaid'],
                properties: {
                    clientId: {type: 'string', format: 'uuid'},
                    groupId: {type: 'string', format: 'uuid'},
                    periodStart: {type: 'string', format: 'date'},
                    periodEnd: {type: 'string', format: 'date'},
                    classesTotal: {type: 'integer', minimum: 1},
                    amountPaid: {type: 'string', pattern: '^\\d+(\\.\\d{1,2})?$'},
                },
            },
            response: {201: subscriptionSchema, 400: errorSchema},
        },
    }, async (req, reply) => {
        const parsed = createSubscriptionSchema.safeParse(req.body);
        if (!parsed.success) {
            return reply.code(400).send({error: parsed.error.message, code: 'VALIDATION_ERROR'});
        }
        const data = await subscriptionsService.createSubscription(parsed.data);
        return reply.code(201).send(data);
    });

    // PATCH /subscriptions/:id
    app.patch<{Params: {id: string;};}>('/:id', {
        schema: {
            tags: ['subscriptions'],
            summary: 'Update a subscription',
            params: idParam,
            body: {
                type: 'object',
                properties: {
                    status: {type: 'string', enum: STATUS_ENUM},
                    classesUsed: {type: 'integer', minimum: 0},
                    periodEnd: {type: 'string', format: 'date'},
                },
            },
            response: {200: subscriptionSchema, 400: errorSchema, 404: errorSchema},
        },
    }, async (req, reply) => {
        const parsed = updateSubscriptionSchema.safeParse(req.body);
        if (!parsed.success) {
            return reply.code(400).send({error: parsed.error.message, code: 'VALIDATION_ERROR'});
        }
        const data = await subscriptionsService.updateSubscription(req.params.id, parsed.data);
        if (!data) {
            return reply.code(404).send({error: 'Subscription not found', code: 'NOT_FOUND'});
        }
        return reply.send(data);
    });

    // DELETE /subscriptions/:id
    app.delete<{Params: {id: string;};}>('/:id', {
        schema: {
            tags: ['subscriptions'],
            summary: 'Delete a subscription',
            params: idParam,
            response: {204: {type: 'null'}, 404: errorSchema},
        },
    }, async (req, reply) => {
        const data = await subscriptionsService.deleteSubscription(req.params.id);
        if (!data) {
            return reply.code(404).send({error: 'Subscription not found', code: 'NOT_FOUND'});
        }
        return reply.code(204).send();
    });
}
