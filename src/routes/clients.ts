import type { FastifyInstance } from 'fastify';
import { createClientSchema, updateClientSchema } from '../schemas/clients.js';
import * as clientsService from '../services/clients.js';

const clientSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    telegram: { type: 'string', nullable: true },
    illnesses: { type: 'integer', nullable: true },
    active: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
  },
} as const;

const clientBodyProps = {
  name: { type: 'string', minLength: 1 },
  telegram: { type: 'string' },
  illnesses: { type: 'integer', minimum: 0 },
  active: { type: 'boolean' },
} as const;

const idParam = {
  type: 'object',
  properties: { id: { type: 'string', format: 'uuid' } },
} as const;

const errorSchema = {
  type: 'object',
  properties: { error: { type: 'string' }, code: { type: 'string' } },
} as const;

export async function clientsRoutes(app: FastifyInstance) {
  // GET /clients
  app.get('/', {
    schema: {
      tags: ['clients'],
      summary: 'List all clients',
      response: { 200: { type: 'array', items: clientSchema } },
    },
  }, async (_req, reply) => {
    const data = await clientsService.listClients();
    return reply.send(data);
  });

  // GET /clients/:id
  app.get<{ Params: { id: string } }>('/:id', {
    schema: {
      tags: ['clients'],
      summary: 'Get a client by ID',
      params: idParam,
      response: { 200: clientSchema, 404: errorSchema },
    },
  }, async (req, reply) => {
    const data = await clientsService.getClient(req.params.id);
    if (!data) return reply.code(404).send({ error: 'Client not found', code: 'NOT_FOUND' });
    return reply.send(data);
  });

  // POST /clients
  app.post('/', {
    schema: {
      tags: ['clients'],
      summary: 'Create a client',
      body: {
        type: 'object',
        required: ['name'],
        properties: clientBodyProps,
      },
      response: { 201: clientSchema, 400: errorSchema },
    },
  }, async (req, reply) => {
    const parsed = createClientSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.message, code: 'VALIDATION_ERROR' });
    }
    const data = await clientsService.createClient(parsed.data);
    return reply.code(201).send(data);
  });

  // PATCH /clients/:id
  app.patch<{ Params: { id: string } }>('/:id', {
    schema: {
      tags: ['clients'],
      summary: 'Update a client',
      params: idParam,
      body: {
        type: 'object',
        properties: clientBodyProps,
      },
      response: { 200: clientSchema, 400: errorSchema, 404: errorSchema },
    },
  }, async (req, reply) => {
    const parsed = updateClientSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.message, code: 'VALIDATION_ERROR' });
    }
    const data = await clientsService.updateClient(req.params.id, parsed.data);
    if (!data) return reply.code(404).send({ error: 'Client not found', code: 'NOT_FOUND' });
    return reply.send(data);
  });

  // DELETE /clients/:id  — soft delete
  app.delete<{ Params: { id: string } }>('/:id', {
    schema: {
      tags: ['clients'],
      summary: 'Delete a client',
      params: idParam,
      response: { 200: clientSchema, 404: errorSchema },
    },
  }, async (req, reply) => {
    const data = await clientsService.deleteClient(req.params.id);
    if (!data) return reply.code(404).send({ error: 'Client not found', code: 'NOT_FOUND' });
    return reply.send(data);
  });
}
