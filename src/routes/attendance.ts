import type { FastifyInstance } from 'fastify';
import { markAttendanceBodySchema } from '../schemas/attendance.js';
import * as attendanceService from '../services/attendance.js';

const attendanceItemSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    sessionId: { type: 'string', format: 'uuid' },
    clientId: { type: 'string', format: 'uuid' },
    subscriptionId: { type: 'string', format: 'uuid' },
    present: { type: 'boolean' },
    note: { type: 'string', nullable: true },
  },
} as const;

const sessionIdParam = {
  type: 'object',
  properties: { session_id: { type: 'string', format: 'uuid' } },
} as const;

export async function attendanceRoutes(app: FastifyInstance) {
  // GET /attendance/:session_id
  app.get<{ Params: { session_id: string } }>('/:session_id', {
    schema: {
      tags: ['attendance'],
      summary: 'Get attendance for a session',
      params: sessionIdParam,
      response: { 200: { type: 'array', items: attendanceItemSchema } },
    },
  }, async (req, reply) => {
    const data = await attendanceService.getAttendanceForSession(req.params.session_id);
    return reply.send(data);
  });

  // POST /attendance/:session_id/mark
  app.post<{ Params: { session_id: string } }>('/:session_id/mark', {
    schema: {
      tags: ['attendance'],
      summary: 'Mark attendance for a session',
      params: sessionIdParam,
      body: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['clientId', 'present', 'subscriptionId'],
          properties: {
            clientId: { type: 'string', format: 'uuid' },
            present: { type: 'boolean' },
            subscriptionId: { type: 'string', format: 'uuid' },
            note: { type: 'string' },
          },
        },
      },
      response: { 200: { type: 'array', items: attendanceItemSchema } },
    },
  }, async (req, reply) => {
    const parsed = markAttendanceBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.message, code: 'VALIDATION_ERROR' });
    }
    try {
      const data = await attendanceService.markAttendance(req.params.session_id, parsed.data);
      return reply.send(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message === 'SESSION_NOT_FOUND') {
        return reply.code(404).send({ error: 'Session not found', code: 'NOT_FOUND' });
      }
      if (message.startsWith('CLIENT_NOT_ENROLLED:')) {
        const clientId = message.split(':')[1];
        return reply.code(422).send({
          error: `Client ${clientId} is not enrolled in this group`,
          code: 'CLIENT_NOT_ENROLLED',
        });
      }
      throw err;
    }
  });
}
