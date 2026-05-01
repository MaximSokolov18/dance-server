import 'dotenv/config';
import Fastify, { type FastifyError } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import dbPlugin from './plugins/db.js';
import cronPlugin from './plugins/cron.js';

import { clientsRoutes } from './routes/clients.js';
import { groupsRoutes } from './routes/groups.js';
import { enrollmentsRoutes } from './routes/enrollments.js';
import { subscriptionsRoutes } from './routes/subscriptions.js';
import { sessionsRoutes } from './routes/sessions.js';
import { attendanceRoutes } from './routes/attendance.js';
import { holidaysRoutes } from './routes/holidays.js';
import { dashboardRoutes } from './routes/dashboard.js';

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport:
      process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
});

// ── OpenAPI / Swagger ─────────────────────────────────────────────────────────
await app.register(swagger, {
  openapi: {
    info: { title: 'Dance Server API', version: '1.0.0', description: 'Dance class abonement management API' },
    tags: [
      { name: 'clients', description: 'Client management' },
      { name: 'groups', description: 'Dance groups' },
      { name: 'enrollments', description: 'Client ↔ group enrollments' },
      { name: 'subscriptions', description: 'Abonements / subscriptions' },
      { name: 'sessions', description: 'Class sessions' },
      { name: 'attendance', description: 'Attendance tracking' },
      { name: 'holidays', description: 'Holidays' },
      { name: 'dashboard', description: 'Stats overview' },
    ],
  },
});

await app.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: { docExpansion: 'list', deepLinking: true },
});

// ── Security headers ──────────────────────────────────────────────────────────
await app.register(helmet, { contentSecurityPolicy: false });

// ── CORS (adjust origin in production) ───────────────────────────────────────
await app.register(cors, {
  origin: process.env.CORS_ORIGIN
    ? [process.env.CORS_ORIGIN, /^http:\/\/192\.168\.100\.244(:\d+)?$/]
    : [/^http:\/\/192\.168\.100\.244(:\d+)?$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/],
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});

// ── Plugins ───────────────────────────────────────────────────────────────────
await app.register(dbPlugin);
await app.register(cronPlugin);

// ── Routes ────────────────────────────────────────────────────────────────────
await app.register(clientsRoutes, { prefix: '/clients' });
await app.register(groupsRoutes, { prefix: '/groups' });
await app.register(enrollmentsRoutes, { prefix: '/enrollments' });
await app.register(subscriptionsRoutes, { prefix: '/subscriptions' });
await app.register(sessionsRoutes, { prefix: '/sessions' });
await app.register(attendanceRoutes, { prefix: '/attendance' });
await app.register(holidaysRoutes, { prefix: '/holidays' });
await app.register(dashboardRoutes, { prefix: '/dashboard' });

// ── ElectricSQL proxy — forward shape requests to Electric service ─────────────
// The PWA hits /electric/v1/shape to get offline sync shapes.
// We proxy to the Electric service so the auth cookie can be forwarded.
app.get('/electric/*', async (req, reply) => {
  const electricUrl = process.env.ELECTRIC_URL ?? 'http://localhost:5133';
  const path = (req.params as Record<string, string>)['*'];
  const qs = new URLSearchParams(req.query as Record<string, string>).toString();
  const target = `${electricUrl}/${path}${qs ? '?' + qs : ''}`;

  const upstream = await fetch(target, {
    method: req.method,
    headers: { 'content-type': 'application/json' },
  });

  const body = await upstream.text();
  return reply
    .code(upstream.status)
    .headers(Object.fromEntries(upstream.headers.entries()))
    .send(body);
});

// ── Global error handler ──────────────────────────────────────────────────────
app.setErrorHandler((err: FastifyError, _req, reply) => {
  app.log.error(err);
  const status = err.statusCode ?? 500;
  return reply.code(status).send({
    error: status === 500 ? 'Internal server error' : err.message,
    code: err.code ?? 'INTERNAL_ERROR',
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

try {
  await app.listen({ port, host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
