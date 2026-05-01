import type { FastifyInstance } from 'fastify';
import {
  generateSessionsSchema,
  updateSessionSchema,
  listSessionsQuerySchema,
} from '../schemas/sessions.js';
import * as sessionsService from '../services/sessions.js';

const sessionSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    groupId: { type: 'string', format: 'uuid' },
    sessionDate: { type: 'string', format: 'date' },
    sessionTime: { type: 'string' },
    cancelled: { type: 'boolean' },
    holidayId: { type: 'string', format: 'uuid', nullable: true },
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

export async function sessionsRoutes(app: FastifyInstance) {
  // GET /sessions?group_id=
  app.get('/', {
    schema: {
      tags: ['sessions'],
      summary: 'List sessions',
      querystring: {
        type: 'object',
        properties: { group_id: { type: 'string', format: 'uuid' } },
      },
      response: { 200: { type: 'array', items: sessionSchema }, 400: errorSchema },
    },
  }, async (req, reply) => {
    const parsed = listSessionsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.message, code: 'VALIDATION_ERROR' });
    }
    const data = await sessionsService.listSessions(parsed.data.group_id);
    return reply.send(data);
  });

  // POST /sessions/generate
  app.post('/generate', {
    schema: {
      tags: ['sessions'],
      summary: 'Generate sessions for a group',
      body: {
        type: 'object',
        required: ['groupId'],
        properties: {
          groupId: { type: 'string', format: 'uuid' },
          weeks: { type: 'integer', minimum: 1, maximum: 52, default: 4 },
        },
      },
      response: { 201: { type: 'array', items: sessionSchema }, 400: errorSchema, 404: errorSchema },
    },
  }, async (req, reply) => {
    const parsed = generateSessionsSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.message, code: 'VALIDATION_ERROR' });
    }
    const data = await sessionsService.generateSessions(parsed.data.groupId, parsed.data.weeks);
    if (!data) {
      return reply.code(404).send({ error: 'Group not found', code: 'NOT_FOUND' });
    }
    return reply.code(201).send(data);
  });

  // PATCH /sessions/:id
  app.patch<{ Params: { id: string } }>('/:id', {
    schema: {
      tags: ['sessions'],
      summary: 'Cancel or uncancel a session',
      params: idParam,
      body: {
        type: 'object',
        required: ['cancelled'],
        properties: { cancelled: { type: 'boolean' } },
      },
      response: { 200: sessionSchema, 400: errorSchema, 404: errorSchema },
    },
  }, async (req, reply) => {
    const parsed = updateSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.message, code: 'VALIDATION_ERROR' });
    }
    const data = await sessionsService.updateSession(req.params.id, parsed.data);
    if (!data) return reply.code(404).send({ error: 'Session not found', code: 'NOT_FOUND' });
    return reply.send(data);
  });
}
