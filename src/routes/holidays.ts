import type { FastifyInstance } from 'fastify';
import { createHolidaySchema } from '../schemas/holidays.js';
import * as holidaysService from '../services/holidays.js';

const holidaySchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    date: { type: 'string', format: 'date' },
    name: { type: 'string' },
    affectsAllGroups: { type: 'boolean' },
  },
} as const;

const idParam = {
  type: 'object',
  properties: { id: { type: 'string', format: 'uuid' } },
} as const;

const errorSchema = {
  type: 'object',
  properties: { error: { type: 'string' }, code: { type: 'string' } },
} as const;

export async function holidaysRoutes(app: FastifyInstance) {
  // GET /holidays
  app.get('/', {
    schema: {
      tags: ['holidays'],
      summary: 'List all holidays',
      response: { 200: { type: 'array', items: holidaySchema } },
    },
  }, async (_req, reply) => {
    const data = await holidaysService.listHolidays();
    return reply.send(data);
  });

  // POST /holidays
  app.post('/', {
    schema: {
      tags: ['holidays'],
      summary: 'Create a holiday',
      body: {
        type: 'object',
        required: ['date', 'name'],
        properties: {
          date: { type: 'string', format: 'date' },
          name: { type: 'string', minLength: 1 },
          affectsAllGroups: { type: 'boolean', default: true },
        },
      },
      response: { 201: holidaySchema, 400: errorSchema, 409: errorSchema },
    },
  }, async (req, reply) => {
    const parsed = createHolidaySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.message, code: 'VALIDATION_ERROR' });
    }
    try {
      const data = await holidaysService.createHoliday(parsed.data);
      return reply.code(201).send(data);
    } catch (err: unknown) {
      // Unique constraint on date
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('unique') || msg.includes('duplicate')) {
        return reply.code(409).send({ error: 'Holiday already exists for this date', code: 'CONFLICT' });
      }
      throw err;
    }
  });

  // DELETE /holidays/:id
  app.delete<{ Params: { id: string } }>('/:id', {
    schema: {
      tags: ['holidays'],
      summary: 'Delete a holiday',
      params: idParam,
      response: { 200: holidaySchema, 404: errorSchema },
    },
  }, async (req, reply) => {
    const data = await holidaysService.deleteHoliday(req.params.id);
    if (!data) return reply.code(404).send({ error: 'Holiday not found', code: 'NOT_FOUND' });
    return reply.send(data);
  });
}
