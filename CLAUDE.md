# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start with tsx watch (hot reload)
npm run build        # tsc compile to dist/
npm run start        # run compiled output

npm run db:generate  # drizzle-kit generate migrations
npm run db:migrate   # apply migrations (tsx src/db/migrate.ts)
npm run db:studio    # open Drizzle Studio

npm test             # vitest run (no watch)
```

Run a single test file:
```bash
npx vitest run src/path/to/file.test.ts
```

## Environment

Copy `.env.example` to `.env`. Required variables:
- `DATABASE_URL` — Supabase PostgreSQL connection string
- `ELECTRIC_URL` — ElectricSQL service URL (default `http://localhost:5133`)
- `PORT`, `HOST`, `NODE_ENV`, `CORS_ORIGIN` — optional

## Architecture

**Fastify + Drizzle ORM** REST API for a dance studio management system (clients, groups, subscriptions, sessions, attendance).

### Layer structure

Each domain follows a strict three-layer pattern:

| Layer | Path | Responsibility |
|---|---|---|
| Schemas | `src/schemas/<domain>.ts` | Zod validation schemas + inferred TypeScript types |
| Services | `src/services/<domain>.ts` | All database access via Drizzle; pure functions |
| Routes | `src/routes/<domain>.ts` | Fastify route handlers; validate input with Zod, call service, return response |

Routes are registered in `src/app.ts` with prefixes (e.g. `/clients`, `/groups`).

### Database

`src/db/schema.ts` — single source of truth for all table definitions and Drizzle relations. Migrations live in `drizzle/`. The DB is initialized once via `initDb()` in `src/plugins/db.ts` and accessed everywhere via `getDb()`.

The database is Supabase (PostgreSQL) with RLS enabled. Migration `0002_rls_policies.sql` adds permissive `backend_all` policies so the server role has full access.

### Domain model

- **clients** — dance students (soft-deleted via `active: false`)
- **groups** — recurring classes with `weekDays[]`, `classTime`, `maxCapacity`
- **enrollments** — client ↔ group membership with start/end dates
- **subscriptions** — abonements: bounded by `periodStart`/`periodEnd` and `classesTotal`/`classesUsed`; status: `active | expired | frozen`
- **sessions** — concrete class occurrences generated from a group's schedule; can be cancelled or linked to a holiday
- **attendance** — per-session presence records; marking attendance atomically increments `classesUsed` on the subscription and auto-expires it when exhausted
- **holidays** — dates that block session generation

### Key behaviours

- `generateSessions` (`src/services/sessions.ts`) is idempotent — uses `onConflictDoNothing()` and skips holidays.
- `markAttendance` (`src/services/attendance.ts`) validates enrollment, upserts the attendance row, and atomically increments the subscription counter.
- Cron job (`src/plugins/cron.ts`) runs daily at 01:00 to expire overdue subscriptions.
- `/electric/*` proxy forwards shape requests to ElectricSQL for offline PWA sync.
- Swagger UI available at `/docs` in development.

### Conventions

- All imports use `.js` extensions (ESM project).
- Services never throw HTTP errors — they return `null` or throw domain-level error strings (e.g. `'SESSION_NOT_FOUND'`). Routes map these to HTTP status codes.
- Routes define inline JSON Schema for Swagger in addition to Zod validation; both must be kept in sync when adding fields.
