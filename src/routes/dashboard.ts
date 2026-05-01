import type { FastifyInstance } from 'fastify';
import * as dashboardService from '../services/dashboard.js';

export async function dashboardRoutes(app: FastifyInstance) {
  app.get('/', {
    schema: {
      tags: ['dashboard'],
      summary: 'Get dashboard stats',
    },
  }, async (_req, reply) => {
    const data = await dashboardService.getDashboard();
    return reply.send(data);
  });
}
