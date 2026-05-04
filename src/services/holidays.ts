import {eq} from 'drizzle-orm';
import {getDb} from '../db/index.js';
import {holidays, sessions, subscriptions} from '../db/schema.js';
import {syncPeriodEnd} from './attendance.js';
import type {CreateHoliday} from '../schemas/holidays.js';


export async function listHolidays() {
    const db = getDb();
    return db.select().from(holidays).orderBy(holidays.date);
}

async function recalcActiveSubscriptionPeriodEnds(db: ReturnType<typeof getDb>) {
    const [allHolidays, activeSubs] = await Promise.all([
        db.select({date: holidays.date}).from(holidays),
        db.select({id: subscriptions.id}).from(subscriptions).where(eq(subscriptions.status, 'active')),
    ]);
    const holidayDates = allHolidays.map(h => h.date);

    for (const sub of activeSubs) {
        await syncPeriodEnd(db, sub.id, holidayDates);
    }
}

export async function createHoliday(data: CreateHoliday) {
    const db = getDb();
    const [holiday] = await db.insert(holidays).values(data).returning();

    if (holiday.affectsAllGroups) {
        await db
            .update(sessions)
            .set({cancelled: true, holidayId: holiday.id})
            .where(eq(sessions.sessionDate, holiday.date));

        await recalcActiveSubscriptionPeriodEnds(db);
    }

    return holiday;
}

export async function deleteHoliday(id: string) {
    const db = getDb();

    await db
        .update(sessions)
        .set({cancelled: false, holidayId: null})
        .where(eq(sessions.holidayId, id));

    const [row] = await db.delete(holidays).where(eq(holidays.id, id)).returning();

    if (row) {
        await recalcActiveSubscriptionPeriodEnds(db);
    }

    return row ?? null;
}
