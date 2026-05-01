import { eq } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { clients } from '../db/schema.js';
import type { CreateClient, UpdateClient } from '../schemas/clients.js';

export async function listClients() {
  const db = getDb();
  return db.select().from(clients).where(eq(clients.active, true));
}

export async function getClient(id: string) {
  const db = getDb();
  const rows = await db.query.clients.findFirst({
    where: eq(clients.id, id),
    with: {
      subscriptions: {
        where: (sub, { eq: eqFn }) => eqFn(sub.status, 'active'),
        limit: 1,
      },
    },
  });
  return rows ?? null;
}

export async function createClient(data: CreateClient) {
  const db = getDb();
  const [row] = await db.insert(clients).values(data).returning();
  return row;
}

export async function updateClient(id: string, data: UpdateClient) {
  const db = getDb();
  const [row] = await db.update(clients).set(data).where(eq(clients.id, id)).returning();
  return row ?? null;
}

export async function deleteClient(id: string) {
  const db = getDb();
  const [row] = await db
    .update(clients)
    .set({ active: false })
    .where(eq(clients.id, id))
    .returning();
  return row ?? null;
}
