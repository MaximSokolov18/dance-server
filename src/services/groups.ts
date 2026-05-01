import { eq, isNull, sql } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { groups, enrollments } from '../db/schema.js';
import type { CreateGroup, UpdateGroup } from '../schemas/groups.js';

export async function listGroups() {
  const db = getDb();
  return db
    .select({
      id: groups.id,
      name: groups.name,
      weekDays: groups.weekDays,
      classTime: groups.classTime,
      durationMin: groups.durationMin,
      maxCapacity: groups.maxCapacity,
      enrolledCount: sql<number>`count(${enrollments.id}) filter (where ${enrollments.leftAt} is null)`,
    })
    .from(groups)
    .leftJoin(enrollments, eq(enrollments.groupId, groups.id))
    .groupBy(groups.id);
}

export async function getGroup(id: string) {
  const db = getDb();
  return db.query.groups.findFirst({
    where: eq(groups.id, id),
    with: {
      enrollments: {
        where: isNull(enrollments.leftAt),
        with: { client: true },
      },
    },
  });
}

export async function createGroup(data: CreateGroup) {
  const db = getDb();
  const [row] = await db.insert(groups).values(data).returning();
  return row;
}

export async function updateGroup(id: string, data: UpdateGroup) {
  const db = getDb();
  const [row] = await db.update(groups).set(data).where(eq(groups.id, id)).returning();
  return row ?? null;
}

export async function deleteGroup(id: string) {
  const db = getDb();
  const [row] = await db.delete(groups).where(eq(groups.id, id)).returning();
  return row ?? null;
}
