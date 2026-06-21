import * as dotenv from 'dotenv';
import { eq } from 'drizzle-orm';
import { initDb, getDb } from '../db/index.js';
import { subscriptions } from '../db/schema.js';
import { syncClassesUsed, syncPeriodEnd } from '../services/attendance.js';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
}

const dryRun = process.argv.includes('--dry-run');

initDb(connectionString);
const db = getDb();

const today = new Date().toISOString().slice(0, 10);

const expired = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.status, 'expired'));

console.log(`Found ${expired.length} expired subscriptions. ${dryRun ? '(dry-run)' : ''}`);

let reactivated = 0;
let recomputed = 0;

for (const { id } of expired) {
    // Recompute periodEnd from actual attendance absences (date-bound) and
    // classesUsed from present attendance within the new window.
    if (!dryRun) {
        await syncPeriodEnd(db, id);
        await syncClassesUsed(db, id);
    }

    const sub = await db.query.subscriptions.findFirst({ where: eq(subscriptions.id, id) });
    if (!sub) continue;

    const eligible =
        sub.status === 'expired'
        && sub.classesUsed < sub.classesTotal
        && sub.periodEnd >= today;

    if (eligible) {
        reactivated++;
        console.log(`  reactivate ${sub.id}  periodEnd=${sub.periodEnd}  used=${sub.classesUsed}/${sub.classesTotal}`);
        if (!dryRun) {
            await db
                .update(subscriptions)
                .set({ status: 'active' })
                .where(eq(subscriptions.id, id));
        }
    } else if (!dryRun) {
        recomputed++;
    }
}

console.log(`\nReactivated: ${reactivated}`);
if (!dryRun) console.log(`Recomputed (still expired): ${recomputed}`);
console.log('Done.');
process.exit(0);
