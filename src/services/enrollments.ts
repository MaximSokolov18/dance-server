import { eq } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { enrollments } from '../db/schema.js';
import type { CreateEnrollment, UpdateEnrollment } from '../schemas/enrollments.js';

export async function createEnrollment(data: CreateEnrollment) {
  const db = getDb();
  const [row] = await db.insert(enrollments).values(data).returning();
  return row;
}

export async function updateEnrollment(id: string, data: UpdateEnrollment) {
  const db = getDb();
  const [row] = await db
    .update(enrollments)
    .set(data)
    .where(eq(enrollments.id, id))
    .returning();
  return row ?? null;
}
