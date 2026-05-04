import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

const { Pool } = pg;

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!_db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return _db;
}

export function initDb(connectionString: string) {
  const ssl = process.env.NODE_ENV === 'production' ? true : { rejectUnauthorized: false };
  const pool = new Pool({ connectionString, ssl });
  _db = drizzle(pool, { schema });
  return _db;
}
