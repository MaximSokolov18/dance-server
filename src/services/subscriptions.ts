import {and, eq, lt, sql} from 'drizzle-orm';
import {getDb} from '../db/index.js';
import {subscriptions} from '../db/schema.js';
import type {CreateSubscription, UpdateSubscription} from '../schemas/subscriptions.js';

export async function listSubscriptions(filters: {
    clientId?: string;
    status?: 'active' | 'expired' | 'frozen';
}) {
    const db = getDb();
    const conditions = [];
    if (filters.clientId) conditions.push(eq(subscriptions.clientId, filters.clientId));
    if (filters.status) conditions.push(eq(subscriptions.status, filters.status));

    return db
        .select()
        .from(subscriptions)
        .where(conditions.length ? and(...conditions) : undefined);
}

export async function createSubscription(data: CreateSubscription) {
    const db = getDb();
    const [row] = await db.insert(subscriptions).values(data).returning();
    return row;
}

export async function updateSubscription(id: string, data: UpdateSubscription) {
    const db = getDb();
    const [row] = await db
        .update(subscriptions)
        .set(data)
        .where(eq(subscriptions.id, id))
        .returning();
    return row ?? null;
}

export async function deleteSubscription(id: string) {
    const db = getDb();
    const [row] = await db
        .delete(subscriptions)
        .where(eq(subscriptions.id, id))
        .returning();
    return row ?? null;
}

/** Called by the daily cron — expires overdue subscriptions. */
export async function expireOverdueSubscriptions() {
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10);
    return db
        .update(subscriptions)
        .set({status: 'expired'})
        .where(
            and(
                eq(subscriptions.status, 'active'),
                lt(subscriptions.periodEnd, today),
            ),
        )
        .returning();
}
