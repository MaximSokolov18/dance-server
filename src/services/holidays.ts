import { eq } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { holidays, sessions } from '../db/schema.js';
import type { CreateHoliday } from '../schemas/holidays.js';

export async function listHolidays() {
  const db = getDb();
  return db.select().from(holidays).orderBy(holidays.date);
}

export async function createHoliday(data: CreateHoliday) {
  const db = getDb();
  const [holiday] = await db.insert(holidays).values(data).returning();

  // Cancel any sessions on this date (for groups affected)
  if (holiday.affectsAllGroups) {
    await db
      .update(sessions)
      .set({ cancelled: true, holidayId: holiday.id })
      .where(eq(sessions.sessionDate, holiday.date));
  }

  return holiday;
}

export async function deleteHoliday(id: string) {
  const db = getDb();
  // Restore sessions that were cancelled by this holiday
  await db
    .update(sessions)
    .set({ cancelled: false, holidayId: null })
    .where(eq(sessions.holidayId, id));

  const [row] = await db.delete(holidays).where(eq(holidays.id, id)).returning();
  return row ?? null;
}
