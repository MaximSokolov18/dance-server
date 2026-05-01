import type { FastifyInstance } from 'fastify';
import { createEnrollmentSchema, updateEnrollmentSchema } from '../schemas/enrollments.js';
import * as enrollmentsService from '../services/enrollments.js';

const enrollmentSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    clientId: { type: 'string', format: 'uuid' },
    groupId: { type: 'string', format: 'uuid' },
    enrolledAt: { type: 'string', format: 'date' },
    leftAt: { type: 'string', format: 'date', nullable: true },
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

export async function enrollmentsRoutes(app: FastifyInstance) {
  // POST /enrollments
  app.post('/', {
    schema: {
      tags: ['enrollments'],
      summary: 'Enroll a client in a group',
      body: {
        type: 'object',
        required: ['clientId', 'groupId', 'enrolledAt'],
        properties: {
          clientId: { type: 'string', format: 'uuid' },
          groupId: { type: 'string', format: 'uuid' },
          enrolledAt: { type: 'string', format: 'date' },
        },
      },
      response: { 201: enrollmentSchema, 400: errorSchema },
    },
  }, async (req, reply) => {
    const parsed = createEnrollmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.message, code: 'VALIDATION_ERROR' });
    }
    const data = await enrollmentsService.createEnrollment(parsed.data);
    return reply.code(201).send(data);
  });

  // PATCH /enrollments/:id — set leftAt to unenroll
  app.patch<{ Params: { id: string } }>('/:id', {
    schema: {
      tags: ['enrollments'],
      summary: 'Unenroll a client (set left date)',
      params: idParam,
      body: {
        type: 'object',
        required: ['leftAt'],
        properties: { leftAt: { type: 'string', format: 'date' } },
      },
      response: { 200: enrollmentSchema, 400: errorSchema, 404: errorSchema },
    },
  }, async (req, reply) => {
    const parsed = updateEnrollmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.message, code: 'VALIDATION_ERROR' });
    }
    const data = await enrollmentsService.updateEnrollment(req.params.id, parsed.data);
    if (!data) return reply.code(404).send({ error: 'Enrollment not found', code: 'NOT_FOUND' });
    return reply.send(data);
  });
}
