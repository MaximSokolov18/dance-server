import { and, eq, gte } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { sessions, holidays, groups } from '../db/schema.js';
import type { UpdateSession } from '../schemas/sessions.js';

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export async function listSessions(groupId?: string) {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const conditions = [gte(sessions.sessionDate, today)];
  if (groupId) conditions.push(eq(sessions.groupId, groupId));
  return db
    .select()
    .from(sessions)
    .where(and(...conditions))
    .orderBy(sessions.sessionDate);
}

export async function generateSessions(groupId: string, weeks: number) {
  const db = getDb();

  const group = await db.query.groups.findFirst({ where: eq(groups.id, groupId) });
  if (!group) return null;

  // Fetch all holiday dates for the window
  const startDate = new Date();
  const endDate = new Date();
  endDate.setUTCDate(endDate.getUTCDate() + weeks * 7);

  const holidayRows = await db
    .select({ date: holidays.date, id: holidays.id })
    .from(holidays)
    .where(
      and(
        gte(holidays.date, startDate.toISOString().slice(0, 10)),
        // lte not easily available — just compare string; pg date ordering is lexicographic
        eq(holidays.affectsAllGroups, true),
      ),
    );
  const holidayMap = new Map(holidayRows.map((h) => [h.date, h.id]));

  const newSessions: typeof sessions.$inferInsert[] = [];
  const cursor = new Date(startDate);
  // Work entirely in UTC to avoid DST / timezone surprises
  cursor.setUTCHours(0, 0, 0, 0);

  while (cursor <= endDate) {
    const dayName = DAY_NAMES[cursor.getUTCDay()];
    if (group.weekDays.includes(dayName)) {
      const dateStr = cursor.toISOString().slice(0, 10);
      const holidayId = holidayMap.get(dateStr);
      if (!holidayId) {
        newSessions.push({
          groupId,
          sessionDate: dateStr,
          sessionTime: group.classTime,
          cancelled: false,
          holidayId: null,
        });
      }
      // If it's a holiday we do NOT generate the session (skip it)
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  if (newSessions.length === 0) return [];

  // Insert with conflict ignore — idempotent re-generation
  return db
    .insert(sessions)
    .values(newSessions)
    .onConflictDoNothing()
    .returning();
}

export async function updateSession(id: string, data: UpdateSession) {
  const db = getDb();
  const [row] = await db
    .update(sessions)
    .set(data)
    .where(eq(sessions.id, id))
    .returning();
  return row ?? null;
}
