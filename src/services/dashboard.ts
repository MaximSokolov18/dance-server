import { and, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { clients, sessions, subscriptions } from '../db/schema.js';

export async function getDashboard() {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  const [
    activeClients,
    upcomingSessions,
    expiringSubscriptions,
    noSubscriptionClients,
  ] = await Promise.all([
    // Total active clients
    db
      .select({ count: sql<number>`count(*)` })
      .from(clients)
      .where(eq(clients.active, true))
      .then((r) => Number(r[0]?.count ?? 0)),

    // Upcoming sessions this week
    db
      .select()
      .from(sessions)
      .where(
        and(
          gte(sessions.sessionDate, today),
          lte(sessions.sessionDate, weekEndStr),
          eq(sessions.cancelled, false),
        ),
      )
      .orderBy(sessions.sessionDate),

    // Clients with classes_used >= classes_total - 1 (expiring soon)
    db
      .select({ subscription: subscriptions, client: clients })
      .from(subscriptions)
      .innerJoin(clients, eq(clients.id, subscriptions.clientId))
      .where(
        and(
          eq(subscriptions.status, 'active'),
          sql`${subscriptions.classesUsed} >= ${subscriptions.classesTotal} - 1`,
        ),
      ),

    // Clients with no active subscription
    db
      .select()
      .from(clients)
      .where(
        and(
          eq(clients.active, true),
          sql`not exists (
            select 1 from subscriptions s
            where s.client_id = ${clients.id}
              and s.status = 'active'
          )`,
        ),
      ),
  ]);

  return {
    totalActiveClients: activeClients,
    upcomingSessions,
    expiringSubscriptions,
    clientsWithNoActiveSubscription: noSubscriptionClients,
  };
}
