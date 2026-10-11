import './env';
import { Pool } from 'pg';
import { connectionConfig } from './db/config';

async function main() {
  for (const direct of [false, true]) {
    const pool = new Pool(connectionConfig(direct));
    try {
      const client = await pool.connect();
      try {
        await client.query('BEGIN READ ONLY');
        const result = await client.query("SELECT current_setting('server_version') AS version, current_setting('TimeZone') AS timezone, (SELECT count(*)::int FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') AS tables");
        const journal = await client.query("SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS exists");
        console.log(`${direct ? 'Directa' : 'Aplicación'}: PostgreSQL ${result.rows[0].version}; zona ${result.rows[0].timezone}; tablas públicas ${result.rows[0].tables}; registro de migraciones ${journal.rows[0].exists ? 'presente' : 'pendiente'}.`);
        await client.query('ROLLBACK');
      } finally { client.release(); }
    } finally { await pool.end(); }
  }
}
main().catch(() => { console.error('Comprobación cancelada. Revisa las conexiones en .env, TLS y disponibilidad de Neon. No se modificaron datos.'); process.exitCode = 1; });
