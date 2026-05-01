import type { FastifyInstance } from 'fastify';
import { createGroupSchema, updateGroupSchema } from '../schemas/groups.js';
import * as groupsService from '../services/groups.js';

const WEEK_DAYS_ENUM = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

const groupSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    weekDays: { type: 'array', items: { type: 'string', enum: WEEK_DAYS_ENUM } },
    classTime: { type: 'string' },
    durationMin: { type: 'integer' },
    maxCapacity: { type: 'integer' },
    classesPerPeriod: { type: 'integer' },
  },
} as const;

const groupBodyProps = {
  name: { type: 'string', minLength: 1 },
  weekDays: { type: 'array', items: { type: 'string', enum: WEEK_DAYS_ENUM }, minItems: 1 },
  classTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
  durationMin: { type: 'integer', minimum: 1 },
  maxCapacity: { type: 'integer', minimum: 1 },
  classesPerPeriod: { type: 'integer', minimum: 1 },
} as const;

const idParam = {
  type: 'object',
  properties: { id: { type: 'string', format: 'uuid' } },
} as const;

const errorSchema = {
  type: 'object',
  properties: { error: { type: 'string' }, code: { type: 'string' } },
} as const;

export async function groupsRoutes(app: FastifyInstance) {
  // GET /groups
  app.get('/', {
    schema: {
      tags: ['groups'],
      summary: 'List all groups',
      response: { 200: { type: 'array', items: groupSchema } },
    },
  }, async (_req, reply) => {
    const data = await groupsService.listGroups();
    return reply.send(data);
  });

  // GET /groups/:id
  app.get<{ Params: { id: string } }>('/:id', {
    schema: {
      tags: ['groups'],
      summary: 'Get a group by ID',
      params: idParam,
      response: { 200: groupSchema, 404: errorSchema },
    },
  }, async (req, reply) => {
    const data = await groupsService.getGroup(req.params.id);
    if (!data) return reply.code(404).send({ error: 'Group not found', code: 'NOT_FOUND' });
    return reply.send(data);
  });

  // POST /groups
  app.post('/', {
    schema: {
      tags: ['groups'],
      summary: 'Create a group',
      body: {
        type: 'object',
        required: ['name', 'weekDays', 'classTime', 'durationMin', 'maxCapacity', 'classesPerPeriod'],
        properties: groupBodyProps,
      },
      response: { 201: groupSchema, 400: errorSchema },
    },
  }, async (req, reply) => {
    const parsed = createGroupSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.message, code: 'VALIDATION_ERROR' });
    }
    const data = await groupsService.createGroup(parsed.data);
    return reply.code(201).send(data);
  });

  // PATCH /groups/:id
  app.patch<{ Params: { id: string } }>('/:id', {
    schema: {
      tags: ['groups'],
      summary: 'Update a group',
      params: idParam,
      body: {
        type: 'object',
        properties: groupBodyProps,
      },
      response: { 200: groupSchema, 400: errorSchema, 404: errorSchema },
    },
  }, async (req, reply) => {
    const parsed = updateGroupSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.message, code: 'VALIDATION_ERROR' });
    }
    const data = await groupsService.updateGroup(req.params.id, parsed.data);
    if (!data) return reply.code(404).send({ error: 'Group not found', code: 'NOT_FOUND' });
    return reply.send(data);
  });

  // DELETE /groups/:id
  app.delete<{ Params: { id: string } }>('/:id', {
    schema: {
      tags: ['groups'],
      summary: 'Delete a group',
      params: idParam,
      response: { 200: groupSchema, 404: errorSchema },
    },
  }, async (req, reply) => {
    const data = await groupsService.deleteGroup(req.params.id);
    if (!data) return reply.code(404).send({ error: 'Group not found', code: 'NOT_FOUND' });
    return reply.send(data);
  });
}
