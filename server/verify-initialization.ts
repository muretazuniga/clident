import './env';
import { Pool } from 'pg';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { connectionConfig } from './db/config';
import * as schema from './db/schema';
import { getTableName, is, Table } from 'drizzle-orm';

async function main() {
  const after = process.argv.includes('--after');
  const folder = resolve(import.meta.dirname, '../migrations');
  const journal = JSON.parse(readFileSync(resolve(folder, 'meta/_journal.json'), 'utf8'));
  if (journal.entries.length !== 1) throw new Error('Se requiere revisar nuevamente el conjunto de migraciones.');
  const entry = journal.entries[0];
  const sql = readFileSync(resolve(folder, `${entry.tag}.sql`), 'utf8');
  const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);
  if (statements.some(s => !/^(CREATE TABLE|CREATE (UNIQUE )?INDEX|ALTER TABLE "\w+" ADD CONSTRAINT)\s/i.test(s))) throw new Error('SQL fuera de la migración inicial revisada.');
  const expected = Object.values(schema).filter(value => is(value, Table)).map(value => getTableName(value as Table)).sort();
  const defined = [...sql.matchAll(/CREATE TABLE "([^"]+)"/g)].map(match => match[1]).sort();
  if (expected.length !== 11 || JSON.stringify(expected) !== JSON.stringify(defined)) throw new Error('El SQL no coincide con las once tablas del esquema.');
  const runtime = connectionConfig(), direct = connectionConfig(true);
  const a = new URL(runtime.connectionString!), b = new URL(direct.connectionString!);
  if (!a.hostname.endsWith('.neon.tech') || a.hostname.replace('-pooler.', '.') !== b.hostname || a.port !== b.port || a.pathname !== b.pathname || a.username !== b.username) throw new Error('Destinos inconsistentes.');
  let identity = '';
  for (const [label, config] of [['Aplicación', runtime], ['Directa', direct]] as const) {
    const pool = new Pool(config);
    try {
      const client = await pool.connect();
      try {
        await client.query('BEGIN READ ONLY');
        const target = await client.query('SELECT current_database() AS db, current_user AS role');
        const current = JSON.stringify(target.rows[0]);
        if (identity && current !== identity) throw new Error('Identidad de base o rol inconsistente.');
        identity = current;
        const tables = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
        const names = tables.rows.map(row => row.tablename);
        const registered = await client.query("SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS exists");
        if (!after) {
          const objects = await client.query("SELECT count(*)::int AS count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN ('pg_catalog', 'information_schema') AND n.nspname NOT LIKE 'pg_toast%' AND n.nspname NOT LIKE 'pg_temp%' AND c.relkind IN ('r','p','v','m','S','f')");
          if (objects.rows[0].count !== 0 || registered.rows[0].exists) throw new Error('La base ya contiene objetos; no se autoriza inicializar sobre ellos.');
          console.log(`${label}: base vacía confirmada, sin registro previo.`);
        } else {
          if (JSON.stringify(names) !== JSON.stringify(expected) || !registered.rows[0].exists) throw new Error('Tablas o registro incompletos.');
          const records = await client.query('SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id');
          if (records.rows.length !== 1 || records.rows[0].hash !== createHash('sha256').update(sql).digest('hex') || Number(records.rows[0].created_at) !== entry.when) throw new Error('El registro no coincide con la migración aplicada.');
          for (const table of expected) {
            const result = await client.query(`SELECT count(*)::int AS count FROM public."${table}"`);
            if (result.rows[0].count !== 0) throw new Error('Se encontraron datos inesperados.');
          }
          const constraints = await client.query("SELECT contype, count(*)::int AS count FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public' AND contype IN ('f','c','p') GROUP BY contype");
          const counts = Object.fromEntries(constraints.rows.map(row => [row.contype, row.count]));
          if (counts.f !== 8 || counts.c !== 2 || counts.p !== 11) throw new Error('Restricciones incompletas.');
          console.log(`${label}: 11 tablas vacías, 11 claves primarias, 8 claves foráneas, 2 CHECK y registro/hash correctos.`);
        }
        await client.query('ROLLBACK');
      } finally { client.release(); }
    } finally { await pool.end(); }
  }
  console.log('SQL y esquema coinciden. Ambas URL identifican el mismo endpoint Neon, base y rol; el endpoint compartido corresponde al mismo destino de proyecto/rama.');
}
main().catch(() => { console.error('Verificación fallida: no continuar con la inicialización. Revisa configuración, objetos existentes o consistencia del esquema. No se muestran datos privados.'); process.exitCode = 1; });
