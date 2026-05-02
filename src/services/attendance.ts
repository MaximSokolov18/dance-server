import { and, count, eq, isNull } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { attendance, subscriptions, enrollments, sessions, groups, holidays } from '../db/schema.js';
import { calcPeriodEnd } from '../lib/calcPeriodEnd.js';
import type { MarkAttendanceItem } from '../schemas/attendance.js';

export async function getAttendanceForSession(sessionId: string) {
  const db = getDb();
  return db.query.attendance.findMany({
    where: eq(attendance.sessionId, sessionId),
    with: { client: true, subscription: true },
  });
}

export async function syncPeriodEnd(db: ReturnType<typeof getDb>, subscriptionId: string) {
  const [{ absentCount }] = await db
    .select({ absentCount: count() })
    .from(attendance)
    .where(and(eq(attendance.subscriptionId, subscriptionId), eq(attendance.present, false)));

  const extension = Math.min(absentCount, 1);

  const sub = await db.query.subscriptions.findFirst({ where: eq(subscriptions.id, subscriptionId) });
  if (!sub) return;

  const group = await db.query.groups.findFirst({ where: eq(groups.id, sub.groupId) });
  if (!group) return;

  const allHolidays = await db.select({ date: holidays.date }).from(holidays);

  const newPeriodEnd = calcPeriodEnd(
    sub.periodStart,
    group.weekDays,
    sub.classesTotal,
    extension,
    allHolidays.map(h => h.date),
  );

  if (newPeriodEnd !== sub.periodEnd) {
    await db.update(subscriptions).set({ periodEnd: newPeriodEnd }).where(eq(subscriptions.id, subscriptionId));
  }
}

async function syncClassesUsed(db: ReturnType<typeof getDb>, subscriptionId: string) {
  const [{ usedCount }] = await db
    .select({ usedCount: count() })
    .from(attendance)
    .where(and(eq(attendance.subscriptionId, subscriptionId), eq(attendance.present, true)));

  const [updated] = await db
    .update(subscriptions)
    .set({ classesUsed: usedCount })
    .where(eq(subscriptions.id, subscriptionId))
    .returning();

  if (updated && updated.classesUsed >= updated.classesTotal) {
    await db
      .update(subscriptions)
      .set({ status: 'expired' })
      .where(eq(subscriptions.id, subscriptionId));
  }
}

export async function markAttendance(sessionId: string, items: MarkAttendanceItem[]) {
  const db = getDb();

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
  });
  if (!session) throw new Error('SESSION_NOT_FOUND');

  const results = [];

  for (const item of items) {
    // Enrollment guard: client must have an active enrollment in this group
    const enrollment = await db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.clientId, item.clientId),
        eq(enrollments.groupId, session.groupId),
        isNull(enrollments.leftAt),
      ),
    });
    if (!enrollment) {
      throw new Error(`CLIENT_NOT_ENROLLED:${item.clientId}`);
    }

    // Capture old subscriptionId before upsert (subscription may change)
    const existing = await db.query.attendance.findFirst({
      where: and(eq(attendance.sessionId, sessionId), eq(attendance.clientId, item.clientId)),
    });

    // Upsert attendance row
    const [row] = await db
      .insert(attendance)
      .values({
        sessionId,
        clientId: item.clientId,
        subscriptionId: item.subscriptionId,
        present: item.present,
        note: item.note ?? null,
      })
      .onConflictDoUpdate({
        target: [attendance.sessionId, attendance.clientId],
        set: {
          present: item.present,
          note: item.note ?? null,
          subscriptionId: item.subscriptionId,
        },
      })
      .returning();

    // Recount classesUsed and recompute periodEnd (idempotent, handles toggling and sub changes)
    const subIdsToSync = new Set([item.subscriptionId]);
    if (existing?.subscriptionId && existing.subscriptionId !== item.subscriptionId) {
      subIdsToSync.add(existing.subscriptionId);
    }
    for (const subId of subIdsToSync) {
      await syncClassesUsed(db, subId);
      await syncPeriodEnd(db, subId);
    }

    results.push(row);
  }

  return results;
}
