import {and, count, eq, gte, lt} from 'drizzle-orm';
import {getDb} from '../db/index.js';
import {attendance, clients, groups, holidays, sessions, subscriptions} from '../db/schema.js';
import {calcPeriodEnd} from '../lib/calcPeriodEnd.js';
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

    const [group, client, allHolidays] = await Promise.all([
        db.select().from(groups).where(eq(groups.id, data.groupId)).then(r => r[0] ?? null),
        db.select().from(clients).where(eq(clients.id, data.clientId)).then(r => r[0] ?? null),
        db.select({date: holidays.date}).from(holidays),
    ]);

    if (!group) throw Object.assign(new Error('Group not found'), {code: 'NOT_FOUND'});

    const periodEnd = calcPeriodEnd(
        data.periodStart,
        group.weekDays,
        group.classesPerPeriod,
        client?.illnesses ?? 0,
        allHolidays.map(h => h.date),
    );

    const [row] = await db
        .insert(subscriptions)
        .values({...data, classesTotal: group.classesPerPeriod, periodEnd})
        .returning();
    return row;
}

export async function updateSubscription(id: string, data: UpdateSubscription) {
    const db = getDb();

    const updateData: UpdateSubscription & { periodEnd?: string } = { ...data };

    if (data.periodStart !== undefined || data.groupId !== undefined) {
        const existing = await db.query.subscriptions.findFirst({ where: eq(subscriptions.id, id) });
        if (existing) {
            const effectivePeriodStart = data.periodStart ?? existing.periodStart;
            const effectiveGroupId = data.groupId ?? existing.groupId;
            const effectiveClientId = existing.clientId;

            const [group, client, allHolidays] = await Promise.all([
                db.select().from(groups).where(eq(groups.id, effectiveGroupId)).then(r => r[0] ?? null),
                db.select().from(clients).where(eq(clients.id, effectiveClientId)).then(r => r[0] ?? null),
                db.select({ date: holidays.date }).from(holidays),
            ]);

            if (group) {
                const periodEnd = calcPeriodEnd(
                    effectivePeriodStart,
                    group.weekDays,
                    group.classesPerPeriod,
                    client?.illnesses ?? 0,
                    allHolidays.map(h => h.date),
                );
                updateData.periodEnd = periodEnd;
            }

            // Recount classesUsed when the period window shifts
            if (data.periodStart !== undefined && data.periodStart !== existing.periodStart) {
                const [{ usedCount }] = await db
                    .select({ usedCount: count() })
                    .from(attendance)
                    .innerJoin(sessions, eq(attendance.sessionId, sessions.id))
                    .where(
                        and(
                            eq(attendance.subscriptionId, id),
                            eq(attendance.present, true),
                            gte(sessions.sessionDate, data.periodStart),
                        )
                    );
                updateData.classesUsed = usedCount;
            }
        }
    }

    const [row] = await db
        .update(subscriptions)
        .set(updateData)
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
