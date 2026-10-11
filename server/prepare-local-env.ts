import './env';
import { Pool } from 'pg';
import { connectionConfig } from './db/config';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';

async function main() {
  if ((process.env.BETTER_AUTH_SECRET?.length || 0) >= 32) { console.log('Secreto válido conservado.'); return; }
  const pool = new Pool(connectionConfig());
  try {
    const result = await pool.query('SELECT (SELECT count(*)::int FROM public.users) AS users, (SELECT count(*)::int FROM public.sessions) AS sessions, (SELECT count(*)::int FROM public.verifications) AS verifications');
    if (result.rows[0].users || result.rows[0].sessions || result.rows[0].verifications) throw new Error('Instalación en uso; requiere rotación coordinada.');
    const path = resolve(import.meta.dirname, '../.env');
    const current = readFileSync(path, 'utf8');
    if (!/^BETTER_AUTH_SECRET=.*$/m.test(current)) throw new Error('Archivo local sin variable de secreto.');
    writeFileSync(path, current.replace(/^BETTER_AUTH_SECRET=.*$/m, `BETTER_AUTH_SECRET=${randomBytes(32).toString('base64')}`), 'utf8');
    console.log('Secreto insuficiente sustituido por uno aleatorio de 256 bits en .env. Base sin usuarios, sesiones ni recuperaciones; no se invalidó ninguna identidad.');
  } finally { await pool.end(); }
}
main().catch(() => { console.error('No se modificó el secreto: verifica configuración o realiza una rotación coordinada.'); process.exitCode = 1; });
