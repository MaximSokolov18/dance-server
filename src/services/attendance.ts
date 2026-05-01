import { and, eq, isNull, sql } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { attendance, subscriptions, enrollments, sessions } from '../db/schema.js';
import type { MarkAttendanceItem } from '../schemas/attendance.js';

export async function getAttendanceForSession(sessionId: string) {
  const db = getDb();
  return db.query.attendance.findMany({
    where: eq(attendance.sessionId, sessionId),
    with: { client: true, subscription: true },
  });
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

    if (item.present) {
      // Atomic increment to avoid race conditions
      const [updated] = await db
        .update(subscriptions)
        .set({ classesUsed: sql`${subscriptions.classesUsed} + 1` })
        .where(eq(subscriptions.id, item.subscriptionId))
        .returning();

      if (updated && updated.classesUsed >= updated.classesTotal) {
        await db
          .update(subscriptions)
          .set({ status: 'expired' })
          .where(eq(subscriptions.id, item.subscriptionId));
      }
    }

    results.push(row);
  }

  return results;
}
