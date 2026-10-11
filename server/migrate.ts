import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { resolve } from 'node:path';
import './env';
import { connectionConfig } from './db/config';
export async function migrateDatabase() {
  if (!process.argv.includes('--apply')) throw new Error('Para aplicar migraciones revisadas utiliza --apply.');
  const pool = new Pool(connectionConfig(true));
  try { await migrate(drizzle(pool), { migrationsFolder: resolve(import.meta.dirname, '../migrations') }); }
  finally { await pool.end(); }
}
