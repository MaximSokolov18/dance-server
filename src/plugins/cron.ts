import fp from 'fastify-plugin';
import cron from 'node-cron';
import type { FastifyInstance } from 'fastify';
import { expireOverdueSubscriptions } from '../services/subscriptions.js';

export default fp(async function cronPlugin(app: FastifyInstance) {
  // Run every day at 01:00 to expire overdue subscriptions
  cron.schedule('0 1 * * *', async () => {
    try {
      const expired = await expireOverdueSubscriptions();
      app.log.info({ count: expired.length }, 'Expired overdue subscriptions');
    } catch (err) {
      app.log.error(err, 'Failed to expire overdue subscriptions');
    }
  });
  app.log.info('Cron job scheduled: daily subscription expiry at 01:00');
});
