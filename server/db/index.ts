import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { getEnv } from '../env';
import { connectionConfig } from './config';
export function createDatabase() {
  getEnv();
  const pool = new Pool(connectionConfig());
  pool.on('error', () => { console.error('Conexión PostgreSQL interrumpida.'); });
  return drizzle(pool, { schema });
}
export type Database = ReturnType<typeof createDatabase>;
