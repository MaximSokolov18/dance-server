import * as dotenv from 'dotenv';
import { initDb, getDb } from '../db/index.js';
import { subscriptions } from '../db/schema.js';
import { syncClassesUsed } from '../services/attendance.js';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
}

initDb(connectionString);
const db = getDb();

const rows = await db.select({ id: subscriptions.id }).from(subscriptions);
console.log(`Resyncing classesUsed for ${rows.length} subscriptions…`);

for (const { id } of rows) {
    await syncClassesUsed(db, id);
}

console.log('Done.');
process.exit(0);
