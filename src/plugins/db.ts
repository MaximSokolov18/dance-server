import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { initDb } from '../db/index.js';

export default fp(async function dbPlugin(app: FastifyInstance) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL environment variable is required');
  initDb(url);
  app.log.info('Database connection initialised');
});
